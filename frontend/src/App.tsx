// @ts-ignore
import nucleofind_module from "../wasm/nucleofind.js";
import "./App.css";
import { useEffect, useRef, useState } from "react";
import FileTransfer from "./components/FileUpload.tsx";
import MoorhenBox from "./components/MoorhenBox.tsx";
import { WorkerStatus } from "./interface/enum.ts";
import { NucleoFindType, NucleoFindModuleType } from "./interface/types.ts";

import Worker from "./workers/inferenceWorker?worker";

function saveMap(fileData: Uint8Array, outputName: string) {
  const blob = new Blob([fileData], { type: "application/octet-stream" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = outputName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}


function App() {
  const [fileContent, setFileContent] = useState<null | Uint8Array>(null);
  const [predictedMapsSaved, setPredictedMapsSaved] = useState<boolean>(false);
  const [phosphateMap, setPhosphateMap] = useState<null | Uint8Array>(null);
  const [sugarMap, setSugarMap] = useState<null | Uint8Array>(null);
  const [baseMap, setBaseMap] = useState<null | Uint8Array>(null);
  const [progress, setProgress] = useState<number>(0);
  const [modelLoaded, setModelLoaded] = useState<boolean>(false);
  const [moorhenReady, setMoorhenReady] = useState<boolean>(false);

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
    setProgress((100 * finishedCount) / sliceStatus.length);
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
          data: {
            modelPath: "https://huggingface.co/dialpuri/NucleoFind-nano/resolve/main/nucleofind-nano-float32.ort",
            modelName: "nucleofind-nano-float32.ort"
          },
        });

        workerRef.current.onmessage = (event) => {
          if (event.data.action == "ready") {
            console.log("Worker ready.");
            resolve(null);
          }
        };

        workerRef.current.onerror = (error) => {
          console.error("Worker error:", error);
          reject(error);
        };
      });
    };

    await initialiseWorker();
  };

  useEffect(() => {
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

  const downloadCallback = () => {
    if (moduleRef.current === null) {
      console.error("Failed to find NucleoFind Module in worker result.");
      return;
    }
    if (phosphateMap === null) {
      console.error("Failed to find phosphate map.");
      return;
    }
    if (sugarMap === null) {
      console.error("Failed to find sugar map.");
      return;
    }
    if (baseMap === null) {
      console.error("Failed to find base map.");
      return;
    }

    saveMap(phosphateMap, "nucleofind-phosphate.map");
    saveMap(sugarMap, "nucleofind-sugar.map");
    saveMap(baseMap, "nucleofind-base.map");
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gradient-to-br from-nfTertiary to-nfSecondaryAlt items-center justify-center pt-10">
      <div
        className={`transition-all duration-700 ease-in-out text-center  ${
          predictedMapsSaved ? "translate-y-0 " : "translate-y-full mb-3"
        }`}
      >
        <FileTransfer
          onSubmit={handleFileChange}
          allowSubmission={modelLoaded && moorhenReady}
          progress={progress}
          predictedMapsSaved={predictedMapsSaved}
          downloadCallback={downloadCallback}
        />
      </div>
      <div
        className={`transition-opacity duration-700 ${!predictedMapsSaved ? "z-0 invisible opacity-0" : "visible opacity-100 mt-3 flex-grow"}`}
      >
        <MoorhenBox
          fileContent={fileContent}
          predictedMapsSaved={predictedMapsSaved}
          phosphateMap={phosphateMap}
          sugarMap={sugarMap}
          baseMap={baseMap}
          setMoorhenReady={setMoorhenReady}
        />
      </div>
      <footer className="pt-2 text-gray-800">
        Copyright © Jordan Dialpuri | University of York 2025
      </footer>
    </div>
  );
}

export default App;
