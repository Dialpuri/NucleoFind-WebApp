export interface NucleoFindModuleType {
  NucleoFind: {
    new (): NucleoFindType;
  };
  FS: EmscriptenFileSystem;
  _malloc: (arg0: number) => number;
  _free: (arg0: number) => void;
  HEAPF32: EmscriptenHeap32;
}

export interface NucleoFindType {
  get_no_slices: () => number;
  get_slice: (arg0: number) => EmscriptenVector;
  set_slice_data_by_ptr: (arg0: number, arg1: number, arg2: number) => void;
  save_maps: () => void;
  delete: () => void;
}

export interface EmscriptenFileSystem {
  writeFile: (arg0: string, arg1: Uint8Array) => void;
  readFile: (arg0: string) => Uint8Array;
}

export interface EmscriptenVector {
  size: () => number;
  get: (arg0: number) => number;
}

export interface EmscriptenHeap32 {
  buffer: ArrayBuffer;
}
