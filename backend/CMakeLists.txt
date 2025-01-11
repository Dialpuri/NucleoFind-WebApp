cmake_minimum_required(VERSION 3.12)
project(nucleofind-webapp VERSION 0.5 LANGUAGES C CXX)

set(WRK_DIR "${CMAKE_CURRENT_SOURCE_DIR}")
include(FetchContent)

FetchContent_Declare(
        gemmi-dependencies
        URL http://www.ysbl.york.ac.uk/jsd523/gemmi-0.6.5.tar.gz
)

FetchContent_MakeAvailable(gemmi-dependencies)
set(GEMMISOURCE ${gemmi-dependencies_SOURCE_DIR})

include_directories(
        ${CMAKE_CURRENT_SOURCE_DIR}
        ${gemmi-dependencies_SOURCE_DIR}/include
)

add_subdirectory(${WRK_DIR}/gemmi)

add_library(nucleofind_lib ${WRK_DIR}/src/nucleofind-backend.cpp)
add_executable(nucleofind_exec ${WRK_DIR}/src/nucleofind-bindings.cpp)

target_link_options(nucleofind_exec PRIVATE -sEXIT_RUNTIME=1 -sASSERTIONS=2 -fexceptions -sALLOW_MEMORY_GROWTH=1 --bind
        -sFORCE_FILESYSTEM=1 -sMODULARIZE=1 -sEXPORT_NAME=nucleofind_module -sEXPORTED_RUNTIME_METHODS=['FS']
        -sMODULARIZE=1 -sEXPORT_ES6=1
)

target_link_libraries(nucleofind_lib PRIVATE
    gemmi_cpp
)

target_link_directories(nucleofind_exec
        PUBLIC
        ${CMAKE_BINARY_DIR}/gemmi
)

target_link_libraries(
        nucleofind_exec
        PRIVATE
        nucleofind_lib
)

set(nucleofind_HEADERS
        ${WRK_DIR}/src/nucleofind-backend.h
)

set_target_properties(nucleofind_exec PROPERTIES PUBLIC_HEADER "${nucleofind_HEADERS}")
set_target_properties(nucleofind_exec PROPERTIES OUTPUT_NAME nucleofind)


install(TARGETS nucleofind_exec)



