const config = require('config')

var port = config.db.port

test('Test port set to default', () => {
  expect(port).toBe(5432)
})
