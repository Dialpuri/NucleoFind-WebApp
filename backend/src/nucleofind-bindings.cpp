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
        .property("no_slices", &NucleoFind::get_no_slices)
        .function("get_slice", &NucleoFind::get_slice);

}

