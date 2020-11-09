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

  async createGeoJson (id, geom, values) {
    console.log('schema.table:', values)
    return this.db.oneOrNone(sql.createGeoJson, {
      id: id,
      geom: geom,
      table: values
    })
  }
}

module.exports = DataRepository
