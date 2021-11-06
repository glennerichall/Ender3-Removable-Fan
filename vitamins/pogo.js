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

const constants = {
    height: defaultHeight,
    width: defaultWidth,
    depth: defaultDepth,
    rail: {
        depth: defaultRailDepth,
        height: defaultRailHeight,
        offsetZ: defaultRailOffsetZ
    }
}

function jst() {

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
    constants
}