const { table: sql } = require('../sql')
const { createLogger } = require('../../utils/logger')
const { DatabaseError } = require('../../utils/errors')

const log = createLogger('DataRepository')

class DataRepository {
  constructor(db, pgp) {
    this.db = db;
    this.pgp = pgp;
  }

  async getGeometryColumnName(schema, table) {
    try {
      const result = await this.db.oneOrNone(sql.getGeometryColumnName, {
        schema: schema,
        table: table,
      });

      return result;
    } catch (error) {
      const dbError = new DatabaseError(
        'Failed to query geometry column information',
        error,
        { schema, table }
      );
      
      log.error('Error in getGeometryColumnName', error, { schema, table });
      throw dbError;
    }
  }

  async createGeoJson(id, geom, srid, values, limit, offset) {
    try {
      const result = await this.db.oneOrNone(sql.createGeoJson, {
        id: id,
        geom: geom,
        srid: srid,
        table: values,
        limit: limit,
        offset: offset
      });

      return result.jsonb_build_object;
    } catch (error) {
      const dbError = new DatabaseError(
        'Failed to create GeoJSON from PostGIS data',
        error,
        { id, geom, srid, table: values, limit, offset }
      );
      
      log.error('Error in createGeoJson', error, { id, geom, srid, table: values, limit, offset });
      throw dbError;
    }
  }
}

module.exports = DataRepository;
