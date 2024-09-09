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
      const pgLimit = process.env.PG_LIMIT || 10000000;

      if (!table)
        throw new Error('The "id" parameter must be in the form of "schema.table"');

      const geomColumnName = await db.data.getGeometryColumnName(schema, table);
      if (!geomColumnName || !geomColumnName.f_geometry_column || !geomColumnName.srid) {
        console.log(`Table ${schema}.${table} does not have a geometry column.`);
        return callback(null, {
          type: 'FeatureCollection',
          features: [],
          metadata: {
            title: schema,
            name: schema + '.' + table,
            description: 'This table does not contain spatial data.',
            geometryType: null
          }
        });
      }
      
      const geom = geomColumnName.f_geometry_column;
      const srid = geomColumnName.srid;
      const limit = parseInt(pgLimit);
      const offset = 0;

      const geojson = await db.data.createGeoJson(id, geom, srid, schema + '.' + table, limit, offset);
      
      if (!geojson || typeof geojson !== 'object' || !geojson.type || !geojson.features) {
        console.log(`Unexpected result from createGeoJson.`);
        return callback(null, {
          type: 'FeatureCollection',
          features: [],
          metadata: {
            title: schema,
            name: schema + '.' + table,
            description: 'no-data',
            geometryType: null
          }
        });
      }

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
      console.error('Error in getData:', error);
      callback(error);
    }
  }
}

module.exports = Model
