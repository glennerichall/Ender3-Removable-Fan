const {transform} = require('@jscad/modeling').transforms;
const {mat4, plane} = require('@jscad/modeling').maths;

const {Transform, multiplyMatrices, applyTransform} = require('./Transform');
const {bounds, toVec3} = require('../utils');
const {group} = require('../geometry');
const {Translation} = require("./Translation");
const {Reflection} = require("./Reflection");
const {Rotation} = require("./Rotation");
const {Scale: ScaleBase} = require("./Scale");
const {Move: MoveBase} = require("./Move");
const {Position: PositionBase} = require('./Position');

class Chainable {
    constructor(geometry, matrix) {
        this.geometry = geometry;
        this.matrix = matrix;
    }

    get align() {
        return align(this.geometry, this.matrix);
    }

    get move() {
        return move(this.geometry, this.matrix);
    }

    get mirror() {
        return mirror(this.geometry, this.matrix);
    }

    get rotate() {
        return rotate(this.geometry, this.matrix);
    }

    get scale() {
        return scale(this.geometry, this.matrix);
    }
}

const Thenable = (Parent) => class extends Parent {
    constructor(geometry, matrix) {
        super(geometry, matrix);
    }

    get then() {
        return new Chainable(this.getGeometry(), this.getMatrix());
    }
}

class FromBoundsTranslation extends Translation {
    constructor(geometry, matrix) {
        super(geometry, matrix);
    }

    get top() {
        this.translation[1] = this.bounds.top;
        return this;
    }

    get bottom() {
        this.translation[1] = this.bounds.bottom;
        return this;
    }

    get left() {
        this.translation[0] = this.bounds.left;
        return this;
    }

    get right() {
        this.translation[0] = this.bounds.right;
        return this;
    }

    get front() {
        this.translation[2] = this.bounds.front;
        return this;
    }

    get back() {
        this.translation[2] = this.bounds.back;
        return this;
    }

    get centerX() {
        this.translation[0] = this.bounds.center.x;
        return this;
    }

    get centerY() {
        this.translation[1] = this.bounds.center.y;
        return this;
    }

    get centerZ() {
        this.translation[2] = this.bounds.center.z;
        return this;
    }

    get center() {
        return this.centerX.centerY.centerZ;
    }

}

const AlignReference = Parent => class extends Parent {
    constructor(source, reference) {
        super(reference);
        this.source = source
    }

    getMatrix() {
        const ms = this.source.invert().getMatrix();
        const mr = super.getMatrix();
        return this.source.multiplyMatrices(mr, ms);
    }

    applyTransform(matrix, ...geometries) {
        return this.source && this.source.applyTransform(matrix, ...geometries) ||
            super.applyTransform(matrix, ...geometries);
    }

    getGeometry() {
        return this.source && this.source.getGeometry() || super.getGeometry();
    }
}

const ThenableAlignReference = Parent => Thenable(AlignReference(Parent))
const AlignReferenceBounds = ThenableAlignReference(FromBoundsTranslation);
const AlignReferenceMove = ThenableAlignReference(PositionBase);

const AlignSource = (Parent) => class extends Parent {
    constructor(target, matrix) {
        super(target, matrix);
    }

    get toSelf() {
        return this.to(this.geometry);
    }

    to(reference) {
        // const mat = this.invert().getMatrix();
        // return reference !== undefined ? move(this.geometry, mat);

        return reference !== undefined ?
            new AlignReferenceBounds(this, reference) :
            new AlignReferenceMove(this, this.geometry);
    }
}

const Composite = (TargetClass, {
    ignore = []
} = {}) => {
    const Clazz = class {
        constructor(targets, matrices) {
            // console.log(targets)
            this.targets = targets?.map((target, i) => matrices ?
                new TargetClass(target, matrices[i]) :
                new TargetClass(target));
            this.geometry = targets;
            this.isComposite = true;
        }

        apply() {
            return this.targets.map(target => target.apply());
        }

        getGeometry() {
            return this.targets.map(target => target.getGeometry());
        }

        getMatrix() {
            return this.targets.map(target => target.getMatrix());
        }
    }

    // no sense to applyToTargetAnd and applyTo on composite
    // getGeometry is an end point
    // apply is an end point
    ignore.push('getGeometry', 'apply',
        'applyToTargetAnd', 'applyTo',
        'constructor', 'getMatrix');

    let proto = TargetClass.prototype;
    while (proto && proto !== Object.prototype) {
        for (let method of
            Object.getOwnPropertyNames(proto)
                .filter(x => !ignore.includes(x))) {

            const descriptor = Object.getOwnPropertyDescriptor(proto, method);
            if (descriptor?.get) {
                Object.defineProperty(Clazz.prototype, method, {
                    get: function () {
                        // console.log(method)
                        this.targets.map(target => target[method]);
                        return this;
                    }
                });
            } else if (typeof TargetClass.prototype[method] === 'function') {
                Clazz.prototype[method] = function (...args) {
                    // console.log(method)
                    // console.log(this.targets)
                    this.targets.map(target => target[method](...args));
                    return this;
                }
            }
        }
        proto = Object.getPrototypeOf(proto);
    }

    return Clazz;
}

