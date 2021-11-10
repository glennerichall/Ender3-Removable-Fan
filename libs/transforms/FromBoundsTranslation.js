const {Translation} = require("./Translation");

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


module.exports = {FromBoundsTranslation};