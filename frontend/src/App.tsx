import nucleofind_module from "../wasm/nucleofind.js"
import './App.css'
import {useEffect, useRef, useState} from "react";
import UploadBox from "./components/UploadBox.tsx";
import MoorhenBox from "./components/MoorhenBox.tsx";
import {WorkerStatus} from "./interface/enum.d.ts"
import {NucleoFindType, NucleoFindModuleType} from "./interface/types.d.ts"

// import * as ort from "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/esm/ort.min.js";
// ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";
// ort.env.wasm.numThreads = 1;

// import * as ort from "onnxruntime-web";
// ort.env.wasm.wasmPaths = ".";

import Worker from "./workers/inferenceWorker?worker"

function App() {

    const [sliceStatus, setSliceStatus] = useState<WorkerStatus[]>([]);
    const [fileContent, setFileContent] = useState<null | Uint8Array>(null);
    const [predictedMapsSaved, setPredictedMapsSaved] = useState<boolean>(false);
    const [phosphateMap, setPhosphateMap] = useState<null | Uint8Array>(null);
    const [sugarMap, setSugarMap] = useState<null | Uint8Array>(null);
    const [baseMap, setBaseMap] = useState<null | Uint8Array>(null);
    const [progress, setProgress] = useState<number>(0);

    const workerRef = useRef<null | Worker>(null);
    const nucleofindRef = useRef<null | NucleoFindType>(null);
    const moduleRef = useRef<null | NucleoFindModuleType>(null);

    const checkCompletion = (sliceStatus: WorkerStatus[]) => {
        let finishedCount = 0;
        for (let i = 0; i < sliceStatus.length; i++) {
            if (sliceStatus[i] === WorkerStatus.FINISHED) {
                finishedCount += 1
            }
        }
        setProgress(finishedCount / sliceStatus.length);
        return finishedCount === sliceStatus.length;
    }

    const main = async () =>  {
        moduleRef.current = await nucleofind_module()
        if (fileContent === null) {return;}
        if (moduleRef.current === null) {return;}

        const mtzPath = "/hklout.mtz"
        moduleRef.current.FS.writeFile(mtzPath, fileContent);
        nucleofindRef.current = new moduleRef.current.NucleoFind();

        workerRef.current = new Worker();

        const initialiseWorker = () => {
            return new Promise((resolve, reject) => {
                if (workerRef.current === null) {
                    console.error("Failed to create worker.");
                    return;
                }

                workerRef.current.postMessage(
                    {
                        action: "init",
                        data: {modelPath: "/nucleofind-nano-float32.onnx"}
                    }
                );

                workerRef.current.onmessage = (event) => {
                    if (event.data.action == "ready") {
                        console.log("Worker ready.");
                        resolve(null);
                    }
                }

                workerRef.current.onerror = (error) => {
                    reject(error);
                };
            })
        }

        await initialiseWorker();

        if (nucleofindRef.current === null) {
            console.error("Failed to create NucleoFind object.");
            return;
        }

        const no_slices = nucleofindRef.current.get_no_slices();
        // const no_slices = 2;
        const sliceStatus = new Array(no_slices).fill(WorkerStatus.NOTSTARTED);

        for (let i = 0; i < no_slices; i++) {
            const slice = nucleofindRef.current.get_slice(i)
            const data = new Array(32 * 32 * 32);
            for (let i = 0; i < slice.size(); i++) {
                data[i] = slice.get(i)
            }
            workerRef.current.postMessage({
                    action: "infer",
                    data: {array: data, slice: i}
                })

            sliceStatus[i] = WorkerStatus.RUNNING
        }

        workerRef.current.onmessage = (event) => {
            const {action, data} = event.data;
            if (moduleRef.current === null) {
                console.error("Failed to find NucleoFind Module in worker result.");
                return;
            }

            if (nucleofindRef.current === null) {
                console.error("Failed to find NucleoFind Instance in worker result.");
                return;
            }

            if (action == "result") {
                console.log("Result returned for slice ", data.slice)
                const size = data.result.length * data.result.BYTES_PER_ELEMENT; // Calculate byte size
                const ptr = moduleRef.current._malloc(size); // Allocate memory
                const heap_array = new Float32Array(moduleRef.current.HEAPF32.buffer, ptr, data.result.length);
                heap_array.set(data.result);
                nucleofindRef.current.set_slice_data_by_ptr(data.slice, ptr, size)
                moduleRef.current._free(ptr);
                sliceStatus[data.slice] = WorkerStatus.FINISHED;
            }

            if (checkCompletion(sliceStatus) === true) {
                nucleofindRef.current.save_maps();
                setPhosphateMap(new Uint8Array(moduleRef.current.FS.readFile("/phosphate.map")));
                setSugarMap(new Uint8Array(moduleRef.current.FS.readFile("/sugar.map")));
                setBaseMap(new Uint8Array(moduleRef.current.FS.readFile("/base.map")));
                // nucleofindRef.current.delete();
                setPredictedMapsSaved(true);
            }

        }

    }

    useEffect(() => {
        main().then(() => {
            console.log("Main function finished.")
        })
    }, [fileContent]);

    // useEffect(() => {
    //     for (let i = 0; i < sliceStatus.length; i++) {
    //         if (sliceStatus[i] != WorkerStatus.FINISHED) {
    //             return
    //         }
    //     }
    //
    //     if (nucleofindRef.current === null) {
    //         console.error("Failed to find NucleoFind Instance in slice useEffect.");
    //         return;
    //     }
    //
    //     if (moduleRef.current === null) {
    //         console.error("Failed to find NucleoFind Module in slice useEffect.");
    //         return;
    //     }
    //
    //     console.log(sliceStatus)
    //
    //     console.log("All slices have finished")
    //     nucleofindRef.current.save_maps();
    //     setPhosphateMap(new Uint8Array(moduleRef.current.FS.readFile("/phosphate.map")));
    //     setSugarMap(new Uint8Array(moduleRef.current.FS.readFile("/sugar.map")));
    //     setBaseMap(new Uint8Array(moduleRef.current.FS.readFile("/base.map")));
    //     // nucleofindRef.current.delete();
    //     setPredictedMapsSaved(true);
    //
    // }, [sliceStatus]);


    const handleFileChange = async (event: any) => {
        const file = event.target.files[0];
        if (!file) {return}
        try {
            const reader = new FileReader();
            reader.onload = (event) => {
                // @ts-ignore
                const fileContents = new Uint8Array(event.target.result);
                setFileContent(fileContents);
            };
            reader.onerror = () => {
                console.error('Failed to read file.');
            };
            reader.readAsArrayBuffer(file); // Read file as text
        } catch (err) {
            console.error('Error loading file:', err);
        }
    };

    // const [model, setModel] = useState<null | ort.InferenceSession>(null);

    // useEffect(() => {
    //     const loadModel = async () => {
    //         try {
    //             const sessionOption = { executionProviders: ['webgl'] };
    //             const session = await ort.InferenceSession.create(
    //                 '/nucleofind-nano-float32.onnx',
    //                 // sessionOption
    //             );
    //             setModel(session);
    //             console.log('ONNX model loaded successfully.');
    //         } catch (err) {
    //             console.error('Error loading ONNX model:', err);
    //         }
    //     };
    //
    //     loadModel();
    // }, []);


    // useEffect(() => {
    //     if (fileContent === null) {return;}
    //     if (moduleRef.current === null) {return;}
    //     if (model === null) {return;}
    //
    //     const mtzPath = "/hklout.mtz"
    //     moduleRef.current.FS.writeFile(mtzPath, fileContent);
    //     nucleofindRef.current = new moduleRef.current.NucleoFind();


        // const run = async () => {
        //     const filePath = "/hklout.mtz"
        //     moduleRef.current.FS.writeFile(filePath, fileContent);
        //
        //     const nucleofind = new moduleRef.current.NucleoFind()
        //     const no_slices = nucleofind.get_no_slices();
        //
        //
        //
        //
        //
        //
        //     //
        //     // async function predict(i: number) {
        //     //     const slice = nucleofind.get_slice(i);
        //     //
        //     //     const data = new Array(32 * 32 * 32);
        //     //     for (let i = 0; i < slice.size(); i++) {
        //     //         data[i] = slice.get(i)
        //     //     }
        //     //
        //     //     // let tensor = new ort.Tensor("float32", data, [32, 32, 32])
        //     //     // tensor = tensor.reshape([1, 32, 32, 32, 1])
        //     //     // const input = {x: tensor};
        //     //     // const output_name = "conv3d_22";
        //     //     // let output = await model.run(input)
        //     //     // output = output[output_name]
        //     //     // output = output.reshape([32, 32, 32, 4])
        //     //
        //     //     const size = output.data.length * output.data.BYTES_PER_ELEMENT; // Calculate byte size
        //     //     const ptr = moduleRef.current._malloc(size); // Allocate memory
        //     //     const heap_array = new Float32Array(moduleRef.current.HEAPF32.buffer, ptr, output.data.length);
        //     //     heap_array.set(output.data);
        //     //     nucleofind.set_slice_data_by_ptr(i, ptr, size)
        //     //     moduleRef.current._free(ptr);
        //     //
        //     //     const progress = Math.round(i / no_slices * 100);
        //     //     return progress;
        //     // }
        //
        //     // await predict(0);
        //     for (let i = 0; i < no_slices; i++) {
        //         const progress = await predict(i);
        //         setProgress(progress);
        //         console.log(progress, "%")
        //         // break;
        //     }
        //
        //     nucleofind.save_maps();
        //
        //     setPhosphateMap(new Uint8Array(moduleRef.current.FS.readFile("/phosphate.map")));
        //     setSugarMap(new Uint8Array(moduleRef.current.FS.readFile("/sugar.map")));
        //     setBaseMap(new Uint8Array(moduleRef.current.FS.readFile("/base.map")));
        //     // save_map("/phosphate.map");
        //     // save_map("/sugar.map");
        //     // save_map("/base.map");
        //     nucleofind.delete();
        //     setPredictedMapsSaved(true);
        // }
        // // run();
        // }, [fileContent]);


    return (
        <div
            className="flex flex-col min-h-screen bg-gradient-to-r from-blue-100 to-indigo-100 items-center justify-center space-y-12 pt-10">
            <UploadBox onSubmit={handleFileChange}/>
            {progress > 0 ? <progress value={progress} className="styled-progress"/>: <></>}
            <div className="flex mx-auto mt-10 shadow-lg rounded-lg ">
                <MoorhenBox fileContent={fileContent} predictedMapsSaved={predictedMapsSaved}
                            phosphateMap={phosphateMap} sugarMap={sugarMap} baseMap={baseMap}/>
            </div>
        </div>

    )
}

export default App
