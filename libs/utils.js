const {measureBoundingBox} = require('@jscad/modeling').measurements;
const {translate} = require('@jscad/modeling').transforms;
const {vec3} = require('@jscad/modeling').maths;


function expand({width, height, depth, x, y, z}) {
    return width !== undefined ?
        depth !== undefined ? [width, height, depth] : [width, height] :
        z !== undefined ? [x, y, z] : [x, y];
}

function dimensionsForBounds(
    {top, left, front, back, bottom, right}
) {
    const depth = front - back;
    const width = right - left;
    const height = top - bottom;
    const center = {
        x: left + width / 2,
        y: bottom + height / 2,
        z: back + depth / 2
    };
    return {
        top, left, bottom, right, front,
        back, depth, width, height, center
    };
}

const minmax = (...values) => {
    const max = Math.max(...values);
    const min = Math.min(...values);
    return [min, max];
}

function boundsForMeasurments(measurements) {
    let top = measurements[1][1];
    let left = measurements[0][0];
    let right = measurements[1][0];
    let bottom = measurements[0][1];
    let front = measurements[1][2];
    let back = measurements[0][2];

    // when in transforms of object there is a mirror,
    // measureBoundingBox does not return the correct bounds.
    // so readjust with min,max values of bounds.
    [bottom, top] = minmax(bottom, top);
    [left, right] = minmax(left, right);
    [back, front] = minmax(back, front);

    return dimensionsForBounds({top, left, front, back, bottom, right});
}

function combine(a, b) {
    const [left, right] = minmax(a.left, b.left, a.right, b.right);
    const [bottom, top] = minmax(a.bottom, b.bottom, a.top, b.top);
    const [back, front] = minmax(a.back, b.back, a.front, b.front);
    return {top, left, front, back, bottom, right};
}

function bounds(geometry) {
    if (Array.isArray(geometry)) {
        if (geometry.length >= 1) {
            let current = bounds(geometry[0]);
            for (let i = 1; i < geometry.length; i++) {
                current = combine(current, bounds(geometry[i]));
            }
            return dimensionsForBounds(current);
        }
        return null;
    } else if (geometry.isBoxed) {
        return geometry.getBounds();
    }
    const measurements = measureBoundingBox(geometry);
    return boundsForMeasurments(measurements);

}

function toVec2(v) {
    return typeof v === 'number' ? new Vector2({x: v, y: v}) : Array.isArray(v) ?
        new Vector2({x: v[0], y: v[1]}) : new Vector2(v);
}

function toVec3(v) {
    return typeof v === 'number' ? new Vector3({x: v, y: v, z: v}) : Array.isArray(v) ?
        new Vector3({x: v[0], y: v[1], z: v[2]}) : new Vector3(v);
}


class Vector2 {
    constructor({x, y, width, height, top, left, ...rest}) {
        this.x = x ?? width ?? left ?? 0;
        this.y = y ?? height ?? top ?? 0;
        for (let key in rest) {
            this[key] = rest[key];
        }
    }

    add(v) {
        v = toVec2(v);
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    sub(v) {
        v = toVec2(v);
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    invert() {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    }

    mirrorY() {
        this.x = -this.x;
        return this;
    }

    mirrorX() {
        this.y = -this.y;
        return this;
    }

    elementwiseDiv(v) {
        v = toVec2(v);
        this.x /= v.x;
        this.y /= v.y;
        return this;
    }

    clone() {
        return new Vector2(this);
    }

    expand() {
        return expand(this);
    }
}

class Vector3 {
    constructor({x, y, z, width, height, depth, top, left, front}) {
        this.x = x ?? width ?? left ?? 0;
        this.y = y ?? height ?? top ?? 0;
        this.z = z ?? depth ?? front ?? 0;
    }


    add(v) {
        v = toVec3(v);
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    sub(v) {
        v = toVec3(v);
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }

    elementwiseMult(v) {
        v = toVec3(v);
        this.x *= v.x;
        this.y *= v.y;
        this.z *= v.z;
        return this;
    }

    invert() {
        return this.elementwiseMult(-1);
    }

    clone() {
        return new Vector3(this);
    }

    expand() {
        return expand(this);
    }

    rotateY(angle) {
        const v = vec3.rotateY(vec3.create(), this.expand(), [0, 0, 0], angle);
        this.x = v[0];
        this.y = v[1];
        this.z = v[2];
        return this;
    }

    angle(v) {
        return vec3.angle(this.expand(), toVec3(v).expand());
    }
}

function lin(a, b, t) {
    return (b - a) * t + a;
}

function point_on_ellipse(a, b, theta) {
    return {
        x: a * Math.cos(theta),
        y: b * Math.sin(theta)
    };
}

function ellipse_path_2d(a, b, t0, t1, steps = 100) {
    const res = new Array(steps);
    for (let i = 0, t = 0; i < steps; i++, t = i / (steps - 1)) {
        res[i] = point_on_ellipse(a, b, lin(t0, t1, t));
    }
    return res;
}

module.exports = {
    expand,
    bounds,
    Vector2,
    Vector3,
    toVec3,
    toVec2,
    lin,
    ellipse_path_2d,
    point_on_ellipse
}