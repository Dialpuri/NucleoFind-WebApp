// @ts-ignore
import nucleofind_module from "../wasm/nucleofind.js";
import "./App.css";
import { useEffect, useRef, useState } from "react";
import UploadBox from "./components/UploadBox.tsx";
import MoorhenBox from "./components/MoorhenBox.tsx";
import { WorkerStatus } from "./interface/enum.ts";
import { NucleoFindType, NucleoFindModuleType } from "./interface/types.ts";

import Worker from "./workers/inferenceWorker?worker";

function App() {
  const [fileContent, setFileContent] = useState<null | Uint8Array>(null);
  const [predictedMapsSaved, setPredictedMapsSaved] = useState<boolean>(false);
  const [phosphateMap, setPhosphateMap] = useState<null | Uint8Array>(null);
  const [sugarMap, setSugarMap] = useState<null | Uint8Array>(null);
  const [baseMap, setBaseMap] = useState<null | Uint8Array>(null);
  const [progress, setProgress] = useState<number>(0);
  const [modelLoaded, setModelLoaded] = useState<boolean>(false);

  const workerRef = useRef<null | Worker>(null);
  const nucleofindRef = useRef<null | NucleoFindType>(null);
  const moduleRef = useRef<null | NucleoFindModuleType>(null);

  const checkCompletion = (sliceStatus: WorkerStatus[]) => {
    let finishedCount = 0;
    for (let i = 0; i < sliceStatus.length; i++) {
      if (sliceStatus[i] === WorkerStatus.FINISHED) {
        finishedCount += 1;
      }
    }
    setProgress(finishedCount / sliceStatus.length);
    return finishedCount === sliceStatus.length;
  };

  const main = async () => {
    moduleRef.current = await nucleofind_module();
    if (fileContent === null) {
      return;
    }
    if (moduleRef.current === null) {
      return;
    }

    const mtzPath = "/hklout.mtz";
    moduleRef.current.FS.writeFile(mtzPath, fileContent);
    nucleofindRef.current = new moduleRef.current.NucleoFind();

    if (nucleofindRef.current === null) {
      console.error("Failed to create NucleoFind object.");
      return;
    }
    if (workerRef.current === null) {
      console.error("Failed to find workerRef.");
      return;
    }

    const no_slices = nucleofindRef.current.get_no_slices();
    const sliceStatus = new Array(no_slices).fill(WorkerStatus.NOTSTARTED);

    for (let i = 0; i < no_slices; i++) {
      const slice = nucleofindRef.current.get_slice(i);
      const data = new Array(32 * 32 * 32);
      for (let i = 0; i < slice.size(); i++) {
        data[i] = slice.get(i);
      }
      workerRef.current.postMessage({
        action: "infer",
        data: { array: data, slice: i },
      });

      sliceStatus[i] = WorkerStatus.RUNNING;
    }

    workerRef.current.onmessage = (event) => {
      const { action, data } = event.data;
      if (moduleRef.current === null) {
        console.error("Failed to find NucleoFind Module in worker result.");
        return;
      }

      if (nucleofindRef.current === null) {
        console.error("Failed to find NucleoFind Instance in worker result.");
        return;
      }

      if (action == "result") {
        const size = data.result.length * data.result.BYTES_PER_ELEMENT; // Calculate byte size
        const ptr = moduleRef.current._malloc(size); // Allocate memory
        const heap_array = new Float32Array(
          moduleRef.current.HEAPF32.buffer,
          ptr,
          data.result.length,
        );
        heap_array.set(data.result);
        nucleofindRef.current.set_slice_data_by_ptr(data.slice, ptr, size);
        moduleRef.current._free(ptr);
        sliceStatus[data.slice] = WorkerStatus.FINISHED;
      }

      if (checkCompletion(sliceStatus)) {
        nucleofindRef.current.save_maps();
        setPhosphateMap(
          new Uint8Array(moduleRef.current.FS.readFile("/phosphate.map")),
        );
        setSugarMap(
          new Uint8Array(moduleRef.current.FS.readFile("/sugar.map")),
        );
        setBaseMap(new Uint8Array(moduleRef.current.FS.readFile("/base.map")));
        // nucleofindRef.current.delete();
        setPredictedMapsSaved(true);
      }
    };
  };

  const preloadWorker = async () => {
    workerRef.current = new Worker();

    const initialiseWorker = () => {
      return new Promise((resolve, reject) => {
        if (workerRef.current === null) {
          console.error("Failed to create worker.");
          return;
        }

        workerRef.current.postMessage({
          action: "init",
          data: { modelPath: "/nucleofind-nano-float32.onnx" },
        });

        workerRef.current.onmessage = (event) => {
          if (event.data.action == "ready") {
            console.log("Worker ready.");
            resolve(null);
          }
        };

        workerRef.current.onerror = (error) => {
          reject(error);
        };
      });
    };

    await initialiseWorker();
  };

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("./serviceWorker.js")
          .then((registration) => {
            console.log(
              "Service Worker registered with scope:",
              registration.scope,
            );
          })
          .catch((error) => {
            console.error("Service Worker registration failed:", error);
          });
      });
    }

    preloadWorker().then(() => {
      setModelLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (fileContent === null) return;

    main().then(() => {});
  }, [modelLoaded, fileContent]);

  const handleFileChange = async (event: Event) => {
    // @ts-expect-error - target has no clear type
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        // @ts-expect-error
        const fileContents = new Uint8Array(event.target.result);
        setFileContent(fileContents);
      };
      reader.onerror = () => {
        console.error("Failed to read file.");
      };
      reader.readAsArrayBuffer(file); // Read file as text
    } catch (err) {
      console.error("Error loading file:", err);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-r from-blue-100 to-indigo-100 items-center justify-center space-y-12 pt-10">
      <UploadBox onSubmit={handleFileChange} allowSubmission={modelLoaded} />
      {progress > 0 ? (
        <progress
          value={progress}
          className="styled-progress shadow-lg rounded-lg"
        />
      ) : (
        <></>
      )}
      <div className="flex mx-auto mt-10 shadow-lg rounded-lg ">
        <MoorhenBox
          fileContent={fileContent}
          predictedMapsSaved={predictedMapsSaved}
          phosphateMap={phosphateMap}
          sugarMap={sugarMap}
          baseMap={baseMap}
        />
      </div>
      <footer>Copyright © Jordan Dialpuri | University of York 2025</footer>
    </div>
  );
}

export default App;
