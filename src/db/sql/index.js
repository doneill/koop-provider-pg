const {QueryFile} = require('pg-promise');
const {join: joinPath} = require('path');

module.exports = {
    geojson: {
        create: sql('createGeoJson.sql')
    }
}

// Helper for linking to external query files;
function sql(file) {
    const fullPath = joinPath(__dirname, file); // generating full path;
    const options = {
        minify: true
    };

    const qf = new QueryFile(fullPath, options);

    if (qf.error) {
        console.error(qf.error);
    }

    return qf;
}