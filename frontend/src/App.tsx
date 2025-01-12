import nucleofind_module from "../wasm/nucleofind.js"
import './App.css'
import {useEffect, useState} from "react";
import * as ort from "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/esm/ort.min.js";
ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";

function App() {

    const [Module, setModule] = useState<null | Object>(null);
    const [fileContent, setFileContent] = useState<null | Uint8Array>(null);

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
    const [error, setError] = useState('');
    const [progress, setProgress] = useState<number>(0);
    const [message, setMessage] = useState("");

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
                setError('Failed to load ONNX model.');
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
            save_map("/work.map");
            save_map("/work-reinterpolated.map");
            save_map("/raw.map");

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
                save_array(data, "input_data.txt");

                let tensor = new ort.Tensor("float32", data, [32, 32, 32])
                tensor = tensor.reshape([1, 32, 32, 32, 1])
                const input = {x: tensor};
                const output_name = "conv3d_22";
                let output = await model.run(input)
                output = output[output_name]
                output = output.reshape([32, 32, 32, 4])
                save_array(output.data, "output_data.txt");

                return

                nucleofind.set_slice_data(i, output.data)
                const progress = Math.round(i / no_slices * 100);
                console.log(progress, "%")

            }

            nucleofind.save_maps();
            save_map("/phosphate.map");
            save_map("/sugar.map");
            save_map("/base.map");

            nucleofind.delete();
        }
        run();
        }, [fileContent]);


    return (
        <div className="min-h-screen bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center">
            <div className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full">
                <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Upload Your File</h1>
                <form onSubmit={handleFileChange} className="space-y-4">
                    <div>
                        <label
                            htmlFor="fileInput"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Choose a file
                        </label>
                        <input
                            type="file"
                            id="fileInput"
                            onChange={handleFileChange}
                            className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        Upload File
                    </button>
                </form>
                {/*{message && (*/}
                {/*    <p className="mt-4 text-center text-sm text-gray-700">{message}</p>*/}
                {/*)}*/}
            </div>
        </div>
    )
}

export default App
