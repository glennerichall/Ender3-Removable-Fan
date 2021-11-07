const {union, subtract, intersect} = require('@jscad/modeling').booleans;
const {unbox} = require('./geometry');

function union_(...args) {
    return union(...unbox(args));
}

function subtract_(...args) {
    return subtract(...unbox(args));
}

function intersect_(...args) {
    return intersect(...unbox(args));
}

module.exports = {
    union: union_,
    subtract: subtract_,
    intersect: intersect_
}