import nucleofind_module from "../wasm/nucleofind.js"
import './App.css'
import {useEffect, useState} from "react";
import nucleofind from "../wasm/nucleofind.js";

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

    useEffect(() => {
        if (fileContent === null) {return;}
        if (Module === null) {return;}

        const filePath = "/hklout.mtz"
        Module.FS.writeFile(filePath, fileContent);

        console.log("Calling NucleoFind")
        const nucleofind = new Module.NucleoFind()
        const no_slices = nucleofind.no_slices;
        const data = nucleofind.get_slice(1);
        console.log(data)


        nucleofind.delete();
        }, [fileContent]);


    return (
        <div>
            <h1>File Loader</h1>
            <input type="file" accept=".mtz" onChange={handleFileChange}/>

        </div>
    )
}

export default App
