const {unbox, box} = require('./geometry');

function union_(...args) {
    args = box(args);
    return args[0].union(...args.slice(1));
}

function subtract_(...args) {
    args = box(args);
    return args[0].subtract(...args.slice(1));
}

function intersect_(...args) {
    args = box(args);
    return args[0].intersect(...args.slice(1));
}

module.exports = {
    union: union_,
    subtract: subtract_,
    intersect: intersect_
}