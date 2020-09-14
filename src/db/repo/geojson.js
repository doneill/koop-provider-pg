const {geojson: sql} = require('../sql');

class GeoJsonRepository {
    constructor(db, pgp) {
        this.db = db
        this.pgp = pgp
    }

    async create(values) {
        console.log('schema.table:', values)
        return this.db.oneOrNone(sql.create, {
            table: values
        })
    }

}

module.exports = GeoJsonRepository;