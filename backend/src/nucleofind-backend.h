//
// Created by Jordan Dialpuri on 10/01/2025.
//

#ifndef NUCLEOFIND_BACKEND_H
#define NUCLEOFIND_BACKEND_H

#include <iostream>
#include <string>
#include <gemmi/mtz.hpp>
#include <gemmi/grid.hpp>
#include <gemmi/mtz.hpp>
#include <gemmi/fourier.hpp>

class NucleoFind {
public:

    NucleoFind();

    int get_no_slices() const {return slices.size();};

    std::vector<float> get_slice(int slice_id) const;

private:
    void load_work_map();

    void calculate_interpolated_size();

    void interpolate_grid();

    void calculate_slices();

private:
    const std::string mtz_path = "/hklout.mtz";
    const float spacing = 0.7;
    const float box_size = 32;
    const int overlap = 16;

    gemmi::Mtz mtz;
    gemmi::Grid<> raw_grid;
    gemmi::Grid<> work_grid;
    gemmi::Box<gemmi::Position> box;
    int numx, numy, numz;
    std::vector<std::vector<int>> slices;

};

#endif //NUCLEOFIND_BACKEND_H
