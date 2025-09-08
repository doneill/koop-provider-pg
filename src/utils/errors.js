class ValidationError extends Error {
  constructor(message, details = {}) {
    super(message)
    this.name = 'ValidationError'
    this.statusCode = 400
    this.details = details
  }
}

class DataNotFoundError extends Error {
  constructor(message, details = {}) {
    super(message)
    this.name = 'DataNotFoundError'
    this.statusCode = 404
    this.details = details
  }
}

class DatabaseError extends Error {
  constructor(message, originalError, details = {}) {
    super(message)
    this.name = 'DatabaseError'
    this.statusCode = 500
    this.originalError = originalError
    this.details = details
  }
}

class ConfigurationError extends Error {
  constructor(message, details = {}) {
    super(message)
    this.name = 'ConfigurationError'
    this.statusCode = 500
    this.details = details
  }
}

module.exports = {
  ValidationError,
  DataNotFoundError,
  DatabaseError,
  ConfigurationError
}