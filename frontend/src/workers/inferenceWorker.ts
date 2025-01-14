import * as ort from "onnxruntime-web";

ort.env.wasm.wasmPaths = "/";
ort.env.wasm.numThreads = 1;

const loadModelFromOPFS = async (modelName: string, modelUrl: string) => {
  try {
    const root = await navigator.storage.getDirectory();
    return root
      .getFileHandle(modelName)
      .then(async (fileHandle) => {
        const file = await fileHandle.getFile();
        return await file.arrayBuffer();
      })
      .catch(async () => {
        const response = await fetch(modelUrl);
        if (!response.ok) {
          console.error("Failed to fetch model from remote URL.");
          return;
        }
        const modelBlob = await response.blob();

        const newFileHandle = await root.getFileHandle(modelName, {
          create: true,
        });
        const writable = await newFileHandle.createWritable();
        await writable.write(modelBlob);
        await writable.close();

        return modelBlob.arrayBuffer();
      });
  } catch (error: unknown) {
    console.error("Error loading model from OPFS.", error);
  }
};

const loadModel = async (modelName: string, modelUrl: string) => {
  try {
    const modelBlob = await loadModelFromOPFS(modelName, modelUrl);
    if (!modelBlob) {
      console.error("Failed to load the model from OPFS.");
      return;
    }
    return await ort.InferenceSession.create(modelBlob);
  } catch (error: any) {
    console.error("Failed to load the model from OPFS.", error);
  }
};

let model: ort.InferenceSession | null = null;

onmessage = async (event: MessageEvent) => {
  const { action, data } = event.data;

  if (action == "init") {
    console.log("Initializing ONNX model...");
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
