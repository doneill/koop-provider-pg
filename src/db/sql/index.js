const { QueryFile } = require('pg-promise')
const { join: joinPath } = require('path')
const { createLogger } = require('../../utils/logger')
const { ConfigurationError } = require('../../utils/errors')

const log = createLogger('SQLLoader')

module.exports = {
  table: {
    createGeoJson: sql('createGeoJson.sql'),
    getGeometryColumnName: sql('getGeometryColumnName.sql')
  }
}

function sql (file) {
  const fullPath = joinPath(__dirname, file)
  const options = {
    minify: true
  }

  const qf = new QueryFile(fullPath, options)

  if (qf.error) {
    const configError = new ConfigurationError(
      'Failed to load SQL file',
      { file, path: fullPath, originalError: qf.error.message }
    );
    
    log.error('Failed to load SQL file', qf.error, { file, path: fullPath });
    throw configError;
  }

  return qf
}
