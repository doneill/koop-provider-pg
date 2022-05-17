const { table: sql } = require('../sql')

class DataRepository {
  constructor (db, pgp) {
    this.db = db
    this.pgp = pgp
  }

  async getGeometryColumnName (schema, table) {
    return this.db.oneOrNone(sql.getGeometryColumnName, {
      schema: schema,
      table: table
    })
  }

  async createGeoJson (id, geom, srid, values) {
    return this.db.oneOrNone(sql.createGeoJson, {
      id: id,
      geom: geom,
      srid: srid,
      table: values
    })
  }
}

module.exports = DataRepository
