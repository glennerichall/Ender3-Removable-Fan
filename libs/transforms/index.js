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
const {FromBoundsTranslation} = require('./FromBoundsTranslation');
const {AlignReference} = require('./AlignReference');
const {Composite} = require('./Composite');

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