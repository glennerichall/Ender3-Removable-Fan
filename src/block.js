const plate = require('./plate');
const {extrudeLinear} = require('@jscad/modeling').extrusions;
const {colorize} = require('@jscad/modeling').colors;
const {
    rectangle, circle, cylinder,
    cylinderElliptic, roundedRectangle,
    polygon, cuboid, roundedCuboid, sphere
} = require('@jscad/modeling').primitives;
const {union, subtract} = require('../libs/booleans');
const {hullChain, hull} = require('@jscad/modeling').hulls;
const {transform, translate} = require('@jscad/modeling').transforms;
const {poly3, path2} = require('@jscad/modeling').geometries;
const {mat4, plane, vec3, vec2} = require('@jscad/modeling').maths;

const {roundRect, cubeFromBoundsOf} = require("../libs/primitives");
const {bounds, toVec2, toVec3, ellipse_path_2d, lin, expand} = require("../libs/utils");
const {drill} = require("../libs/holes");
const {align, move, mirror, rotate, scale} = require("../libs/transforms");
const pogo = require("../vitamins/pogo");
const {box} = require('../libs/geometry');
const blower = require('./blower');
const {tolerance, epsilon} = require("./definitions");

function getConstants(plate_def = plate.getConstants()) {
    let blower_defs = blower.getConstants();

    hotend_fan_width = 40;
    hotend_fan_depth = 10;
    hotend_fan_radius = hotend_fan_width / 2 - 1;
    hotend_fan_screw_radius = 1.5;

    const constants = {
        base: {
            ...plate_def.base
        },

        pogo: {},

        depth: plate_def.depth + 1,

        holes: [
            // bottom center wheel screw
            plate_def.holes[3]
        ],

        blower: {
            thick: 2,
            margins: {
                x: 3,
                y: -3,
                z: 12
            },
            duct_length: 14
        },

        fan: {
            depth: 24,
            extrusion_depth: 2,
            extrusion_thick: 1,
            width: 40,
            screw: {
                distance: 32,
                radius: 1.5
            },
            corner_radius: 3,
            margins: {
                x: 0,
                y: 20,
                z: 0,
            },
            air_hole: {
                radius: 1.5,
                count: {
                    x: 6,
                    z: 4
                },
                margins: {
                    x: 0,
                    z: 0
                },
                offset: {
                    x: 0,
                    z: 0
                }
            }
        }
    }

    constants.fan.air_hole.offset.z = constants.fan.extrusion_depth;
    constants.fan.width += 2 * constants.fan.extrusion_thick;

    const diameter = constants.fan.air_hole.radius * 2;
    const r = Math.max(constants.fan.corner_radius,
        (constants.fan.width - constants.fan.screw.distance) / 2 + constants.fan.screw.radius);
    const nx = constants.fan.air_hole.count.x;
    const nz = constants.fan.air_hole.count.z;
    const offz = constants.fan.air_hole.offset.z;
    const offx = constants.fan.air_hole.offset.x;

    constants.fan.air_hole.margins.x = (constants.fan.width - offx - nx * diameter - 2 * r) / nx;
    constants.fan.air_hole.margins.z = (constants.fan.depth - offz - nz * diameter) / (nz + 2);

    return constants;
}

function create_holder(heatblock, e_plate, plate_with_holes, defs, blower_defs) {
    // create the blower to substract from the holder
    blower_defs.depth += 2 * defs.blower.thick

    // this blower will remove full width of holder
    let blower1 = blower.create(blower_defs);

    // this blower will remove only the lug from the cylinder
    blower_defs.depth -= 2 * defs.blower.thick
    blower_defs.depth += 2 * tolerance;
    let blower2 = blower.create(blower_defs);

    // move the blower up the thickness of the lug wall
    blower2 = move(blower2).forward(defs.blower.thick)
        .then.move.backward(tolerance).apply();

    blower_defs.depth -= 2 * tolerance;
    const blower_holder_dims = {
        width: blower_defs.depth + 2 * defs.blower.thick,
        height: blower_defs.height - blower_defs.hole_diam,
        depth: defs.blower.margins.z + blower_defs.holes[0][0],
    };

    // create the holder
    let left_blower_holder = cuboid({
        size: [
            blower_holder_dims.depth,
            blower_holder_dims.height,
            blower_holder_dims.width,
        ],
    });

    // align the holder to the full depth blower
    left_blower_holder = align(left_blower_holder).left.bottom.centerZ
        .to(blower1).left.bottom.centerZ
        .then.move.left(defs.blower.margins.z)
        .apply();

    // create lips to hold and clip blower to holder
    let lips = cuboid({
        size: [
            blower_defs.exit + defs.blower.margins.z,
            2,
            blower_holder_dims.width,
        ]
    });

    lips = align(lips).right.bottom.centerZ
        .to(blower2).left.bottom.centerZ
        .then.move.right(blower_defs.exit + tolerance + defs.blower.thick)
        .apply();

    // return union(lips, blower2)
    lips = subtract(lips, blower2);

    // create a cylinder to snap in the blower lug
    let c = cylinder({
        radius: blower_defs.hole_diam / 2 + 2 * defs.blower.thick,
        height: blower_defs.depth + 2 * defs.blower.thick
    });

    // move the cylinder to the center of the lug
    c = move(c).to.xy(...blower_defs.holes[0])
        .then.align.centerZ.to(left_blower_holder).centerZ.apply();

    // remove the full depth blower
    left_blower_holder = subtract(left_blower_holder, blower1);

    // remove the real depth blower from the cylinder
    c = subtract(c, blower2);

    [left_blower_holder, c, lips] = rotate(left_blower_holder).x()
        .yz(-Math.PI / 2).then.align.bottom.back
        .to(plate_with_holes).bottom.back.applyToTargetAnd(c, lips);

    // lips = align(lips).bottom.back.centerX
    //     .to(left_blower_holder).bottom.back.centerX
    //     .apply();

    // add the cylinder to the holder
    left_blower_holder = union(c, left_blower_holder, lips);

    return left_blower_holder;
}

