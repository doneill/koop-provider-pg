const promise = require('bluebird');
const config = require('config')

const pgPromise = require('pg-promise')
const {Data} = require('./repo');

// Database connection details;
const cn = {
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password
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