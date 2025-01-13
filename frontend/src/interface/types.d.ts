export interface NucleoFindModuleType {
    NucleoFind: {
        new(): NucleoFindType;
    }
    FS: EmscriptenFileSystem
    _malloc: (number) => number;
    _free: (number) => void;
    HEAPF32: EmscriptenHeap32
}

export interface NucleoFindType {
    get_no_slices: () => number;
    get_slice: (number) => EmscriptenVector;
    set_slice_data_by_ptr: (number, number, number) => void;
    save_maps: () => void;
    delete: () => void;
}

export interface EmscriptenFileSystem {
    writeFile: (string, Uint8Array) => void;
    readFile: (string) => Uint8Array;
}

export interface EmscriptenVector {
    size: () => number;
    get: (number) => number;
}

export interface EmscriptenHeap32 {
    buffer: ArrayBuffer;
}