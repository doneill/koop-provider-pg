const {QueryFile} = require('pg-promise');
const {join: joinPath} = require('path');

module.exports = {
    geojson: {
        create: sql('createGeoJson.sql')
    }
}

function sql(file) {
    const fullPath = joinPath(__dirname, file);
    const options = {
        minify: true
    };

    const qf = new QueryFile(fullPath, options);

    if (qf.error) {
        console.error(qf.error);
    }

    return qf;
}