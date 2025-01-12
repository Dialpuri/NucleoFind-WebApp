#include "nucleofind-backend.h"


NucleoFind::NucleoFind() {
    load_work_map();
    calculate_interpolated_size();
    interpolate_grid();
    auto a = reinterpolate_grid(work_grid);
    gemmi::Ccp4<> work_map;
    work_map.grid = a;
    work_map.update_ccp4_header();
    work_map.write_ccp4_map("/work-reinterpolated.map");

    calculate_slices();
    setup_output_grids();
}


void NucleoFind::load_work_map() {
    mtz = gemmi::read_mtz_file(mtz_path);
    constexpr std::array<int, 3> null_size = {0, 0, 0};
    constexpr auto order = gemmi::AxisOrder::XYZ;
    std::string f_col = "FWT";
    std::string phi_col = "PHWT";

    const double sample_rate = mtz.resolution_high() / spacing;
    const gemmi::Mtz::Column &f = mtz.get_column_with_label(f_col);
    const gemmi::Mtz::Column &phi = mtz.get_column_with_label(phi_col);
    const gemmi::FPhiProxy fphi(gemmi::MtzDataProxy{mtz}, f.idx, phi.idx);
    raw_grid = gemmi::transform_f_phi_to_map2<float>(fphi, null_size, sample_rate, null_size, order);
    raw_grid.normalize();

    gemmi::Ccp4<> work_map;
    work_map.grid = raw_grid;
    work_map.update_ccp4_header();
    work_map.write_ccp4_map("/raw.map");
}


void NucleoFind::calculate_interpolated_size() {
    gemmi::Box<gemmi::Fractional> extent;
    if (compute_entire_cell) {
        extent.extend(gemmi::Fractional(0, 0, 0));
        extent.extend(gemmi::Fractional(1, 1, 1));
    } else {
        extent = find_asu_brick(raw_grid.spacegroup).get_extent();
    }
    box = mtz.cell.orthogonalize_box(extent);
    float margin = spacing * floor(box_size / 2);
    box.add_margin(margin);
    gemmi::Position size = box.get_size();

    numx = static_cast<int>(-floor(-round(size.x / spacing) / overlap) * overlap);
    numy = static_cast<int>(-floor(-round(size.y / spacing) / overlap) * overlap);
    numz = static_cast<int>(-floor(-round(size.z / spacing) / overlap) * overlap);

    std::cout << "Box Min = " << box.minimum.x << " " << box.minimum.y << " " << box.minimum.z << std::endl;
}

void NucleoFind::interpolate_grid() {
    work_grid.nu = numx;
    work_grid.nv = numy;
    work_grid.nw = numz;
    work_grid.spacegroup = mtz.spacegroup;
    const gemmi::UnitCell cell = {spacing * numx, spacing * numy, spacing * numz, 90, 90, 90};
    work_grid.unit_cell = cell;
    work_grid.set_size_without_checking(numx, numy, numz);

    const gemmi::Mat33 mat = gemmi::Mat33(spacing,0,0,0,spacing,0,0,0,spacing);
    const gemmi::Vec3 vec = box.minimum;
    const gemmi::Transform transform = {mat, vec};

    for (int i = 0; i < numx; i++) {
        for (int j = 0; j < numy; j++) {
            for (int k = 0; k < numz; k++) {
                gemmi::Position pos(transform.apply(gemmi::Vec3(i, j, k)));
                gemmi::Fractional fpos = raw_grid.unit_cell.fractionalize(pos);
                const float value = raw_grid.interpolate_value(fpos);
                work_grid.set_value(i, j, k, value);
            }
        }
    }

    gemmi::Ccp4<> work_map;
    work_map.grid = work_grid;
    work_map.update_ccp4_header();
    work_map.write_ccp4_map("/work.map");
}


void NucleoFind::calculate_slices() {
    const int i_bound = numx - overlap;
    const int j_bound = numy - overlap;
    const int k_bound = numz - overlap;
    for (int i = 0; i < i_bound; i += overlap) {
        for (int j = 0; j < j_bound; j += overlap) {
            for (int k = 0; k < k_bound; k += overlap) {
                std::vector<int> slice = {i, j, k};
                slices.emplace_back(slice);
            }
        }
    }
}


