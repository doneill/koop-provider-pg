const promise = require('bluebird');
const config = require('config')

const pgPromise = require('pg-promise')
const {Data} = require('./repo');

// Database connection details;
const cn = {
    host: process.env.HOST || config.db.host,
    port: process.env.PORT || config.db.port,
    database: process.env.DATABASE || config.db.database,
    user: process.env.PG_USER || config.db.user,
    password: process.env.PG_PASSWORD || config.db.password
}

const initOptions = {
    promiseLib: promise,

    extend(obj, dc) {
        obj.data = new Data(obj, pgp)
    }
}

// Initializing the library:
const pgp = pgPromise(initOptions);
// Creating the database instance:
const db = pgp(cn)

module.exports = {db, pgp};