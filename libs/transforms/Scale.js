const {Transform} = require("./Transform");
const {mat4, plane} = require('@jscad/modeling').maths;

class Scale extends Transform {
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


module.exports = {Scale};