function duct_loft(heatblock,
                   left_blower_holder,
                   loft,
                   defs,
                   blower_defs,
                   {
                       steps = 50,
                       margin_x = 0,
                       margin_y = 0,
                       nozzle_exit_width = 3,
                       nozzle_exit_height = 9
                   } = {}) {

    // put the loft at the exit of the blower
    loft = align(loft).centerY.centerX.back
        .to(left_blower_holder).centerX.bottom.back
        .then.move.forward(defs.blower.margins.z + 2 * tolerance + blower_defs.thick)
        .then.move.backward((bounds(loft).depth - blower_defs.exit) / 2 + blower_defs.thick)
        .apply();

    const heatblock_bounds = bounds(heatblock);
    const loft_bounds = bounds(loft);

    // final scale of the lof at the nozzle
    const scale_width = nozzle_exit_width / loft_bounds.width;
    const scale_height = nozzle_exit_height / loft_bounds.depth;

    // use the left side of the nozzle
    // move up so the bottom of the duct will fit the bottom of the nozzle
    const nozzle =
        {
            x: heatblock_bounds.left - loft_bounds.height / 2 - margin_x,
            y: heatblock_bounds.bottom + loft_bounds.width * scale_width / 2 + margin_y,
            z: heatblock_bounds.back,
        };

    // use the center of the blower exit
    const exit =
        {
            x: loft_bounds.center.x,
            y: loft_bounds.bottom,
            z: loft_bounds.center.z
        };

    // used to see the position of the start and end of duct
    // let cb = sphere({radius: 2, center: toVec3(exit).expand()});
    // cb = colorize([0, 1, 0, 0.5], cb);


    // determine the distance vector from the blower exit to the nozzle position
    let blower_to_nozzle = toVec3(nozzle).sub(exit);

    // find the angle on XZ plane between the nozzle and the blower
    const theta = Math.PI - Math.atan2(-blower_to_nozzle.z, -blower_to_nozzle.x)

    // move the blower exit center point to the XY plane
    const rotated = blower_to_nozzle.clone().invert().rotateY(-theta);

    // generate points on an ellipsis from the center of the blower exit to the nozzle
    const path = ellipse_path_2d(Math.abs(rotated.x), Math.abs(rotated.y), -Math.PI / 2, -Math.PI, steps);

    // create a path from those points (ellipsis)
    let pth = path2.create(path.map(p => toVec2(p).expand()));
    pth = colorize([0, 1, 1], pth);

    // now place back the path from the center of the blower exit to the nozzle
    // by rotating it on Z axis and moving it to the end of the nozzle
    const mat = rotate(pth).y(theta)
        .then.align.right.bottom
        .to(heatblock).left.bottom.back
        .then.move.left(loft_bounds.height / 2 + margin_x).up(loft_bounds.width * scale_width / 2 + margin_y)
        .getMatrix();

    // clone, rotate, scale and translate the loft to each points of the path.
    function shape(point, i, points) {
        let t = i / (steps - 1);
        let phi = i === 0 ? 0 : lin(0, theta, t);
        let sw = lin(scale_width, 1, t);
        let sh = lin(scale_height, 1, t);

        let b = i > 0 ? vec2.subtract(vec2.create(), points[i], points[i - 1]) : [0, 0];
        b = [b[0], b[1], 0];
        const angle = i > 0 ? i === points.length - 1 ? 0 : Math.PI / 2 - Math.atan2(b[1], b[0]) : -Math.PI / 2;
        const center = vec3.transform(vec3.create(), [point[0], point[1], 0], mat);

        return scale(loft).width(sw).depth(sh)
            .then.rotate.z(-angle)
            .then.move.to.xyz(...center)
            .apply();
    }

    // generate the loft shapes
    loft = path2.toPoints(pth).map((p, i, points) => shape(p, i, points));

    // chain-hull everything
    loft = hullChain(loft);

    // used to see the path in the renderer
    // pth.transforms = mat;
    // loft = colorize([1, 0, 0], loft);

    return loft;
}

