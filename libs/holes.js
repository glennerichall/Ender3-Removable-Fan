const {rectangle, circle, cylinder, cylinderElliptic} = require('@jscad/modeling').primitives;
const {union, subtract} = require('./booleans');
const {bounds, toVec2} = require("./utils");

function hole(properties, geometry) {
    const bds = bounds(geometry);
    const center = [
        properties.x,
        properties.y,
        bds.center.z
    ];
    const height = properties.depth ?? bds.depth;
    const c = cylinder({
        height,
        center,
        ...properties
    });
    if (properties.chamfer) {
        const startRadius = toVec2(properties.radius).expand();
        const endRadius = toVec2(properties.radius + properties.chamfer).expand();
        const chamfer = cylinderElliptic({
            height: properties.chamfer,
            center: [center[0], center[1], height - properties.chamfer / 2],
            ...properties,
            startRadius,
            endRadius
        });
        return [c, chamfer];
    } else {
        return [c];
    }
}

function drill(defs, geometry) {
    const cylinders = defs.flatMap(def => hole(def, geometry));
    return subtract(geometry, ...cylinders);
}

module.exports = {
    hole,
    drill
}