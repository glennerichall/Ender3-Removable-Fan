const {tolerance: defaultTolerance, epsilon, tolerance} = require("../src/definitions");
const {align, move} = require("../libs/transforms");
const {rectangle, circle, roundedRectangle, cylinder} = require('@jscad/modeling').primitives;
const {extrudeLinear} = require('@jscad/modeling').extrusions;
const {union, subtract} = require('@jscad/modeling').booleans;
const {colorize} = require('@jscad/modeling').colors;

const defaultRailDepth = 1;
const defaultRailHeight = 1;
const defaultRailOffsetZ = 1;

const defaultHeight = 6.6 + defaultRailHeight * 2;
const defaultWidth = 16.3 + defaultHeight / 2;
const defaultDepth = 5;
const defaultThick = 2;

const constants = {
    height: defaultHeight,
    width: defaultWidth,
    depth: defaultDepth,
    thick: defaultThick,
    rail: {
        depth: defaultRailDepth,
        height: defaultRailHeight,
        offsetZ: defaultRailOffsetZ
    }
}

function jst() {

}

function create_hole(defs = {}, tolerance = defaultTolerance) {
    defs = {
        ...constants,
        ...defs
    };

    return create({
            height: defs.height + tolerance,
            width: defs.width + tolerance,
            depth: defs.depth + tolerance,
            forDrilling: true
        }
    );
}

function create_fitting(defs = {}, tolerance = defaultTolerance, drill = false) {
    defs = {
        ...constants,
        ...defs
    };

    let pogo_fitting =
        extrudeLinear({
                height: defs.depth
            },
            roundedRectangle({
                size: [defs.width + defs.thick, defs.height + defs.thick],
                roundRadius: (defs.height + defs.thick) / 2 - epsilon
            })
        );

    if (drill) {
        let pogo_hole = create_hole(defs, tolerance);
        return subtract(pogo_fitting,
            align(pogo_hole).center.to(pogo_fitting).center.apply());
    } else {
        return pogo_fitting;
    }
}

function create({
                    forDrilling = false,
                    height = defaultHeight,
                    width = defaultWidth,
                    depth = defaultDepth,
                    railHeight = defaultRailHeight,
                    railDepth = defaultRailDepth,
                    railOffsetZ = defaultRailOffsetZ
                } = {}) {

    const innerWidth = width - 2 * railHeight;
    const innerHeight = height - 2 * railHeight;
    const bodySketch = roundedRectangle({size: [innerWidth, innerHeight], roundRadius: innerHeight / 2 - epsilon});
    const railSketch = roundedRectangle({size: [width, height], roundRadius: height / 2 - epsilon});

    const rail = extrudeLinear({height: forDrilling ? depth - railOffsetZ : railDepth}, railSketch);
    const body = extrudeLinear({height: depth}, bodySketch);

    return colorize([0, 0, 0], union(
        move(rail).forward(railOffsetZ).apply(),
        body
    ));
}

module.exports = {
    create,
    create_fitting,
    create_hole,
    constants
}