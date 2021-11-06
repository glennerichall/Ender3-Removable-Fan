const {rectangle, circle} = require('@jscad/modeling').primitives;
const {expand, align_tl2tl, Vector2} = require('./utils');
const {union} = require('@jscad/modeling').booleans;
const {colorize} = require('@jscad/modeling').colors;
const {mat4, plane} = require('@jscad/modeling').maths;
const {poly3} = require('@jscad/modeling').geometries;

// see https://github.com/jscad/OpenJSCAD.org/issues/945
const applyTransforms = (geometry) => {
    if (mat4.isIdentity(geometry.transforms)) return geometry

    // apply transforms to each polygon
    // const isMirror = mat4.isMirroring(geometry.transforms)
    // TBD if (isMirror) newvertices.reverse()
    geometry.polygons = geometry.polygons.map((polygon) => poly3.transform(geometry.transforms, polygon))
    geometry.transforms = mat4.create()
    return geometry
}

function roundRect({
                       width,
                       height,
                       top_left_radius,
                       top_right_radius,
                       bottom_right_radius,
                       bottom_left_radius,
                       size,
                       radius = 0,
                   }) {
    width = width ?? size;
    height = height ?? size;

    top_left_radius = top_left_radius ?? radius;
    top_right_radius = top_right_radius ?? radius;
    bottom_right_radius = bottom_right_radius ?? radius;
    bottom_left_radius = bottom_left_radius ?? radius;

    const max_left = Math.max(top_left_radius, bottom_left_radius);
    const max_right = Math.max(top_right_radius, bottom_right_radius);

    const max_top = Math.max(top_left_radius, top_right_radius);
    const max_bottom = Math.max(bottom_right_radius, bottom_left_radius);

    const w = width - max_left - max_right;
    const h = height - max_top - max_bottom;

    const center = rectangle({
        size: [w, h],
        center: [(w - width) / 2 + max_left, (h - height) / 2 + max_bottom]
    });

    const tl = top_left_radius ? circle({
        radius: top_left_radius,
        center: [-width / 2 + top_left_radius, height / 2 - top_left_radius]
    }) : null;

    const bl = bottom_left_radius ? circle({
        radius: bottom_left_radius,
        center: [-width / 2 + bottom_left_radius, -height / 2 + bottom_left_radius]
    }) : null;

    const tr = top_right_radius ? circle({
        radius: top_right_radius,
        center: [width / 2 - top_right_radius, height / 2 - top_right_radius]
    }) : null;

    const br = bottom_right_radius ? circle({
        radius: bottom_right_radius,
        center: [width / 2 - bottom_right_radius, -height / 2 + bottom_right_radius]
    }) : null;

    const hl = height - top_left_radius - bottom_left_radius;
    const left = rectangle({
        size: [max_left, hl],
        center: [(max_left - width) / 2, (hl - height) / 2 + max_bottom]
    });

    const hr = height - top_right_radius - bottom_right_radius;
    const right = rectangle({
        size: [max_right, hr],
        center: [(width - max_right) / 2, (hr - height) / 2 + max_bottom]
    });

    const wt = width - top_left_radius - top_right_radius;
    const top = rectangle({
        size: [wt, max_top],
        center: [(wt - width) / 2 + max_left, (height - max_top) / 2]
    });

    const wb = width - bottom_left_radius - bottom_right_radius;
    const bottom = rectangle({
        size: [wb, max_bottom],
        center: [(wb - width) / 2 + max_bottom, (max_bottom - height) / 2]
    });

    const parts = [tl, bl, tr, br,
        left, top, bottom, right].filter(x => !!x);
    return union(center, ...parts);
}

module.exports = {
    roundRect,
    applyTransforms
}