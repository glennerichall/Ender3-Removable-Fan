const {extrudeLinear} = require('@jscad/modeling').extrusions;
const {colorize} = require('@jscad/modeling').colors;
const {cylinder, roundedRectangle} = require('@jscad/modeling').primitives;
const {union, subtract} = require('../libs/booleans');
const {hullChain} = require('@jscad/modeling').hulls;
const {transform} = require('@jscad/modeling').transforms;

const {box} = require('../libs/geometry');
const {roundRect, applyTransforms} = require("../libs/primitives");
const {drill} = require("../libs/holes");
const {align, mirror} = require("../libs/transforms");

const {
    magnet_def: defaultMagnet,
    e_plate_def: defaultE_Plate,
    tolerance: defaultTolerance,
    tolerance,
    epsilon
} = require("./definitions");
const pogo = require("../vitamins/pogo");


function getConstants({
                          e_plate_def = defaultE_Plate,
                          magnet_def = defaultMagnet,
                          tolerance = defaultTolerance
                      } = {}) {
    const centerOffsetX = 5;

    const plate_def = {
        base: {
            top_left_radius: e_plate_def.top_left_radius,
            top_right_radius: 0,
            bottom_right_radius: 3,
            bottom_left_radius: 3,
            width: e_plate_def.width / 2 + centerOffsetX,
            height: e_plate_def.height
        },

        pogo: {
            loft: {
                width: e_plate_def.width / 2 - centerOffsetX,
                height: e_plate_def.top_left_radius / 2
            },
            thick: 2,
            offset: {
                x: 5,
                y: 2
            },
            height: pogo.constants.height,
            width: pogo.constants.width,
            depth: pogo.constants.depth
        },

        depth: magnet_def.height + tolerance,

        holes: [
            // top left wheel screw
            {
                radius: 6,
                x: -6.5,
                y: 11.75
            },
            {
                radius: e_plate_def.screw_radius + tolerance,
                chamfer: 2,
                x: 12,
                y: 9.4
            },
            {
                radius: e_plate_def.screw_radius + tolerance,
                chamfer: 2,
                x: -5.5,
                y: -9.5
            },
            // bottom center wheel screw
            {
                radius: 6,
                x: 13.5,
                y: -e_plate_def.height / 2 - 4
            },
            // behind heatblock wheel screw
            {
                radius: 6,
                x: 33.5,
                y: 11.75
            },
        ]
    }

    plate_def.base.offset = {
        x: 0,
        y: plate_def.pogo.offset.y
            + plate_def.pogo.height
            + plate_def.pogo.thick,
        z: 0
    };

    return plate_def;
}

function handle({
                    depth,
                    height,
                    width,
                    pogo_defs = getConstants().pogo
                }, base) {

    const radius = height;
    const cyl = () => cylinder({height: depth, radius});

    const left_loft = align(cyl()).top.left.front
        .to(base).right.top.front
        .then.move.left(radius).apply();

    const right_loft = align(cyl()).top.left.front
        .to(base).top.front.right
        .then.move.right(width - 2 * radius).apply();

    let pogo_hole = pogo.create_hole({depth});
    let pogo_fitting = pogo.create_fitting({depth});

    const trMat = align(pogo_fitting).bottom.left.front
        .to(right_loft).top.right.front
        .then.move.up(pogo_defs.offset.y).right(pogo_defs.offset.x)
        .getMatrix();

    pogo_fitting = transform(trMat, pogo_fitting);
    pogo_hole = transform(trMat, pogo_hole);

    pogo_fitting = colorize([0.5, 0.5, 0.5, 0.5], pogo_fitting);

    pogo_hole = mirror(pogo_hole).back
        .then.align.front.to(pogo_fitting).front.apply();

    const pogo_loft = align(cylinder({
        height: depth,
        radius: (pogo_defs.height + pogo_defs.thick) / 2 - epsilon
    })).top.left.front
        .to(pogo_fitting).top.left.front.apply();

    pogo_hole = applyTransforms(pogo_hole);

    return subtract(
        union(pogo_fitting, hullChain(left_loft, right_loft, pogo_loft)),
        pogo_hole);
}

function create(defs = {}) {

    defs = {
        ...getConstants(),
        helpers: {},
        ...defs
    };

    const base_plate = box(extrudeLinear({height: defs.depth}, roundRect(defs.base)));

    const loft_and_pogo = handle({...defs.pogo.loft, depth: defs.depth}, base_plate);

    // const plate_with_holes = drill(defs.holes, union(base_plate, loft_and_pogo));
    const plate_with_holes = drill(defs.holes, base_plate.union(loft_and_pogo));

    defs.helpers.placePogo = pogo => {
        return mirror(pogo).back
            .then.align.top.right.front
            .to(plate_with_holes).top.front.right
            .then.move
            .left(defs.pogo.thick / 2)
            .down(defs.pogo.thick / 2)
            .apply();
    }

    return plate_with_holes;
}


module.exports = {
    create,
    getConstants
}