const {bounds, toVec3} = require('./utils');
const {transform} = require('@jscad/modeling').transforms;
const {mat4, plane} = require('@jscad/modeling').maths;

function multiplyMatrices(m1, m2) {
    return mat4.multiply(mat4.create(), m1, m2);
}

function getBounds(geometry) {
    return geometry instanceof GeometryGroup ? bounds(geometry.geometries) : bounds(geometry);
}

function applyTransform(matrix, ...geometries) {
    const tr = geometries.map(geometry => {
        if (geometry instanceof GeometryGroup) {
            return new GeometryGroup(transform(matrix, ...geometry.geometries));
        } else if (geometry.isBoxed) {
            return transform(matrix, geometry.getGeometry());
        } else {
            return transform(matrix, geometry);
        }
    });
    return tr.length === 1 ? tr[0] : tr;
}

function unpack(geometry) {
    if (Array.isArray(geometry)) {
        return geometry.flatMap(geom => unpack(geom));
    } else if (geometry instanceof GeometryGroup) {
        return geometry.geometries;
    } else {
        return geometry;
    }
}


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


class Transform {
    constructor(geometry, matrix) {
        this.matrix = matrix ?? mat4.create();
        this.geometry = geometry;
    }

    getGeometry() {
        return this.geometry;
    }

    getMatrix() {
        return this.multiplyMatrices(
            this.getBaseMatrix(),
            this.matrix
        );
    }

    getBaseMatrix() {
        return mat4.create();
    }

    apply() {
        return this.transform(this.getGeometry());
    }

    applyToTargetAnd(...others) {
        return this.transform(this.getGeometry(), ...others);
    }

    applyTo(...others) {
        return this.transform(...others);
    }

    transform(...args) {
        return this.unpack(this.applyTransform(this.getMatrix(), ...args));
    }

    multiplyMatrices(m1, m2) {
        return multiplyMatrices(m1, m2);
    }

    getBounds(geometry) {
        return getBounds(geometry);
    }

    applyTransform(matrix, ...geometries) {
        return applyTransform(matrix, ...geometries);
    }

    unpack(geometry) {
        return unpack(geometry);
    }
}

class TranslationTransform extends Transform {
    constructor(geometry, matrix) {
        super(geometry, matrix);
        this.translation = [0, 0, 0];
        this.bounds = this.matrix && geometry &&
            this.getBounds(this.applyTransform(this.matrix, geometry));
    }

    invert() {
        this.translation[0] = -this.translation[0];
        this.translation[1] = -this.translation[1];
        this.translation[2] = -this.translation[2];
        return this;
    }

    getBaseMatrix() {
        return mat4.fromTranslation(mat4.create(), this.translation);
    }
}

class ReflectionTransform extends Transform {
    constructor(geometry, matrix) {
        super(geometry, matrix);
        this.plane = plane.create();
        this.bounds = this.getBounds(this.applyTransform(this.matrix, geometry));
    }

    get top() {
        const v = [this.bounds.center.x, this.bounds.top, this.bounds.center.z];
        this.plane = plane.fromNormalAndPoint(this.plane, [0, 1, 0], v);
        return this;
    }

    get bottom() {
        const v = [this.bounds.center.x, this.bounds.bottom, this.bounds.center.z];
        this.plane = plane.fromNormalAndPoint(this.plane, [0, 1, 0], v);
        return this;
    }

    get left() {
        const v = [this.bounds.left, this.bounds.center.y, this.bounds.center.z];
        this.plane = plane.fromNormalAndPoint(this.plane, [1, 0, 0], v);
        return this;
    }

    get right() {
        const v = [this.bounds.right, this.bounds.center.y, this.bounds.center.z];
        this.plane = plane.fromNormalAndPoint(this.plane, [1, 0, 0], v);
        return this;
    }

    get back() {
        const v = [this.bounds.center.x, this.bounds.center.y, this.bounds.back];
        this.plane = plane.fromNormalAndPoint(this.plane, [0, 0, 1], v);
        return this;
    }

    get front() {
        const v = [this.bounds.center.x, this.bounds.center.y, this.bounds.front];
        this.plane = plane.fromNormalAndPoint(this.plane, [0, 0, 1], v);
        return this;
    }

    get centerX() {
        const v = [this.bounds.center.x, this.bounds.center.y, this.bounds.center.z];
        this.plane = plane.fromNormalAndPoint(this.plane, [1, 0, 0], v);
        return this;
    }

    get centerY() {
        const v = [this.bounds.center.x, this.bounds.center.y, this.bounds.center.z];
        this.plane = plane.fromNormalAndPoint(this.plane, [0, 1, 0], v);
        return this;
    }

    get centerZ() {
        const v = [this.bounds.center.x, this.bounds.center.y, this.bounds.center.z];
        this.plane = plane.fromNormalAndPoint(this.plane, [0, 0, 1], v);
        return this;
    }

