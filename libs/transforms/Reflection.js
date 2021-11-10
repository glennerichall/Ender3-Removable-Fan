const {Transform} = require("./Transform");
const {bounds} = require("../utils");
const {mat4, plane} = require('@jscad/modeling').maths;

class Reflection extends Transform {
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


module.exports = {
    Reflection
}