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

      return result.jsonb_build_object;
    } catch (error) {
      console.error('Error in createGeoJson:', error);
      throw error;
    }
  }
}

module.exports = DataRepository;
