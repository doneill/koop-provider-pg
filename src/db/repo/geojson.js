const {geojson: sql} = require('../sql');

class GeoJsonRepository {
    constructor(db, pgp) {
        this.db = db
        this.pgp = pgp
    }

    async create(values) {
        return this.db.oneOrNone(sql.create, {
            table: +values.table
        })
    }

}

module.exports = GeoJsonRepository;