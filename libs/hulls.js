const {hullChain, hull} = require('@jscad/modeling').hulls;

const {unbox, box} = require("./geometry");

function hull_(...geometries) {
    return box(hull(...unbox(geometries)));
}
function hullChain_(...geometries) {
    return box(hullChain(...unbox(geometries)));
}

module.exports = {
    hull : hull_,
    hullChain : hullChain_,
}