gemmi::Grid<> NucleoFind::reinterpolate_grid(const gemmi::Grid<>& grid) {
    gemmi::Grid<> output_grid;
    output_grid.copy_metadata_from(raw_grid);
    output_grid.spacegroup = raw_grid.spacegroup;
    output_grid.set_unit_cell(raw_grid.unit_cell);
    output_grid.set_size_without_checking(raw_grid.nu, raw_grid.nv, raw_grid.nw);

    std::cout << "Grid input - " << grid.nu << " " << grid.nv << " " << grid.nw << std::endl;
    std::cout << "Grid output - " << output_grid.nu << " " << output_grid.nv << " " << output_grid.nw << std::endl;


    // for (int i = 0; i < output_grid.nu; i++) {
    //     for (int j = 0; j < output_grid.nv; j++) {
    //         for (int k = 0; k < output_grid.nw; k++) {
    //             gemmi::Position position = output_grid.get_position(i, j, k) - box.minimum;
    //             float interpolated_value = grid.interpolate_value(position);
    //             // std::cout << position.x << " " << position.y << " " << position.z << " " << grid.interpolate_value(position) << std::endl;
    //             output_grid.set_value(i, j, k, interpolated_value );
    //         }
    //     }
    // }
    //
    //
    // //
    if (compute_entire_cell) {
        for (const auto& point: output_grid) {
            gemmi::Position position = output_grid.point_to_position(point) - box.minimum;
            output_grid.set_value(point.u, point.v, point.w, grid.interpolate_value(position));
        }
    } else {
        gemmi::MaskedGrid<float> masked_grid = masked_asu(output_grid);
        for (const auto& point: output_grid) {
            gemmi::Position position = output_grid.point_to_position(point) - box.minimum;
            output_grid.set_value(point.u, point.v, point.w, grid.interpolate_value(position));
        }
    }

    output_grid.symmetrize_max();
    return output_grid;
}

void NucleoFind::setup_output_grids() {
    setup_output_grid(&phosphate_grid);
    setup_output_grid(&sugar_grid);
    setup_output_grid(&base_grid);
    setup_output_grid(&count_grid);
    setup_output_grid(&null_grid);
}

void NucleoFind::setup_output_grid(gemmi::Grid<> *grid) const {
    const gemmi::UnitCell cell = {spacing * numx, spacing * numy, spacing * numz, 90, 90, 90};
    // grid->copy_metadata_from(work_grid);
    grid->set_size_without_checking(numx, numy, numz);
    grid->set_unit_cell(cell);
    grid->calculate_spacing();
    grid->fill(0);
}


std::vector<float> NucleoFind::get_slice(int slice_id) const {
    if (slice_id >= slices.size() || slice_id < 0) {
        std::cout << "Slice id out of bounds" << std::endl;
        return std::vector<float>();
    }
    const std::vector<int> slice = slices[slice_id];

    std::vector<float> data(32*32*32, 0);
    for (int i = 0; i < 32; i++) {
        for (int j = 0; j < 32; j++) {
            for (int k = 0; k < 32; k++) {
                int index = i * (32 * 32) + j * (32) + k;
                const int u = slice[0] + i;
                const int v = slice[1] + j;
                const int w = slice[2] + k;
                float value = work_grid.get_value(u, v, w);
                data[index] = value;
            }
        }
    }
    return data;


}

void NucleoFind::set_slice_data(int slice_id, const emscripten::val &floatArrayObject) {
    if (slice_id >= slices.size() || slice_id < 0) {
        std::cout << "Slice id out of bounds" << std::endl;
        return;
    }

    // Taken from https://stackoverflow.com/questions/74755250/how-pass-a-large-array-from-js-to-c-using-emscripten
    unsigned int length = floatArrayObject["length"].as<unsigned int>();
    std::vector<float> slice_data;
    slice_data.resize(length);
    auto memory = emscripten::val::module_property("HEAPU8")["buffer"];
    auto memoryView = floatArrayObject["constructor"].new_(memory, reinterpret_cast<uintptr_t>(slice_data.data()), length);
    memoryView.call<void>("set", floatArrayObject);

    const std::vector<int> slice = slices[slice_id];
    for (int i = 0; i < 32; i++) {
        for (int j = 0; j < 32; j++) {
            for (int k = 0; k < 32; k++) {
                // int index = ((i * 32 + j) * 32 + k) * 4;
                int index = i * (32 * 32 * 4) + j * (32 * 4) + k * 4;
                const int u = slice[0] + i;
                const int v = slice[1] + j;
                const int w = slice[2] + k;
                float channel0 = slice_data[index];
                float channel1 = slice_data[index+1];
                float channel2 = slice_data[index+2];
                float channel3 = slice_data[index+3];

                const float null_current_value = null_grid.get_value(u, v, w);
                const float phosphate_current_value = phosphate_grid.get_value(u, v, w);
                const float sugar_current_value = sugar_grid.get_value(u, v, w);
                const float base_current_value = base_grid.get_value(u, v, w);
                const float count_current_value = count_grid.get_value(u, v, w);

                null_grid.set_value(u, v, w, null_current_value+channel0);
                phosphate_grid.set_value(u, v, w, phosphate_current_value+channel1);
                sugar_grid.set_value(u, v, w, sugar_current_value+channel2);
                base_grid.set_value(u, v, w, base_current_value+channel3);
                count_grid.set_value(u, v, w, count_current_value+1);
            }
        }
    }
}