    plane(normal, point) {
        this.plane = plane.fromNormalAndPoint(this.plane, normal, point);
        return this;
    }

    about(target) {
        this.bounds = bounds(target);
        return this;
    }

    getBaseMatrix() {
        return mat4.mirrorByPlane(mat4.create(), this.plane);
    }
}

class RotationTransform extends Transform {
    constructor(geometry, matrix) {
        super(geometry, matrix);
        this.rotation = [0, 0, 0];
    }

    xy(angle = Math.PI / 2) {
        return this.x(angle).y(angle);
    }

    xz(angle = Math.PI / 2) {
        return this.x(angle).z(angle);
    }

    yz(angle = Math.PI / 2) {
        return this.y(angle).z(angle);
    }

    xyz(angle = Math.PI / 2) {
        return this.x(angle).y(angle).z(angle);
    }

    x(angle = Math.PI / 2) {
        this.rotation[0] = angle;
        return this;
    }

    y(angle = Math.PI / 2) {
        this.rotation[1] = angle;
        return this;
    }

    z(angle = Math.PI / 2) {
        this.rotation[2] = angle;
        return this;
    }

    getBaseMatrix() {
        const yaw = this.rotation[2];
        const pitch = this.rotation[1];
        const roll = this.rotation[0];
        return mat4.fromTaitBryanRotation(mat4.create(), yaw, pitch, roll);
    }
}

class FromBoundsTranslation extends TranslationTransform {
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


class PositionTransform extends TranslationTransform {
    constructor(geometry, matrix) {
        super(geometry, matrix);
    }

    x(pos) {
        this.translation[0] = pos - this.bounds.center.x;
        return this;
    }

    y(pos) {
        this.translation[1] = pos - this.bounds.center.y;
        return this;
    }

    z(pos) {
        this.translation[2] = pos - this.bounds.center.z;
        return this;
    }

    xy(x, y) {
        return this.x(x).y(y);
    }

    xz(x, z) {
        return this.x(x).z(z);
    }

    xyz(x, y, z) {
        return this.x(x).y(y).z(z);
    }

    pos(v) {
        return this.xyz(...toVec3(v).expand());
    }

    get origin() {
        return this.xyz(0, 0, 0);
    }
}

class MoveTransform extends TranslationTransform {
    constructor(geometry, matrix) {
        super(geometry, matrix);
    }

    up(margin) {
        this.translation[1] = margin;
        return this;
    }

    down(margin) {
        this.translation[1] = -margin;
        return this;
    }

    left(margin) {
        this.translation[0] = -margin;
        return this;
    }

    right(margin) {
        this.translation[0] = margin;
        return this;
    }

    forward(margin) {
        this.translation[2] = margin;
        return this;
    }

    backward(margin) {
        this.translation[2] = -margin;
        return this;
    }

    xyz(delta) {
        this.translation = toVec3(delta).expand();
        return this;
    }

    get to() {
        return position(this.geometry, this.getMatrix());
    }
}

class ScaleTransform extends Transform {
    constructor(geometry, matrix) {
        super(geometry, matrix);
        this.scale = [1, 1, 1];
    }

    depth(factor) {
        this.scale[2] = factor;
        return this;
    }

    width(factor) {
        this.scale[0] = factor;
        return this;
    }

    height(factor) {
        this.scale[1] = factor;
        return this;
    }

    factor(factor) {
        this.scale = [factor, factor, factor];
        return this;
    }

    getBaseMatrix() {
        return mat4.fromScaling(mat4.create(), this.scale);
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
const AlignReferenceMove = ThenableAlignReference(PositionTransform);

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
const AlignReferenceMoveComposite = CompositedAlignReference(PositionTransform);

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

class GeometryGroup {
    constructor(geometries) {
        this.geometries = geometries;
    }
}

const Group = Thenable(Transform);

// const AlignAll = Composite(AlignSource(FromBoundsTranslation));
const AlignAll = AlignSourceComposite;
const MoveAll = MoveComposite;
const PositionAll = Thenable(Composite(PositionTransform));
const MirrorAll = Thenable(Composite(ReflectionTransform));
const RotateAll = Thenable(Composite(RotationTransform));
const ScaleAll = Thenable(Composite(ScaleTransform));

const Align = AlignSource(FromBoundsTranslation);
const Move = Thenable(MoveTransform);
const Position = Thenable(PositionTransform);
const Mirror = Thenable(ReflectionTransform);
const Rotate = Thenable(RotationTransform);
const Scale = Thenable(ScaleTransform);

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

function group(geometries) {
    return new Group(new GeometryGroup(geometries));
}

module.exports = {
    align: geometry => align(geometry),
    move: geometry => move(geometry),
    mirror: geometry => mirror(geometry),
    rotate: geometry => rotate(geometry),
    scale: geometry => scale(geometry),
    group
}