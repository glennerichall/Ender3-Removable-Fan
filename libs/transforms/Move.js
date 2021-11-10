const {Translation} = require("./Translation");
const {toVec3} = require("../utils");
const {Position} = require("./Position");



class Move extends Translation {
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
        this.translation = toVec3(delta).toArray();
        return this;
    }

}

module.exports = {
    Move
};