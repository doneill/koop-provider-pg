const {
  quoteIdentifier,
  parseWhereClause,
  parseObjectIds,
  parseSpatialFilter,
  parseOrderByFields,
  buildQueryOptions
} = require('../src/utils/queryBuilder')
const { ValidationError } = require('../src/utils/errors')

describe('queryBuilder', () => {
  describe('quoteIdentifier', () => {
    test('quotes valid SQL identifiers', () => {
      expect(quoteIdentifier('dor_parcel')).toBe('"dor_parcel"')
      expect(quoteIdentifier('_id_1')).toBe('"_id_1"')
    })

    test('rejects invalid SQL identifiers', () => {
      expect(() => quoteIdentifier('bad; DROP TABLE x')).toThrow(ValidationError)
      expect(() => quoteIdentifier('1starts_with_num')).toThrow(ValidationError)
    })
  })

  describe('parseWhereClause', () => {
    test('parses simple equality and parameterizes literals', () => {
      const res = parseWhereClause("street_name = 'MARKET ST'")
      expect(res).toEqual({
        sql: 't."street_name" = $1',
        params: ['MARKET ST']
      })
    })

    test('parses compound AND/OR/IN/LIKE/IS NOT NULL clauses', () => {
      const res = parseWhereClause(
        "(status IN ('A', 'B') AND objectid > 100) OR name LIKE 'PHILA%' AND zip IS NOT NULL"
      )
      expect(res.params).toEqual(['A', 'B', 100, 'PHILA%'])
      expect(res.sql).toContain('t."status" IN ($1, $2)')
      expect(res.sql).toContain('t."objectid" > $3')
      expect(res.sql).toContain('t."name" LIKE $4')
      expect(res.sql).toContain('t."zip" IS NOT NULL')
    })

    test('parses 1=1', () => {
      const res = parseWhereClause('1=1')
      expect(res).toEqual({ sql: '$1 = $2', params: [1, 1] })
    })

    test('rejects SQL injection attempts', () => {
      expect(() => parseWhereClause('1=1; DROP TABLE dor_parcel')).toThrow(ValidationError)
      expect(() => parseWhereClause('1=1 -- comment')).toThrow(ValidationError)
      expect(() => parseWhereClause('1=1 /* comment */')).toThrow(ValidationError)
      expect(() => parseWhereClause('pg_sleep(10) = 0')).toThrow(ValidationError)
    })
  })

  describe('parseObjectIds', () => {
    test('parses comma-separated numeric IDs', () => {
      expect(parseObjectIds('10, 20, 30', 'objectid', 2)).toEqual({
        sql: 't."objectid" = ANY($2)',
        params: [[10, 20, 30]]
      })
    })
  })

  describe('parseSpatialFilter', () => {
    test('builds index-friendly ST_Transform envelope filter', () => {
      const res = parseSpatialFilter(
        {
          geometry: '-75.2,39.9,-75.1,40.0',
          geometryType: 'esriGeometryEnvelope',
          inSR: '4326',
          spatialRel: 'esriSpatialRelIntersects'
        },
        'shape',
        2272,
        1
      )
      expect(res.sql).toBe(
        'ST_Intersects(t."shape", ST_Transform(ST_MakeEnvelope($1, $2, $3, $4, $5), $6))'
      )
      expect(res.params).toEqual([-75.2, 39.9, -75.1, 40.0, 4326, 2272])
    })

    test('maps Web Mercator 102100 to 3857', () => {
      const res = parseSpatialFilter(
        {
          geometry: JSON.stringify({ xmin: -8370000, ymin: 4850000, xmax: -8360000, ymax: 4860000, spatialReference: { wkid: 102100 } })
        },
        'shape',
        2272,
        1
      )
      expect(res.params).toEqual([-8370000, 4850000, -8360000, 4860000, 3857, 2272])
    })
  })

  describe('parseOrderByFields', () => {
    test('parses multiple columns with directions', () => {
      expect(parseOrderByFields('street_name DESC, objectid ASC', 'objectid')).toEqual({
        sql: 't."street_name" DESC, t."objectid" ASC',
        applied: true
      })
    })
  })

  describe('buildQueryOptions', () => {
    test('combines where, pagination, and sets filtersApplied', () => {
      const opts = buildQueryOptions(
        {
          where: "zip = '19103'",
          resultRecordCount: '100',
          resultOffset: '50'
        },
        { idColumn: 'objectid', geomColumn: 'shape', tableSrid: 2272, maxLimit: 2000 }
      )

      expect(opts.whereSql).toBe('WHERE t."zip" = $1')
      expect(opts.params).toEqual(['19103'])
      expect(opts.limit).toBe(100)
      expect(opts.offset).toBe(50)
      expect(opts.filtersApplied).toEqual({
        where: true,
        limit: true,
        offset: true
      })
    })
  })
})
