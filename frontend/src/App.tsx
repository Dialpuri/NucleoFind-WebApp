import nucleofind_module from "../wasm/nucleofind.js"
import './App.css'
import {useEffect, useState} from "react";
import UploadBox from "./components/UploadBox.tsx";
import MoorhenBox from "./components/MoorhenBox.tsx";

import * as ort from "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/esm/ort.min.js";
ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";
ort.env.wasm.numThreads = 1;

// import * as ort from "onnxruntime-web";
// ort.env.wasm.wasmPaths = ".";


function App() {

    const [Module, setModule] = useState<null | Object>(null);
    const [fileContent, setFileContent] = useState<null | Uint8Array>(null);
    const [predictedMapsSaved, setPredictedMapsSaved] = useState<boolean>(false);
    const [phosphateMap, setPhosphateMap] = useState<null | Uint8Array>(null);

    useEffect(() => {
        nucleofind_module().then((module: Object) => {
            setModule(module)
        });
    }, []);


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

    const [model, setModel] = useState<null | ort.InferenceSession>(null);

    useEffect(() => {
        const loadModel = async () => {
            try {
                const sessionOption = { executionProviders: ['webgl'] };
                const session = await ort.InferenceSession.create(
                    '/nucleofind-nano-float32.onnx',
                    // sessionOption
                );
                setModel(session);
                console.log('ONNX model loaded successfully.');
            } catch (err) {
                console.error('Error loading ONNX model:', err);
            }
        };

        loadModel();
    }, []);

    function save_map(name: string) {
        const fileData = Module.FS.readFile(name);
        const blob = new Blob([fileData], {type: "application/octet-stream"});
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    useEffect(() => {
        if (fileContent === null) {return;}
        if (Module === null) {return;}
        if (model === null) {return;}

        const run = async () => {
            const filePath = "/hklout.mtz"
            Module.FS.writeFile(filePath, fileContent);

            console.log("Calling NucleoFind")
            const nucleofind = new Module.NucleoFind()
            const no_slices = nucleofind.get_no_slices();

            console.log(no_slices)
            // save_map("/work.map");
            // save_map("/work-reinterpolated.map");
            // save_map("/raw.map");

            function save_array(array: Float32Array | Array, path: string) {
                const dataString = array.join('\n'); // Each number on a new line
                const blob = new Blob([dataString], {type: 'text/plain'});
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = path;
                link.click();
                URL.revokeObjectURL(link.href);
            }

            for (let i = 0; i < no_slices; i++) {

                const slice = nucleofind.get_slice(i);

                const data = new Array(32 * 32 * 32);
                for (let i = 0; i < slice.size(); i++) {
                    data[i] = slice.get(i)
                }

                let tensor = new ort.Tensor("float32", data, [32, 32, 32])
                tensor = tensor.reshape([1, 32, 32, 32, 1])
                const input = {x: tensor};
                const output_name = "conv3d_22";
                let output = await model.run(input)
                output = output[output_name]
                output = output.reshape([32, 32, 32, 4])

                nucleofind.set_slice_data(i, output.data)
                const progress = Math.round(i / no_slices * 100);
                console.log(progress, "%")

            }

            nucleofind.save_maps();

            setPhosphateMap(new Uint8Array(Module.FS.readFile("/phosphate.map")));

            // save_map("/phosphate.map");
            // save_map("/sugar.map");
            // save_map("/base.map");
            nucleofind.delete();
            setPredictedMapsSaved(true);
        }
        run();
        }, [fileContent]);


    return (
        <>
            <UploadBox onSubmit={handleFileChange}/>
            <div className="block" style={{width: "500px"}}>
                <MoorhenBox fileContent={fileContent} predictedMapsSaved={predictedMapsSaved} phosphateMap={phosphateMap}/>
            </div>
        </>

    )
}

export default App
