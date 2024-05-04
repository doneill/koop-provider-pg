const _ = require('lodash')
const { db } = require('../db')

class Model {
  constructor() { }
  async getData(req, callback) {
    try {
      const splitPath = req.params.id.split('.');
      const schema = splitPath[0];
      const table = splitPath[1];

      const id = process.env.PG_OBJECTID || 'gid';

      if (!table)
        throw new Error('The "id" parameter must be in the form of "schema.table"');

      const result = await db.data.getGeometryColumnName(schema, table);

      if (!result) {
        throw new Error('Invalid result from getGeometryColumnName');
      }
      
      const geom = result.f_geometry_column;
      const srid = result.srid;

      const geojsonResult = await db.data.createGeoJson(id, geom, srid, schema + '.' + table);
      let geojson = geojsonResult.jsonb_build_object;

      geojson.description = 'PG Koop Feature Service';

      if (!geojson.metadata) {
        geojson.metadata = {
          title: schema,
          name: schema + '.' + table,
          description: 'This feature layer generated with Koop PostGIS Provider (koop-provider-pg), for more information visit https://github.com/doneill/koop-provider-pg',
          idField: id,
          geometryType: _.get(geojson, 'features[0].geometry.type'),
        };
      }

      callback(null, geojson);
    } catch (error) {
      callback(error);
      console.error(error);
    }
  }
}


module.exports = Model
