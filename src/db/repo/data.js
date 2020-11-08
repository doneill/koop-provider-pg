const { geojson: sql } = require('../sql')

class DataRepository {
  constructor (db, pgp) {
    this.db = db
    this.pgp = pgp
  }

  async createGeoJson (id, values) {
    console.log('schema.table:', values)
    return this.db.oneOrNone(sql.createGeoJson, {
      id: id,
      table: values
    })
  }
}

module.exports = DataRepository
