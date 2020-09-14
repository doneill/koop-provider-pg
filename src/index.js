const pg = {
  type: 'provider',
  name: 'pg',
  hosts: false, // if true, also adds disableIdParam
  disableIdParam: false, // if true, adds to path and req.params
  Model: require('./model'),
  version: require('../package.json').version
}

module.exports = pg
