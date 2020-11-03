const test = require('tape')
var config = require('config')
var port = config.db.port

test('Test port set to default', function (t) {
  t.plan(1)
  t.equal(port, 5432)
})
