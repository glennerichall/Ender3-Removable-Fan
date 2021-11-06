const {rotate} = require("../libs/transforms");
const {extrudeLinear} = require('@jscad/modeling').extrusions;
const {colorize} = require('@jscad/modeling').colors;
const {rectangle, circle, polygon} = require('@jscad/modeling').primitives;
const {union} = require('@jscad/modeling').booleans;
const {hull} = require('@jscad/modeling').hulls;
const {translate} = require('@jscad/modeling').transforms;

function getConstants() {
    const contants = {
        height: 51.3,
        width: 51,
        depth: 15.4,

        axis: {
            x: 27.3,
            y: 25.4,
        },

        exit: 20,

        holes: [[4.3, 45.4], [47.3, 7.4]],
        hole_diam: 4.5,
        thick: 1.2,
    }
    return contants;
}

function create(def = {}) {

    def = {
        ...getConstants(),
        ...def
    };

    const height = def.height;
    const width = def.width;
    const depth = def.depth;

    const ax = def.axis.x;
    const ay = def.axis.y;
    const exit = def.exit;

    const holes = def.holes;
    const hole_diam = def.hole_diam;
    const thick = def.thick;

    const r1 = ax;
    const r2 = width - ay;
    const r3 = height - ax;

    const numPoints = 45;

    const radius = (a) => a < Math.PI / 2 ? r1 * Math.exp(a * Math.log(r2 / r1) / (Math.PI / 2))
        : r2 * Math.exp((a - Math.PI / 2) * Math.log(r3 / r2) / (Math.PI / 2));

    const spiral = (a) => {
        const r = radius(a);
        return [-r * Math.cos(a), r * Math.sin(a)];
    };

    const points = new Array(numPoints).fill(0).map((_, i) => spiral(i / 180 * Math.PI * 360 / numPoints));
    const body = [translate([ax, ay], polygon({points}))];

    if (exit > height / 2) {
        body.push(rectangle({size: [exit, 1]}));
    }
    const shape = union(
        hull(...body),
        rectangle({size: [exit, ay], center: [exit / 2, ay / 2]})
    );

    const lugs = [];
    for (let hole of holes) {
        lugs.push(
            circle({radius: hole_diam / 2 + 2 * thick, center: hole}),
            circle({radius: (hole_diam + 2 * thick + 7) / 2, center: [ax, ay]})
        );
    }

    const b = extrudeLinear({height: depth}, union(shape, hull(...lugs)));
    return colorize([0.2, 0.2, 0.2], b);
}


module.exports = {
    create,
    getConstants
}