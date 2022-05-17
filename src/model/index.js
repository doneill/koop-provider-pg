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
      const srid = result.srid

      db.data.createGeoJson(id, geom, srid, schema + '.' + table)
        .then(result => {
          const geojson = result.jsonb_build_object

          geojson.description = 'PG Koop Feature Service'

          if (geojson.metadata === undefined || geojson.metadata === null) {
            geojson.metadata = {
              title: schema,
              name: schema + '.' + table,
              description: 'This feature layer generated with Koop PostGIS Provider (koop-provider-pg), for more information visit https://github.com/doneill/koop-provider-pg',
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
