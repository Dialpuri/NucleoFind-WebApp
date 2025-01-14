// @ts-ignore
// import * as ort from "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/esm/ort.min.js";
// ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";

import * as ort from "onnxruntime-web";
ort.env.wasm.wasmPaths = "/";
ort.env.wasm.numThreads = 8;


// const loadModelFromOPFS = async (modelName: string, modelUrl: string) => {
//   try {
//     const root = await navigator.storage.getDirectory();
//     console.log("Getting", modelName, "from OPFS.")
//     return root.getFileHandle(modelName).then(async (fileHandle) => {
//       console.log("Found", modelName, "in OPFS.")
//       const file = await fileHandle.getFile();
//       return await file.arrayBuffer();
//     }).catch(async () => {
//       const response = await fetch(modelUrl);
//       if (!response.ok) {
//         console.error("Failed to fetch model from remote URL.");
//       }
//       const modelBlob = await response.blob();
//
//       const newFileHandle = await root.getFileHandle(modelName, {create: true});
//       const writable = await newFileHandle.createWritable();
//       await writable.write(modelBlob);
//       await writable.close();
//
//       return modelBlob.arrayBuffer();
//     });
//
//   } catch (error: unknown) {
//     console.error("Error loading model from OPFS.", error);
//   }
// }

const loadModel = async (modelName: string, modelUrl: string) => {
    return new Promise((resolve, reject) => {
      // loadModelFromOPFS(modelName, modelUrl).then(modelBlob => {
      //   if (!modelBlob) {console.error("Failed to load model blob from OPFS and/or remote."); reject("Model blob not found.");}
      //   else {console.log("Loaded model blob from OPFS and/or remote.", modelBlob.byteLength, "bytes.")}
      //   return modelBlob
      // }).then((modelBlob) => {
      //   const extraSessionOptions = {
      //     logVerbosityLevel: 4,
      //     logSeverityLevel: 4,
      //     extra: {
      //       use_ort_model_bytes_directly: 0
      //     }
      //   }
        // @ts-ignore
        ort.InferenceSession.create(modelBlob, extraSessionOptions).then(session => {
          console.log("ONNX model loaded successfully.");
          resolve(session);
        }).catch(err => {
          console.error("Error loading ONNX model:", err);
          reject(err)
        })
      });

    // })
}


let model: ort.InferenceSession | null = null;

onmessage = async (event: MessageEvent) => {
  const { action, data } = event.data;

  if (action == "init") {
    console.log("Initializing ONNX model...")
    // @ts-expect-error
    model = await loadModel(data.modelName, data.modelPath);
    postMessage({ action: "ready" });
    return;
  }

  if (action == "infer" && model !== null) {
    let tensor = new ort.Tensor("float32", data.array, [32, 32, 32]);
    tensor = tensor.reshape([1, 32, 32, 32, 1]);
    const input = { x: tensor };
    const output_name = "conv3d_22";
    const output = await model.run(input);
    let output_data = output[output_name];
    output_data = output_data.reshape([32, 32, 32, 4]);
    postMessage({
      action: "result",
      data: { slice: data.slice, result: output_data.data },
    });
  }
};
