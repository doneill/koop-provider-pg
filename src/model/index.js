const {db} = require('../db');

function Model (koop) {}

Model.prototype.getData = function (req, callback) {
  console.log('query table: ', req.query.f)

  db.geojson.create(req.query.f)
    .then(result => {
      const geoJsonResult = result.jsonb_build_object

      if(geoJsonResult.metadata === undefined || geoJsonResult.metadata === null) {
        geoJsonResult.metadata = {}
      }

      geoJsonResult.metadata.title = "PostGIS Data"
      geoJsonResult.metadata.description = "Provided by koop-provider-pg"
      geoJsonResult.metadata.idField = "objectid"

      callback(null, geoJsonResult)
    })
    .catch(error => { callback(error) })
}

module.exports = Model