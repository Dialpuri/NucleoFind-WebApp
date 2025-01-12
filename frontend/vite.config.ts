import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc';
import crossOriginIsolation from 'vite-plugin-cross-origin-isolation';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { viteStaticCopy } from 'vite-plugin-static-copy';

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
      {
          name: "configure-response-headers",
          configureServer: (server) => {
              server.middlewares.use((_req, res, next) => {
                  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
                  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
                  next();
              });
          },
      },
      // crossOriginIsolation(),
  ],
    // server: {
    //     headers: {
    //         "Cross-Origin-Opener-Policy": "same-origin",
    //         "Cross-Origin-Embedder-Policy": "require-corp",
    //     },
    // },
    assetsInclude: ["**/*.onnx"],
})
