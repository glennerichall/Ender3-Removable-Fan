const {union, subtract} = require('@jscad/modeling').booleans;
const {transform} = require('./libs/transforms');
const {path2} = require('@jscad/modeling').geometries;
const {vectorText} = require('@jscad/modeling').text;

const {align, mirror, rotate, move, group} = require("./libs/transforms");
const {e_plate_def, tolerance} = require("./src/definitions");
const plate = require('./src/plate');
const block = require('./src/block');
const pogo = require("./vitamins/pogo");
const blower = require('./src/blower');
const heatblock = require('./vitamins/heatblock');
const eplate = require('./vitamins/eplate');
const {bounds} = require("./libs/utils");
const {unbox, box,} = require('./libs/geometry');
const {getOptions} = require("./libs/configs");

const segmentToPath = (segment) => path2.fromPoints({close: false}, segment);
const paths = outlines => outlines.map((segment) => segmentToPath(segment));
const createText = text => paths(vectorText(text));

const getParameterDefinitions = () => {
    return [
        {
            name: 'print', type: 'choice', caption: 'Print:', values: ['preview', 'block', 'plate', 'cap', 'duct', 'all',],
            captions: ['Preview', 'Block', 'Plate', 'Cap', 'Duct', 'All',], initial: 'preview'
        },

        {name: 'hasFan', type: 'checkbox', checked: true, caption: 'Has Fan:'},
        {name: 'hasBlowers', type: 'checkbox', checked: true, caption: 'Has blowers:'},

        {name: 'Blower', type: 'group', caption: 'Blower'},

        {name: 'blower_margins_x', type: 'float', initial: block.getConstants().blower.margins.x, caption: 'Distance from fan'},
        {name: 'blower_margins_y', type: 'float', initial: block.getConstants().blower.margins.y, caption: 'Margin Z'},
        {name: 'blower_margins_z', type: 'float', initial: block.getConstants().blower.margins.z, caption: 'Distance from heatblock plate'},

        {name: 'Duct', type: 'group', caption: 'Blower duct exit'},

        // the width and heights are inverted since there is a rotation for the final preview
        {name: 'blower_nozzle_exit_width', type: 'float', initial: block.getConstants().blower.nozzle_exit.width, caption: 'Height'},
        {name: 'blower_nozzle_exit_height', type: 'float', initial: block.getConstants().blower.nozzle_exit.height, caption: 'width'},
        {name: 'blower_nozzle_exit_margin_x', type: 'float', initial: block.getConstants().blower.nozzle_exit.margin_x, caption: 'Distance to heat block'},
        {name: 'blower_nozzle_exit_offset_y', type: 'float', initial: block.getConstants().blower.nozzle_exit.offset.y, caption: 'Distance to nozzle bottom'},

        {name: 'Other', type: 'group', caption: 'Other options'},
        {name: 'showPrint', type: 'checkbox', checked: true, caption: 'Show printable:'},
        {name: 'showVitamins', type: 'checkbox', checked: true, caption: 'Show vitamins:'},
        {name: 'enableDebug', type: 'checkbox', checked: false, caption: 'Debug enabled:'},


    ]
}

function loadVitamins() {
    return [
        heatblock.create(),
        eplate.create(),
        pogo.create(),
        blower.create()
    ];
}


const main = (params) => {
    console.clear();

    getOptions().debugEnabled = params.enableDebug;

    const helpers = {};

    const plate_def = plate.getConstants();

    let vitamins = loadVitamins();
    let [
        _heatblock_,
        _eplate_,
        _pogo_,
        _blower_] = vitamins;

    let backPlate = plate.create({helpers});
    _pogo_ = helpers.placePogo(_pogo_);

    [backPlate, _pogo_] = align(backPlate).top.left
        .to(vitamins[1]).top.left
        .then.move.forward(e_plate_def.depth).up(plate_def.base.offset.y)
        .applyToTargetAnd(_pogo_);


    let blockPogo = mirror(_pogo_).front.apply();

    const block_defs = block.getConstants(plate_def);
    block_defs.blower.margins.x = params.blower_margins_x;
    block_defs.blower.margins.y = params.blower_margins_y;
    block_defs.blower.margins.z = params.blower_margins_z;

    block_defs.blower.nozzle_exit.margin_x = params.blower_nozzle_exit_margin_x;
    block_defs.blower.nozzle_exit.offset.y = params.blower_nozzle_exit_offset_y;

    block_defs.blower.nozzle_exit.width = params.blower_nozzle_exit_width;
    block_defs.blower.nozzle_exit.height = params.blower_nozzle_exit_height;


    let [fanBlock, ...others] = block.create(
        _heatblock_,
        _eplate_,
        blockPogo, {defs: block_defs, helpers, ...params});

    const mat = align(fanBlock).back.to(backPlate).front
        .then.move.forward(tolerance).getMatrix();

    if (others.length >= 1) {
        [fanBlock, ...others] = transform(mat, fanBlock, ...others)
    } else {
        fanBlock = transform(mat, fanBlock);
    }

    if (params.showVitamins) {
        let rightBlower = helpers.placeBlowerRight(_blower_);
        let leftBlower = helpers.placeBlowerLeft(_blower_);

        vitamins = [
            _heatblock_,
            _eplate_,
            _pogo_,
            blockPogo
        ];

        if (params.hasBlowers) {
            [rightBlower, leftBlower] = transform(mat, rightBlower, leftBlower);
            vitamins.push(rightBlower, leftBlower,);
        }
    } else {
        vitamins = [];
    }


    switch (params.print) {
        case 'all':
            return [backPlate, fanBlock, ...others];
        case 'preview':
            let res = params.showPrint ? [backPlate, fanBlock, ...vitamins, ...others] : vitamins;
            res = group(res).then.rotate.x()
                .then.align.back
                .toSelf.centerZ.apply();
            return res;
        case 'block':
            return fanBlock;
        case 'plate':
            return backPlate;
        case 'duct':
            return others[0];
        case 'cap':
            return group(createText('Cap is not ready'))
                .then.move.to.origin.apply();
    }
    return group(createText('Dup'))
        .then.move.to.origin.apply();
}

function randomColor() {
    return [Math.random(), Math.random(), Math.random(), 0.8];
}

function unpackDebug(res) {
    console.log(res)
    res = box(res);
    const debug = res.findDebug().map(x => x.colorize(randomColor())).reverse();
    res = unbox(res);
    if (!Array.isArray(res)) res = [res];
    return res.concat(unbox(debug));
}

module.exports = {
    main: params => unpackDebug(main(params)),
    getParameterDefinitions
}
