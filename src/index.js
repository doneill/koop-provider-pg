const provider = {
  type: 'provider',
  name: 'pg',
  hosts: false, // if true, also adds disableIdParam
  disableIdParam: true, // if true, adds to path and req.params
  Controller: require('./controller'),
  Model: require('./model'),
  routes: require('./routes'),
  version: require('../package.json').version
}

module.exports = provider
