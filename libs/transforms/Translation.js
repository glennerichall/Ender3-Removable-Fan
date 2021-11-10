const {Transform} = require("./Transform");
const {mat4, plane} = require('@jscad/modeling').maths;

class Translation extends Transform {
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

module.exports = {
    Translation
}