const {db} = require('./db');

function Model (koop) {}

Model.prototype.getData = function (req, callback) {
  console.log('query table: ', req.query.table)

  db.geojson.create(req.query.table)
    .then(results => {
      const geoJsonResult = results.jsonb_build_object

      if(geoJsonResult.metadata === undefined || geoJsonResult.metadata === null) {
        geoJsonResult.metadata = {}
      }

      geoJsonResult.metadata.title = "Postgres GeoJSON"
      geoJsonResult.metadata.description = `Data from Postgres PostGIS`

      callback(null, geoJsonResult)
    })
    .catch(error => { callback(error) })
}

module.exports = Model
