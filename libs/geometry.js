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
        this.name = name;
    }

    get isBoxed() {
        return true;
    }

    get debug() {
        return this;
    }

    getNewName(args, op) {
        op = ` (${op}) `;
        return this.name + op + args.map(arg => arg.isBoxed && arg.name || 'primitive').join(op);
    }

    transform(matrix, name) {
        return new Geometry(transform(matrix, this.target), name || (this.name + ' transformed'));
    }

    colorize(color) {
        return new Geometry(colorize(color, this.target), name || (this.name + ' colorized'));
    }

    union(...args) {
        return new Geometry(union(this.target, ...unbox(args)),
            name || this.getNewName(args, 'v'));
    }

    subtract(...args) {
        return new Geometry(subtract(this.target, ...unbox(args)),
            name || this.getNewName(args, '-'));
    }

    intersect(...args) {
        return new Geometry(intersect(this.target, ...unbox(args)),
            name || this.getNewName(args,'^'));
    }

    getBounds() {
        return bounds(this.getGeometry());
    }

    getGeometry() {
        return this.target;
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
    unbox,
}