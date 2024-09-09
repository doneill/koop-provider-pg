const { table: sql } = require('../sql');

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

      if (!result || !result.f_geometry_column || !result.srid) {
        throw new Error('Invalid result from getGeometryColumnName');
      }
      return result;
    } catch (error) {
      console.error('Error in getGeometryColumnName:', error);
      throw error;
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

      if (!result || !result.jsonb_build_object) {
        console.error('Unexpected result structure:', result);
        throw new Error('Database query returned unexpected result structure');
      }

      return result.jsonb_build_object;
    } catch (error) {
      console.error('Error in createGeoJson:', error);
      throw error;
    }
  }
}

module.exports = DataRepository;
