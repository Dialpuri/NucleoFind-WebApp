import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc';
import crossOriginIsolation from 'vite-plugin-cross-origin-isolation';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

// https://vite.dev/config/

const wasmContentTypePlugin = {
    name: "wasm-content-type-plugin",
    configureServer(server) {
        server.middlewares.use((req, res, next) => {
            if (req.url.endsWith(".wasm")) {
                res.setHeader("Content-Type", "application/wasm");
            }
            next();
        });
    },
};
export default defineConfig({
  plugins: [
      react(),
      wasmContentTypePlugin,
  ],
    assetsInclude: ["**/*.onnx"]
})
