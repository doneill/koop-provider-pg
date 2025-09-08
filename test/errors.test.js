const { ValidationError, DataNotFoundError, DatabaseError, ConfigurationError } = require('../src/utils/errors')

describe('Custom Error Classes', () => {
  describe('ValidationError', () => {
    test('should create ValidationError with correct properties', () => {
      const details = { field: 'id', value: 'invalid' }
      const error = new ValidationError('Invalid input', details)

      expect(error.name).toBe('ValidationError')
      expect(error.message).toBe('Invalid input')
      expect(error.statusCode).toBe(400)
      expect(error.details).toEqual(details)
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(ValidationError)
    })

    test('should work without details', () => {
      const error = new ValidationError('Invalid input')

      expect(error.details).toEqual({})
    })
  })

  describe('DataNotFoundError', () => {
    test('should create DataNotFoundError with correct properties', () => {
      const details = { schema: 'test', table: 'missing' }
      const error = new DataNotFoundError('Table not found', details)

      expect(error.name).toBe('DataNotFoundError')
      expect(error.message).toBe('Table not found')
      expect(error.statusCode).toBe(404)
      expect(error.details).toEqual(details)
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(DataNotFoundError)
    })
  })

  describe('DatabaseError', () => {
    test('should create DatabaseError with original error', () => {
      const originalError = new Error('Connection failed')
      const details = { query: 'SELECT * FROM test' }
      const error = new DatabaseError('Database operation failed', originalError, details)

      expect(error.name).toBe('DatabaseError')
      expect(error.message).toBe('Database operation failed')
      expect(error.statusCode).toBe(500)
      expect(error.originalError).toBe(originalError)
      expect(error.details).toEqual(details)
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(DatabaseError)
    })
  })

  describe('ConfigurationError', () => {
    test('should create ConfigurationError with correct properties', () => {
      const details = { file: 'config.json', missing: true }
      const error = new ConfigurationError('Configuration file missing', details)

      expect(error.name).toBe('ConfigurationError')
      expect(error.message).toBe('Configuration file missing')
      expect(error.statusCode).toBe(500)
      expect(error.details).toEqual(details)
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(ConfigurationError)
    })
  })
})