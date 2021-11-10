const {union, subtract, intersect} = require('@jscad/modeling').booleans;
const {colorize} = require('@jscad/modeling').colors;
const {transform} = require('@jscad/modeling').transforms;

const {bounds} = require('./utils');
const {getOptions} = require("./configs");

let groupCount = 1;
let geometryCount = 1;

class BinaryOperator {

    constructor(operator, symbol, ...args) {
        this.operands = args;
        this.operator = operator;
        this.symbol = symbol;
    }

    newName() {
        const op = this.symbol;
        return this.operands.map(
            arg => arg.isBoxed && arg.getName() || 'primitive')
            .filter(x => x.trim().length > 0 && x !== 'Box')
            .join(op);
    }

    eval(name) {
        const result = box(
            this.operator(
                ...unbox(this.operands)),
            name || this.newName());

        if (getOptions().debugEnabled) {
            result.for = this;
        }
        return result;
    }
}

createOperator = (operator, symbol, postEval = res => res) => class extends BinaryOperator {
    constructor(...args) {
        super(operator, symbol, ...args);
    }

    eval(name) {
        return postEval(super.eval(name));
    }
}

const Difference = createOperator(subtract, ' (-) ');
const Union = createOperator(union, ' (v) ');
const Intersection = createOperator(intersect, ' (^) ');
const Transform = createOperator(transform, '', res => res.setName('transform(' + res.getName().replace('primitiveprimitive', 'primitive') + ')'));
const Colorization = createOperator(colorize, '', res => res.setName('colorize(' + res.getName() + ')'));

class Box {
    constructor(primitive) {
        this.primitive = primitive;
    }

    get isBoxed() {
        return true;
    }

    getName() {
        return 'Box';
    }

    unbox() {
        return this.primitive;
    }
}

class GeometryGroup {
    constructor(geometries, name = `[geometry group${groupCount++}]`) {
        this.geometries = box(geometries);
        this.name = name;
    }

    getName() {
        return this.name;
    }

    toString() {
        return name;
    }

    get isBoxed() {
        return true;
    }

    getBounds() {
        return bounds(this.geometries);
    }

    getGeometry() {
        return unbox(this.geometries);
    }

    map(f) {
        return new GeometryGroup(this.geometries.map(f), undefined, this);
    }

    transform(matrix) {
        return this.map(x => new Transform(new Box(matrix), x).eval());
    }

    subtract(...args) {
        return this.map(x => new Difference(x, ...args).eval());
    }

    findDebug() {
        if (!getOptions().debugEnabled) return [];
        return this.geometries.flatMap(x => x.findDebug());
    }

    unbox() {
        return unbox(this.getGeometry());
    }

}


function argsWithName(args) {
    if (typeof args[args.length - 1] === 'string') {
        return [args.slice(0, args.length - 2), args[args.length - 1]];
    }
    return [args];
}

class Geometry {
    constructor(target, name = target.isBoxed ? `[geometry${geometryCount++}]`
        : `[boxed primitive${geometryCount++}]`) {

        this.target = target;
        this.name = name;
        this.isDebug = false;
    }

    getName() {
        return this.name;
    }

    get isBoxed() {
        return true;
    }

    setName(name) {
        this.name = name;
        return this;
    }

    get debug() {
        this.isDebug = true;
        return this;
    }

    transform(matrix, name) {
        return new Transform(matrix, this).eval(name);
    }

    colorize(color, name) {
        return new Colorization(color, this).eval(name);
    }

    union(...args) {
        let [operands, name] = argsWithName(args);
        return new Union(this, ...operands).eval(name);
    }

    subtract(...args) {
        let [operands, name] = argsWithName(args);
        return new Difference(this, ...operands).eval(name);
    }

    intersect(...args) {
        let [operands, name] = argsWithName(args);
        return new Intersection(this, ...operands).eval(name);
    }

    getBounds() {
        return bounds(this.getGeometry());
    }

    getGeometry() {
        return this.target;
    }

    findDebug() {
        if (!getOptions().debugEnabled) return [];

        let res = [];
        if (this.isDebug) {
            res.push(this);
        }
        if (this.for) {
            for (let op of this.for.operands) {
                if (op.findDebug) {
                    res.push(...op.findDebug());
                }
            }
        }
        return res;
    }

    unbox() {
        return this.getGeometry();
    }
}


function unbox(geometry) {
    if (Array.isArray(geometry)) {
        return geometry.map(x => unbox(x));
    }

    if (geometry?.isBoxed) {
        return geometry.unbox();
    }

    return geometry;
}

function box(geometry, name) {
    if (Array.isArray(geometry)) {
        return geometry.flatMap(geom => box(geom, name));
    }
    return geometry.isBoxed ? geometry : new Geometry(geometry, name);
}

function group(geometries, name) {
    return new GeometryGroup(geometries, name);
}

module.exports = {
    box,
    unbox,
    group,
    getOptions: () => options
}