function create_duct(heatblock,
                     left_blower_holder,
                     defs,
                     blower_defs) {
    // create the loft for the hole of the duct
    let duct_hole_loft = cuboid({
        size: [
            blower_defs.depth - 2 * blower_defs.thick,
            0.1,
            blower_defs.exit - 2 * blower_defs.thick
        ]
    });

    // create the loft for the the duct walls
    const left_blower_holder_bounds = bounds(left_blower_holder);
    let duct_wall_loft = cuboid({
        size: [
            left_blower_holder_bounds.width,
            0.1,
            blower_defs.exit
        ]
    });

    // loft the hole
    duct_hole_loft = duct_loft(heatblock, left_blower_holder, duct_hole_loft, defs, blower_defs,
        {
            margin_y: blower_defs.thick
        });


    // loft the walls
    let duct_walls1 = duct_loft(heatblock, left_blower_holder, duct_wall_loft, defs, blower_defs,
        {
            nozzle_exit_width: 3 + 2 * blower_defs.thick,
            nozzle_exit_height: 9 + 2 * blower_defs.thick
        });

    duct_walls1 = box(duct_walls1, 'duct walls');

    // we need to have material down to the build plate. So clone and move beyond the build plate.
    let duct_walls2 = move(duct_walls1).backward(defs.blower.margins.z / 2).apply();
    let duct_walls3 = move(duct_walls1).backward(defs.blower.margins.z + blower_defs.thick).apply();


    // create a big loft of the 3 shapes
    let duct_walls = duct_walls1.debug.union(duct_walls2, duct_walls3);
    // let duct_walls = union(duct_walls1, duct_walls2, duct_walls3);

    // create a cutting shape, the size of the duct union and place it
    // from the build plate surface
    let cut = cuboid({size: expand(bounds(duct_walls))});
    cut = align(cut).front.top
        .to(left_blower_holder).bottom.back
        .then.align.left.to(duct_walls).left
        .apply();

    // done
    // return [ colorize([1,0,0], cut), duct_hole_loft, colorize([0,0,0,0.5], duct_walls),]
    // return subtract(duct_walls, cut, duct_hole_loft);
    return duct_walls.subtract(cut, duct_hole_loft);
}


function create_fan(
    heatblock,
    defs
) {
    const heatblockBounds = bounds(heatblock);

    // create the fan holder
    const fan_width = defs.fan.width;
    const radius = defs.fan.corner_radius;
    let fan = extrudeLinear({height: defs.fan.depth},
        roundRect({
            size: fan_width,
            radius,
        }));

    let extrusion = extrudeLinear({height: defs.fan.extrusion_depth},
        roundRect({
            size: fan_width - 2 * defs.fan.extrusion_thick,
            radius,
        }));

    // drill holes for air flow
    let fanBounds = bounds(fan);
    const airHoles = defs.fan.air_hole;
    const spread_x = airHoles.count.x * (airHoles.radius * 2) + (airHoles.count.x - 1) * airHoles.margins.x;
    const spread_z = airHoles.count.z * (airHoles.radius * 2) + (airHoles.count.z - 1) * airHoles.margins.z;

    const holes_start_x = fanBounds.center.x - spread_x / 2 + airHoles.radius - airHoles.offset.x;
    const holes_start_z = fanBounds.center.z - spread_z / 2 + airHoles.radius - airHoles.offset.z;

    let hole = cylinder({height: fan_width + 1, radius: airHoles.radius});

    function holePos(i, j) {
        const pos = {
            x: holes_start_x + j * (airHoles.margins.x + airHoles.radius * 2),
            y: fanBounds.bottom,
            z: holes_start_z + i * (airHoles.margins.z + airHoles.radius * 2),
        };

        return rotate(hole).x()
            .then.align.bottom.to().pos(pos).apply();
    }

    const holes = [];
    for (let i = 0; i < airHoles.count.z; i++) {
        for (let j = 0; j < airHoles.count.x; j++) {
            const h1 = holePos(i, j);
            const h2 = rotate(h1).z().apply();
            holes.push(h1, h2);
        }
    }
    // fan = subtract(fan, ...holes);

    // drill hole for fan
    let duct = cylinder({height: defs.fan.depth, radius: (fan_width / 2 - 1)});
    duct = align(duct).center.to(fan).center.apply();

    extrusion = align(extrusion).front.centerX.centerY
        .to(fan).centerX.centerY.front.apply();

    // drill holes for screws
    const sd = defs.fan.screw.distance / 2;
    const sr = defs.fan.screw.radius;

    const screws = [
        {x: -sd, y: -sd, radius: sr},
        {x: sd, y: -sd, radius: sr},
        {x: sd, y: sd, radius: sr},
        {x: -sd, y: sd, radius: sr},
    ];
    fan = drill(screws, fan);

    // remove a space to fit the heatblock
    const j0 = 0;
    const j1 = defs.fan.air_hole.count.x;

    const i0 = -1;
    const i1 = defs.fan.air_hole.count.z - 2;
    let heatblock_hole = hull(
        holePos(i0, j0),
        holePos(i0, j1),
        holePos(i1, j0),
        holePos(i1, j1),
    )

    // subtract everything
    fan = subtract(fan, duct, extrusion, heatblock_hole);

    // align the fan center of heat block
    fan = align(fan).centerX.bottom
        .to(heatblock).centerX.bottom
        .then.move.xyz(defs.fan.margins).apply();

    return fan;
}

