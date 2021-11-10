const tolerance = 0.2;
const epsilon = 0.00001;

const e_plate_def = {
    width: 64,
    height: 47.5,
    depth: 2.5,
    top_left_radius: 10,
    screw_radius: 1.5
};

const magnet_def = {
    height: 3,
    radius: 4
}


module.exports = {
    e_plate_def,
    magnet_def,
    tolerance,
    epsilon,
}