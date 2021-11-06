const {union, subtract} = require('@jscad/modeling').booleans;
const {transform} = require('@jscad/modeling').transforms;
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
const {unbox} = require('./libs/geometry');

const segmentToPath = (segment) => path2.fromPoints({close: false}, segment);
const paths = outlines => outlines.map((segment) => segmentToPath(segment));
const createText = text => paths(vectorText(text));

const getParameterDefinitions = () => {
    return [
        {
            name: 'print', type: 'choice', caption: 'Print:', values: ['preview', 'block', 'plate', 'cap', 'duct', 'all',],
            captions: ['Preview (shows vitamins)', 'Block', 'Plate', 'Cap', 'Duct', 'All',], initial: 'preview'
        },

        {name: 'hasFan', type: 'checkbox', checked: true, caption: 'Has Fan:'},
        {name: 'hasBlowers', type: 'checkbox', checked: true, caption: 'Has blowers:'},

        {name: 'showPrint', type: 'checkbox', checked: true, caption: 'Show printable:'},
        {name: 'showVitamins', type: 'checkbox', checked: true, caption: 'Show vitamins:'},


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
    let [fanBlock, ...others] = block.create(
        _heatblock_,
        _eplate_,
        blockPogo, {helpers, ...params});

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
            const res = params.showPrint ? [backPlate, fanBlock, ...vitamins, ...others] : vitamins;
            return group(res).then.rotate.x()
                .then.align.back
                .toSelf.centerZ.apply();
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

module.exports = {
    main: params => unbox(main(params)),
    getParameterDefinitions
}