function create_pogo_for_blower(right_blower_holder, _pogo_, defs, blower_defs) {
    const {depth} = defs;
    let pogo_hole = pogo.create_hole({depth});
    let pogo_fitting = pogo.create_fitting({depth});
    _pogo_ = align(_pogo_).back.to(right_blower_holder).back.apply();
    [pogo_hole, pogo_fitting] = align([pogo_hole, pogo_fitting]).centerX.centerY
        .to(_pogo_).centerX.centerY
        .then.align.back.to(pogo_fitting).back
        .apply();

    const r = bounds(pogo_fitting).height / 2;
    let c = cylinder({radius: r, height: depth});
    let c1 = align(c).back.centerX.bottom
        .to(right_blower_holder)
        .back.top.centerX
        .then.move.down(blower_defs.hole_diam / 2 + r + defs.blower.thick)
        .apply();

    let c2 = align(c).back.centerX.centerY
        .to(pogo_fitting)
        .back.bottom.centerX
        .apply();

    // return [pogo_hole, colorize([0,0,0,0.5],pogo_fitting)];
    return subtract(union(pogo_fitting, hull(c2, c1)), pogo_hole);
}

function create(
    heatblock,
    e_plate,
    _pogo_,
    {
        defs = getConstants(),
        blower_defs = blower.getConstants(),
        helpers = {},
        hasBlowers = true,
        hasFan = true
    } = {},
) {
    let base_plate = extrudeLinear({height: defs.depth}, roundRect(defs.base));
    let plate_with_holes = drill(defs.holes, base_plate);

    let left_blower_holder = create_holder(heatblock, e_plate, plate_with_holes, defs, blower_defs);

    // align the base plate to the e_plate
    plate_with_holes = align(plate_with_holes).top.left
        .to(e_plate).top.left.apply();

    let fan = create_fan(heatblock, defs);

    // align the blower holder to the fan and the base plate
    // considering margins
    left_blower_holder = align(left_blower_holder).right
        .to(fan).left
        .then.move.left(defs.blower.margins.x)
        .then.align.bottom.to(plate_with_holes).bottom
        .then.move.up(defs.blower.margins.y)
        .apply();

    // create the duct
    let left_duct = create_duct(heatblock, left_blower_holder, defs, blower_defs,);

    // create the right blower holder reflecting from center of fan
    let [right_blower_holder, right_duct] = mirror(left_blower_holder)
        .about(heatblock).centerX.applyToTargetAnd(left_duct);

    let block = plate_with_holes;
    if (hasFan) {
        block = union(block, fan);
    }

    if (hasBlowers) {
        let p = create_pogo_for_blower(right_blower_holder, _pogo_, defs, blower_defs);

        block = union(block,
            left_blower_holder,
            right_blower_holder,
            p);

    }

    helpers.placeBlowerLeft = placeBlower(left_blower_holder);
    helpers.placeBlowerRight = placeBlower(right_blower_holder);

    // duct_walls = colorize([0, 0, 0, 0.5], duct_walls);
    return hasBlowers ? [block, left_duct, right_duct] : [block];
}

const placeBlower = block => blower => {
    return rotate(blower)
        .x().yz(-Math.PI / 2)
        .then.align.bottom.centerX.back
        .to(block).bottom.centerX.back
        .then.move.forward(getConstants().blower.margins.z)
        .apply();
}

module.exports = {
    create,
    getConstants,
}