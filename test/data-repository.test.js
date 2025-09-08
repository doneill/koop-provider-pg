const DataRepository = require('../src/db/repo/data')
const { DatabaseError } = require('../src/utils/errors')

// Mock dependencies
jest.mock('../src/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}))

jest.mock('../src/db/sql', () => ({
  table: {
    getGeometryColumnName: 'SELECT * FROM geometry_columns WHERE...',
    createGeoJson: 'SELECT jsonb_build_object(...)'
  }
}))

describe('DataRepository Error Handling', () => {
  let repository
  let mockDb
  let mockPgp

  beforeEach(() => {
    mockDb = {
      oneOrNone: jest.fn()
    }
    mockPgp = {}
    repository = new DataRepository(mockDb, mockPgp)
    jest.clearAllMocks()
  })

  describe('getGeometryColumnName', () => {
    test('should return geometry column info successfully', async () => {
      const expectedResult = {
        f_geometry_column: 'geom',
        srid: 4326
      }
      mockDb.oneOrNone.mockResolvedValue(expectedResult)

      const result = await repository.getGeometryColumnName('public', 'test_table')

      expect(result).toEqual(expectedResult)
      expect(mockDb.oneOrNone).toHaveBeenCalledWith(
        expect.any(String),
        { schema: 'public', table: 'test_table' }
      )
    })

    test('should wrap database errors as DatabaseError', async () => {
      const dbError = new Error('Connection failed')
      mockDb.oneOrNone.mockRejectedValue(dbError)

      await expect(repository.getGeometryColumnName('public', 'test_table'))
        .rejects.toThrow(DatabaseError)

      try {
        await repository.getGeometryColumnName('public', 'test_table')
      } catch (error) {
        expect(error.message).toBe('Failed to query geometry column information')
        expect(error.originalError).toBe(dbError)
        expect(error.details).toEqual({
          schema: 'public',
          table: 'test_table'
        })
        expect(error.statusCode).toBe(500)
      }
    })

    test('should handle null results', async () => {
      mockDb.oneOrNone.mockResolvedValue(null)

      const result = await repository.getGeometryColumnName('public', 'missing_table')

      expect(result).toBeNull()
    })
  })

  describe('createGeoJson', () => {
    test('should return GeoJSON successfully', async () => {
      const expectedGeoJson = {
        type: 'FeatureCollection',
        features: []
      }
      mockDb.oneOrNone.mockResolvedValue({
        jsonb_build_object: expectedGeoJson
      })

      const result = await repository.createGeoJson(
        'gid', 'geom', 4326, 'public.test_table', 1000, 0
      )

      expect(result).toEqual(expectedGeoJson)
      expect(mockDb.oneOrNone).toHaveBeenCalledWith(
        expect.any(String),
        {
          id: 'gid',
          geom: 'geom',
          srid: 4326,
          table: 'public.test_table',
          limit: 1000,
          offset: 0
        }
      )
    })

    test('should wrap database errors as DatabaseError', async () => {
      const dbError = new Error('Query execution failed')
      mockDb.oneOrNone.mockRejectedValue(dbError)

      await expect(repository.createGeoJson(
        'gid', 'geom', 4326, 'public.test_table', 1000, 0
      )).rejects.toThrow(DatabaseError)

      try {
        await repository.createGeoJson('gid', 'geom', 4326, 'public.test_table', 1000, 0)
      } catch (error) {
        expect(error.message).toBe('Failed to create GeoJSON from PostGIS data')
        expect(error.originalError).toBe(dbError)
        expect(error.details).toEqual({
          id: 'gid',
          geom: 'geom',
          srid: 4326,
          table: 'public.test_table',
          limit: 1000,
          offset: 0
        })
        expect(error.statusCode).toBe(500)
      }
    })

    test('should handle various parameter types', async () => {
      mockDb.oneOrNone.mockResolvedValue({ jsonb_build_object: {} })

      await repository.createGeoJson('id', 'the_geom', 3857, 'schema.table', 5000, 100)

      expect(mockDb.oneOrNone).toHaveBeenCalledWith(
        expect.any(String),
        {
          id: 'id',
          geom: 'the_geom',
          srid: 3857,
          table: 'schema.table',
          limit: 5000,
          offset: 100
        }
      )
    })
  })

  describe('constructor', () => {
    test('should initialize with db and pgp instances', () => {
      const repo = new DataRepository(mockDb, mockPgp)

      expect(repo.db).toBe(mockDb)
      expect(repo.pgp).toBe(mockPgp)
    })
  })
})