const {Transform} = require("./Transform");
const {mat4, plane} = require('@jscad/modeling').maths;

class Rotation extends Transform {
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


module.exports = {Rotation};