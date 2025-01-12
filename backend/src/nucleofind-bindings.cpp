//
// Created by Jordan Dialpuri on 10/01/2025.
//

#include "nucleofind-backend.h"
#include <emscripten/bind.h>
#include <vector>


using namespace emscripten;
EMSCRIPTEN_BINDINGS(nucleofind_module)
{
    register_vector<float>("vector<float>");

    class_<NucleoFind>("NucleoFind")
        .constructor<>()
        .function("get_no_slices", &NucleoFind::get_no_slices)
        .function("get_slice", &NucleoFind::get_slice)
        .function("set_slice_data", &NucleoFind::set_slice_data, allow_raw_pointers())
        .function("save_maps", &NucleoFind::save_maps);
}

