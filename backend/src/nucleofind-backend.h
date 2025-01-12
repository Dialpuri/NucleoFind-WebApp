//
// Created by Jordan Dialpuri on 10/01/2025.
//

#ifndef NUCLEOFIND_BACKEND_H
#define NUCLEOFIND_BACKEND_H

#include <iostream>
#include <string>
#include <gemmi/mtz.hpp>
#include <gemmi/grid.hpp>
#include <gemmi/ccp4.hpp>
#include <gemmi/mtz.hpp>
#include <gemmi/fourier.hpp>
#include <gemmi/asumask.hpp>
#include <emscripten/bind.h>
#include <emscripten/val.h>

class NucleoFind {
public:

    NucleoFind();

    int get_no_slices() const {return slices.size();};

    std::vector<float> get_slice(int slice_id) const;

    void set_slice_data(int slice_id, const emscripten::val &floatArrayObject);

    void save_maps();

private:
    void load_work_map();

    void calculate_interpolated_size();

    void interpolate_grid();

    gemmi::Grid<> reinterpolate_grid(const gemmi::Grid<>& grid);

    void calculate_slices();

    void setup_output_grids();

    void setup_output_grid(gemmi::Grid<>* grid) const;

private:
    const std::string mtz_path = "/hklout.mtz";
    const float spacing = 0.7;
    const float box_size = 32;
    const int overlap = 16;
    const bool compute_entire_cell = true;

    gemmi::Mtz mtz;
    gemmi::Grid<> raw_grid;
    gemmi::Grid<> work_grid;
    gemmi::Grid<> null_grid;
    gemmi::Grid<> phosphate_grid;
    gemmi::Grid<> sugar_grid;
    gemmi::Grid<> base_grid;
    gemmi::Grid<> count_grid;
    gemmi::Box<gemmi::Position> box;
    int numx, numy, numz;
    std::vector<std::vector<int>> slices;

};

#endif //NUCLEOFIND_BACKEND_H
