// @ts-ignore
// import * as ort from "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/esm/ort.min.js";
// ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";

import * as ort from "onnxruntime-web";
ort.env.wasm.wasmPaths = "/";
ort.env.wasm.numThreads = 16;

const loadModel = async (modelPath: string) => {
  try {
    const session = await ort.InferenceSession.create(modelPath);
    console.log("ONNX model loaded successfully.");
    return session;
  } catch (err) {
    console.error("Error loading ONNX model:", err);
  }
};

let model: ort.InferenceSession | null = null;

onmessage = async (event: MessageEvent) => {
  const { action, data } = event.data;

  if (action == "init") {
    console.log("Initializing ONNX model...")
    // @ts-expect-error
    model = await loadModel(data.modelPath);
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
