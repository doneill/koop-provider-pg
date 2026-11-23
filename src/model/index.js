const _ = require('lodash')
const { db } = require('../db')
const { createLogger } = require('../utils/logger')
const { ValidationError, DataNotFoundError, DatabaseError } = require('../utils/errors')
const { buildQueryOptions } = require('../utils/queryBuilder')

const log = createLogger('Model')

const DEFAULT_MAX_LIMIT = 2000

class Model {
  constructor () { }

  getData (req, callback) {
    const splitPath = req.params.id.split('.')
    const schema = splitPath[0]
    const table = splitPath[1]
    const id = process.env.PG_OBJECTID || 'gid'
    const pgLimit = parseInt(process.env.PG_LIMIT || DEFAULT_MAX_LIMIT, 10)

    if (!table) {
      const error = new ValidationError('The "id" parameter must be in the form of "schema.table"', {
        providedId: req.params.id,
        schema,
        table
      })
      log.warn('Request validation failed', {
        errorType: error.name,
        message: error.message,
        details: error.details
      })
      return callback(error)
    }

    // Handle async database operations with proper callback handling
    this.processDataRequest(schema, table, id, pgLimit, req, callback)
  }

  async processDataRequest (schema, table, id, maxLimit, req, callback) {
    // Support legacy 5-arg signature: (schema, table, id, limit, callback)
    if (typeof req === 'function') {
      callback = req
      req = { params: {}, query: {} }
    }

    const reqQuery = (req && req.query) || {}
    const reqParams = (req && req.params) || {}

    try {
      const geomColumnName = await db.data.getGeometryColumnName(schema, table)

      if (!geomColumnName || !geomColumnName.f_geometry_column || !geomColumnName.srid) {
        log.warn('Table does not have a geometry column', { schema, table })
        return callback(null, {
          type: 'FeatureCollection',
          features: [],
          metadata: {
            title: schema,
            name: schema + '.' + table,
            description: 'This table does not contain spatial data.',
            geometryType: null
          }
        })
      }

      const geom = geomColumnName.f_geometry_column
      const srid = geomColumnName.srid
      const fullTable = schema + '.' + table

      // Build SQL pushdown options from ArcGIS query parameters
      const queryOpts = buildQueryOptions(reqQuery, {
        idColumn: id,
        geomColumn: geom,
        tableSrid: srid,
        maxLimit
      })

      // Fast path for returnCountOnly=true (only when all provided filters were pushed down)
      if (queryOpts.returnCountOnly && (!reqQuery.geometry || queryOpts.filtersApplied.geometry)) {
        const count = await db.data.getCount(fullTable, queryOpts.whereSql, queryOpts.params)
        return callback(null, {
          type: 'FeatureCollection',
          features: [],
          count,
          filtersApplied: { all: true }
        })
      }

      // Layer metadata requests (e.g. /FeatureServer/0 without /query) only need a single
      // sample row for Koop to infer field types and geometryType
      const isMetadataOnly = reqParams.layer !== undefined &&
        !reqParams.method &&
        !reqQuery.where &&
        !reqQuery.objectIds &&
        !reqQuery.geometry &&
        reqQuery.resultRecordCount === undefined

      const effectiveLimit = isMetadataOnly ? 1 : queryOpts.limit
      // Fetch one extra row when limit pushdown is active so we can accurately report exceededTransferLimit
      const sqlLimit = (!isMetadataOnly && queryOpts.filtersApplied.limit)
        ? effectiveLimit + 1
        : effectiveLimit

      const geojson = await db.data.createGeoJson(
        id,
        geom,
        srid,
        fullTable,
        sqlLimit,
        queryOpts.offset,
        {
          whereSql: queryOpts.whereSql,
          orderBySql: queryOpts.orderBySql,
          params: queryOpts.params
        }
      )

      if (!geojson || typeof geojson !== 'object' || !geojson.type || !geojson.features) {
        log.warn('Unexpected result from createGeoJson', { schema, table, result: typeof geojson })
        return callback(null, {
          type: 'FeatureCollection',
          features: [],
          metadata: {
            title: schema,
            name: fullTable,
            description: 'no-data',
            geometryType: null
          }
        })
      }

      let exceededTransferLimit = false
      if (!isMetadataOnly && queryOpts.filtersApplied.limit && geojson.features.length > effectiveLimit) {
        exceededTransferLimit = true
        geojson.features = geojson.features.slice(0, effectiveLimit)
      }

      geojson.description = 'PG Koop Feature Service'
      geojson.filtersApplied = queryOpts.filtersApplied
      if (!geojson.metadata) {
        geojson.metadata = {
          title: schema,
          name: fullTable,
          description: 'This feature layer generated with Koop PostGIS Provider (koop-provider-pg), for more information visit https://github.com/doneill/koop-provider-pg',
          idField: id,
          maxRecordCount: maxLimit,
          exceededTransferLimit,
          geometryType: _.get(geojson, 'features[0].geometry.type')
        }
      }

      callback(null, geojson)
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DataNotFoundError) {
        log.warn('Request validation failed', {
          errorType: error.name,
          message: error.message,
          details: error.details
        })
        return callback(error)
      }

      const dbError = new DatabaseError(
        'Failed to retrieve data from PostGIS',
        error,
        { schema, table, id }
      )

      log.error('Database operation failed', error, {
        schema,
        table,
        id,
        originalError: error.message
      })
      callback(dbError)
    }
  }
}

module.exports = Model
