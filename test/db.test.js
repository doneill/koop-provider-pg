const config = require('config')
const db = require('../src/db')

var port = config.db.port

test('Test port set to default', () => {
  expect(port).toBe(5432)
})
