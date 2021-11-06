const {union, subtract, intersect} = require('@jscad/modeling').booleans;
const {colorize} = require('@jscad/modeling').colors;
const {transform} = require('@jscad/modeling').transforms;

const {bounds} = require('./utils');
const {align, move, group, mirror, scale} = require('./transforms');

function unbox(geometry) {
    if (Array.isArray(geometry)) {
        return geometry.flatMap(x => unbox(x));
    }

    if (geometry?.isBoxed) {
        return geometry.getGeometry();
    }

    return geometry;
}

class Geometry {
    constructor(target, name = '') {
        this.target = target;
        this.operations = [];
        this.name = name;
        this.cachedGeometry = null;
    }

    get isBoxed() {
        return true;
    }

    _push(op) {
        this.operations.push(op);
        this.cachedGeometry = null;
        return this;
    }

    transform(matrix) {
        return this._push(geometry => transform(matrix, geometry));
    }

    colorize(color) {
        return this._push(geometry => colorize(color, geometry));
    }

    union(...args) {
        return this._push(geometry => union(geometry, ...unbox(args)));
    }

    difference(...args) {
        return this._push(geometry => subtract(geometry, ...unbox(args)));
    }

    intersection(...args) {
        return this._push(geometry => intersect(geometry, ...unbox(args)));
    }

    getBounds() {
        return bounds(this.getGeometry());
    }

    getGeometry() {
        if(this.cachedGeometry) return this.cachedGeometry;
        return this.cachedGeometry = this.operations.reduce((res, op) => {
            return op(res);
        }, this.target);
    }
}

function box(geometry, name) {
    if (Array.isArray(geometry)) {
        return geometry.map(geom => box(geom, name));
    }
    return geometry.isBoxed ? geometry : new Geometry(geometry, name);
}

module.exports = {
    box,
    unbox
}