const CompositedAlignReference = Parent => class extends Thenable(Composite(AlignReference(Parent))) {
    constructor(source, geometry) {
        super(source, geometry);
    }
};
const AlignReferenceBoundsComposite = CompositedAlignReference(FromBoundsTranslation);
const AlignReferenceMoveComposite = CompositedAlignReference(PositionBase);

class AlignSourceComposite extends AlignSource(Composite(FromBoundsTranslation)) {
    constructor(targets, matrices) {
        super(targets, matrices);
    }


    multiplyMatrices(m1, m2) {
        const res = new Array(m2.length);
        for (let i = 0; i < m2.length; i++) {
            res[i] = multiplyMatrices(m1, m2[i]);
        }
        return res;
    }

    applyTransform(matrix, ...geometriesIgnored) {
        return this.targets.map((target, i) => target.applyTransform(matrix[i], target.getGeometry()));
    }

    // to(reference) {
    //         return reference !== undefined ?
    //             new AlignReferenceBoundsComposite(this, reference) :
    //             new AlignReferenceMoveComposite(this, this.geometry);
    //
    //     const targets = this.targets.map(target => target.to(reference));
    //     return new AlignReferenceComposite();
    // }
}

class MoveTransform extends MoveBase {
    constructor(geometry, matrix) {
        super(geometry, matrix);
    }

    get to() {
        return position(this.geometry, this.getMatrix());
    }
}

class MoveComposite extends Thenable(Composite(MoveTransform)) {
    constructor(targets, matrices) {
        super(targets, matrices);
    }

    get to() {
        const targets = this.targets.map(target => target.to);
        const position = new PositionAll();
        position.targets = targets;
        position.geometry = this.geometry;
        return position;
    }
}

const Group = Thenable(Transform);

// const AlignAll = Composite(AlignSource(FromBoundsTranslation));
const AlignAll = AlignSourceComposite;
const MoveAll = MoveComposite;
const PositionAll = Thenable(Composite(PositionBase));
const MirrorAll = Thenable(Composite(Reflection));
const RotateAll = Thenable(Composite(Rotation));
const ScaleAll = Thenable(Composite(ScaleBase));

const Align = AlignSource(FromBoundsTranslation);
const Move = Thenable(MoveTransform);
const Position = Thenable(PositionBase);
const Mirror = Thenable(Reflection);
const Rotate = Thenable(Rotation);
const Scale = Thenable(ScaleBase);

function align(geometry, matrix) {
    return Array.isArray(geometry) ? new AlignAll(geometry, matrix) :
        new Align(geometry, matrix);
}

function move(geometry, matrix) {
    return Array.isArray(geometry) ? new MoveAll(geometry, matrix) :
        new Move(geometry, matrix);
}

function mirror(geometry, matrix) {
    return Array.isArray(geometry) ? new MirrorAll(geometry, matrix) :
        new Mirror(geometry, matrix);
}

function rotate(geometry, matrix) {
    return Array.isArray(geometry) ? new RotateAll(geometry, matrix) :
        new Rotate(geometry, matrix);
}

function scale(geometry, matrix) {
    return Array.isArray(geometry) ? new ScaleAll(geometry, matrix) :
        new Scale(geometry, matrix);
}

function position(geometry, matrix) {
    return Array.isArray(geometry) ? new PositionAll(geometry, matrix) :
        new Position(geometry, matrix);
}

module.exports = {
    align: geometry => align(geometry),
    move: geometry => move(geometry),
    mirror: geometry => mirror(geometry),
    rotate: geometry => rotate(geometry),
    scale: geometry => scale(geometry),
    group: geometry => new Group(group(geometry)),
    transform: applyTransform,
}