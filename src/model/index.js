const _ = require('lodash')
const { db } = require('../db')

function Model (koop) {}

Model.prototype.getData = function (req, callback) {
  const splitPath = req.params.id.split('.')
  const schema = splitPath[0]
  const table = splitPath[1]

  if (!table) callback(new Error('The "id" parameter must be in the form of "schema.table"'))

  db.data.createGeoJson(schema + '.' + table)
    .then(result => {
      const geojson = result.jsonb_build_object

      if (geojson.metadata === undefined || geojson.metadata === null) {
        geojson.metadata = {}
      }

      geojson.metadata.title = geojson.metadata.name = schema
      geojson.metadata.description = 'GeoJSON from PostGIS ' + schema + '.' + table
      geojson.metadata.idField = process.env.PG_OBJECTID || ''
      geojson.metadata.geometryType = _.get(geojson, 'features[0].geometry.type')

      callback(null, geojson)
    })
    .catch(error => {
      callback(new Error(error + ' on ' + schema + '.' + table))
      console.error(error)
    })
}

module.exports = Model
