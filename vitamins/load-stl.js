const stlDeserializer = require('@jscad/stl-deserializer')
const fs = require('fs');

function loadStl(file) {
    const rawData = fs.readFileSync(`Ender3-Removable-Fan/vitamins/stl/${file}.stl`);
    const geometry = stlDeserializer.deserialize({output: 'geometry'}, rawData);
    return geometry;
}

module.exports = loadStl;