const _ = require('lodash')
const { db } = require('../db')

function Model (koop) {}

Model.prototype.getData = (req, callback) => {
  const splitPath = req.params.id.split('.')
  const schema = splitPath[0]
  const table = splitPath[1]

  const id = process.env.PG_OBJECTID || 'gid'

  if (!table) callback(new Error('The "id" parameter must be in the form of "schema.table"'))

  db.data.getGeometryColumnName(schema, table)
    .then(result => {
      const geom = result.f_geometry_column

      db.data.createGeoJson(id, geom, schema + '.' + table)
        .then(result => {
          const geojson = result.jsonb_build_object

          geojson.description = 'PG Koop Feature Service'

          if (geojson.metadata === undefined || geojson.metadata === null) {
            geojson.metadata = {
              title: schema,
              name: table,
              description: 'GeoJSON from PostGIS ' + schema + '.' + table,
              idField: id,
              geometryType: _.get(geojson, 'features[0].geometry.type')
            }
          }

          callback(null, geojson)
        })
        .catch(error => {
          callback(new Error(error + ' on ' + schema + '.' + table))
          console.error(error)
        })
    })
    .catch(error => {
      callback(new Error(error + ' on getGeometryColumn(' + schema + ', ' + table + ')'))
      console.error(error)
    })
}

module.exports = Model
