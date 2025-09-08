const winston = require('winston')
const config = require('config')

const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    process.env.NODE_ENV === 'production' 
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
  ),
  defaultMeta: { 
    service: 'koop-provider-pg',
    version: require('../../package.json').version 
  },
  transports: [
    new winston.transports.Console()
  ]
})

if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error'
  }))
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log'
  }))
}

function createLogger(context) {
  return {
    debug: (message, meta = {}) => logger.debug(message, { context, ...meta }),
    info: (message, meta = {}) => logger.info(message, { context, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { context, ...meta }),
    error: (message, error = null, meta = {}) => {
      const errorMeta = error ? {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      } : {}
      logger.error(message, { context, ...errorMeta, ...meta })
    }
  }
}

module.exports = { logger, createLogger }
