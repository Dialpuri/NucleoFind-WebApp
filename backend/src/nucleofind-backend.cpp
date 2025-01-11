#include "nucleofind-backend.h"


NucleoFind::NucleoFind() {
    load_work_map();
    calculate_interpolated_size();
    interpolate_grid();
    calculate_slices();
}

std::vector<float> NucleoFind::get_slice(int slice_id) const {
    if (slice_id >= slices.size() || slice_id < 0) {
        std::cout << "Slice id out of bounds" << std::endl;
        return std::vector<float>();
    }
    const std::vector<int> slice = slices[slice_id];

    std::vector<float> data(32*32*32, 0);
    work_grid.get_subarray(data.data(), {slice[0], slice[1], slice[2]}, {32, 32, 32});
    return data;
}

void NucleoFind::load_work_map() {
    mtz = gemmi::read_mtz_file(mtz_path);
    constexpr std::array<int, 3> null_size = {0, 0, 0};
    constexpr double sample_rate = 0;
    constexpr auto order = gemmi::AxisOrder::XYZ;
    std::string f_col = "FWT";
    std::string phi_col = "PHWT";

    const gemmi::Mtz::Column &f = mtz.get_column_with_label(f_col);
    const gemmi::Mtz::Column &phi = mtz.get_column_with_label(phi_col);
    const gemmi::FPhiProxy fphi(gemmi::MtzDataProxy{mtz}, f.idx, phi.idx);
    raw_grid = gemmi::transform_f_phi_to_map2<float>(fphi, null_size, sample_rate, null_size, order);
    raw_grid.normalize();

}

void NucleoFind::calculate_interpolated_size() {
    gemmi::Box<gemmi::Fractional> extent;
    extent.extend(gemmi::Fractional(0, 0, 0));
    extent.extend(gemmi::Fractional(1, 1, 1));

    box = mtz.cell.orthogonalize_box(extent);
    float margin = spacing * (box_size / 2);
    box.add_margin(margin);
    gemmi::Position size = box.get_size();

    numx = static_cast<int>(-floor(-round(size.x / spacing) / overlap) * overlap);
    numy = static_cast<int>(-floor(-round(size.y / spacing) / overlap) * overlap);
    numz = static_cast<int>(-floor(-round(size.z / spacing) / overlap) * overlap);
}

void NucleoFind::interpolate_grid() {
    work_grid.nu = numx;
    work_grid.nv = numy;
    work_grid.nw = numz;
    work_grid.spacegroup = mtz.spacegroup;
    work_grid.unit_cell = mtz.cell;
    work_grid.calculate_spacing();
    work_grid.set_size_without_checking(numx, numy, numz);

    const gemmi::Mat33 mat = gemmi::Mat33(spacing,0,0,0,spacing,0,0,0,spacing);
    const gemmi::Vec3 vec = box.maximum;
    const gemmi::Transform transform = {mat, vec};

    for (int i = 0; i < numx; i++) {
        for (int j = 0; j < numy; j++) {
            for (int k = 0; k < numz; k++) {
                gemmi::Position pos(transform.apply(gemmi::Vec3(i, j, k)));
                gemmi::Fractional fpos = raw_grid.unit_cell.fractionalize(pos);
                float value = raw_grid.interpolate_value(fpos);
                work_grid.set_value(i, j, k, value);
            }
        }
    }

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


