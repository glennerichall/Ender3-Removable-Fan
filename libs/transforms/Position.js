const {Translation} = require("./Translation");
const {toVec3} = require("../utils");

class Position extends Translation {
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
        return this.xyz(...toVec3(v).toArray());
    }

    get origin() {
        return this.xyz(0, 0, 0);
    }
}

module.exports = {Position};