void NucleoFind::set_slice_data_by_ptr(int slice_id, intptr_t data, size_t size) {
    float* data_ptr = reinterpret_cast<float*>(data);
    std::vector<float> slice_data(data_ptr, data_ptr+size);

    const std::vector<int> slice = slices[slice_id];
    for (int i = 0; i < 32; i++) {
        for (int j = 0; j < 32; j++) {
            for (int k = 0; k < 32; k++) {
                int index = ((i * 32 + j) * 32 + k) * 4;
                const int u = slice[0] + i;
                const int v = slice[1] + j;
                const int w = slice[2] + k;
                float channel0 = slice_data[index];
                float channel1 = slice_data[index+1];
                float channel2 = slice_data[index+2];
                float channel3 = slice_data[index+3];

                const float null_current_value = null_grid.get_value(u, v, w);
                const float phosphate_current_value = phosphate_grid.get_value(u, v, w);
                const float sugar_current_value = sugar_grid.get_value(u, v, w);
                const float base_current_value = base_grid.get_value(u, v, w);
                const float count_current_value = count_grid.get_value(u, v, w);

                null_grid.set_value(u, v, w, null_current_value+channel0);
                phosphate_grid.set_value(u, v, w, phosphate_current_value+channel1);
                sugar_grid.set_value(u, v, w, sugar_current_value+channel2);
                base_grid.set_value(u, v, w, base_current_value+channel3);
                count_grid.set_value(u, v, w, count_current_value+1);
            }
        }
    }
}

void NucleoFind::save_maps() {

    for (int i = 0; i < numx; i++) {
        for (int j = 0; j < numy; j++) {
            for (int k = 0; k < numz; k++) {
                float null_value = null_grid.get_value(i, j, k);
                float phosphate_value = phosphate_grid.get_value(i, j, k);
                float sugar_value = sugar_grid.get_value(i, j, k);
                float base_value = base_grid.get_value(i, j, k);

                float count = count_grid.get_value(i, j, k);
                null_value /= count;
                phosphate_value /= count;
                sugar_value /= count;
                base_value /= count;

                float max_value = std::max(std::max(null_value, phosphate_value), std::max(sugar_value, base_value));
                if (max_value == null_value) {
                    phosphate_grid.set_value(i, j, k, 0);
                    sugar_grid.set_value(i, j, k, 0);
                    base_grid.set_value(i, j, k, 0);
                    continue;
                }
                if (max_value == phosphate_value) {
                    phosphate_grid.set_value(i, j, k, 1);
                    sugar_grid.set_value(i, j, k, 0);
                    base_grid.set_value(i, j, k, 0);
                    continue;
                }
                if (max_value == sugar_value) {
                    sugar_grid.set_value(i, j, k, 1);
                    phosphate_grid.set_value(i, j, k, 0);
                    base_grid.set_value(i, j, k, 0);
                    continue;
                }
                if (max_value == base_value) {
                    base_grid.set_value(i, j, k, 1);
                    phosphate_grid.set_value(i, j, k, 0);
                    sugar_grid.set_value(i, j, k, 0);
                }
            }
        }
    }

    gemmi::Ccp4<> phosphate_map;
    phosphate_map.grid = reinterpolate_grid(phosphate_grid);
    phosphate_map.update_ccp4_header();
    phosphate_map.write_ccp4_map("/phosphate.map");

    gemmi::Ccp4<> sugar_map;
    sugar_map.grid = reinterpolate_grid(sugar_grid);
    sugar_map.update_ccp4_header();
    sugar_map.write_ccp4_map("/sugar.map");

    gemmi::Ccp4<> base_map;
    base_map.grid = reinterpolate_grid(base_grid);
    base_map.update_ccp4_header();
    base_map.write_ccp4_map("/base.map");
}
