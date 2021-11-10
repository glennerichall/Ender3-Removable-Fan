const {bounds} = require("../utils");
const {mat4, plane} = require('@jscad/modeling').maths;
const {transform} = require('@jscad/modeling').transforms;

function multiplyMatrices(m1, m2) {
    return mat4.multiply(mat4.create(), m1, m2);
}

function applyTransform(matrix, ...geometries) {
    const tr = geometries.map(geometry => {
        if (geometry.isBoxed) {
            return geometry.transform(matrix);
        } else {
            return transform(matrix, geometry);
        }
    });
    return tr.length === 1 ? tr[0] : tr;
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
        return this.applyTransform(this.getMatrix(), ...args);
    }

    multiplyMatrices(m1, m2) {
        return multiplyMatrices(m1, m2);
    }

    getBounds(geometry) {
        return bounds(geometry);
    }

    applyTransform(matrix, ...geometries) {
        return applyTransform(matrix, ...geometries);
    }
}

module.exports = {
    Transform,
    multiplyMatrices,
    applyTransform
};