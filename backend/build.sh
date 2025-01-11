emcmake cmake . -Bbuild
(
  cd build || exit
  emmake make -j
  cp nucleofind.wasm ../../frontend/wasm
  cp nucleofind.js ../../frontend/wasm
)