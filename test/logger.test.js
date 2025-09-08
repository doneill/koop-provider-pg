const { logger, createLogger } = require('../src/utils/logger')

describe('Logger Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('logger', () => {
    test('should be a winston logger instance', () => {
      expect(logger).toBeDefined()
      expect(logger.info).toBeInstanceOf(Function)
      expect(logger.error).toBeInstanceOf(Function)
      expect(logger.warn).toBeInstanceOf(Function)
      expect(logger.debug).toBeInstanceOf(Function)
    })

    test('should have correct default metadata', () => {
      expect(logger.defaultMeta.service).toBe('koop-provider-pg')
      expect(logger.defaultMeta.version).toBeDefined()
    })
  })

  describe('createLogger', () => {
    test('should create contextual logger with correct context', () => {
      const contextLogger = createLogger('TestContext')

      expect(contextLogger.info).toBeInstanceOf(Function)
      expect(contextLogger.error).toBeInstanceOf(Function)
      expect(contextLogger.warn).toBeInstanceOf(Function)
      expect(contextLogger.debug).toBeInstanceOf(Function)
    })

    test('should log with context metadata', () => {
      const spyInfo = jest.spyOn(logger, 'info')
      const contextLogger = createLogger('TestContext')

      contextLogger.info('Test message', { extra: 'data' })

      expect(spyInfo).toHaveBeenCalledWith('Test message', {
        context: 'TestContext',
        extra: 'data'
      })
    })

    test('should log errors with error details', () => {
      const spyError = jest.spyOn(logger, 'error')
      const contextLogger = createLogger('TestContext')
      const testError = new Error('Test error')

      contextLogger.error('Error occurred', testError, { extra: 'data' })

      expect(spyError).toHaveBeenCalledWith('Error occurred', {
        context: 'TestContext',
        error: {
          message: 'Test error',
          stack: testError.stack,
          name: 'Error'
        },
        extra: 'data'
      })
    })

    test('should handle error logging without error object', () => {
      const spyError = jest.spyOn(logger, 'error')
      const contextLogger = createLogger('TestContext')

      contextLogger.error('Error occurred', null, { extra: 'data' })

      expect(spyError).toHaveBeenCalledWith('Error occurred', {
        context: 'TestContext',
        extra: 'data'
      })
    })

    test('should handle logging without metadata', () => {
      const spyWarn = jest.spyOn(logger, 'warn')
      const contextLogger = createLogger('TestContext')

      contextLogger.warn('Warning message')

      expect(spyWarn).toHaveBeenCalledWith('Warning message', {
        context: 'TestContext'
      })
    })
  })
})