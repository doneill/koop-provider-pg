const { ValidationError } = require('./errors')

const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/

const SPATIAL_REL_MAP = {
  esriSpatialRelIntersects: 'ST_Intersects',
  esriSpatialRelContains: 'ST_Contains',
  esriSpatialRelWithin: 'ST_Within',
  esriSpatialRelCrosses: 'ST_Crosses',
  esriSpatialRelOverlaps: 'ST_Overlaps',
  esriSpatialRelTouches: 'ST_Touches'
}

/**
 * Validate a SQL identifier (schema, table, or column name) and return it double-quoted.
 */
function quoteIdentifier (name, label = 'identifier') {
  if (typeof name !== 'string' || !IDENTIFIER_REGEX.test(name)) {
    throw new ValidationError(`Invalid SQL ${label}: "${name}"`, { [label]: name })
  }
  return `"${name}"`
}

/**
 * Normalize an ArcGIS/EPSG SRID value (number, string, or spatialReference object).
 */
function parseSrid (sr, fallback = 4326) {
  if (sr === undefined || sr === null || sr === '') return fallback

  let raw = sr
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (trimmed.startsWith('{')) {
      try {
        raw = JSON.parse(trimmed)
      } catch (e) {
        throw new ValidationError('Invalid spatialReference JSON in inSR', { inSR: sr })
      }
    }
  }

  if (typeof raw === 'object' && raw !== null) {
    raw = raw.latestWkid || raw.wkid
  }

  const srid = parseInt(raw, 10)
  if (!Number.isInteger(srid) || srid <= 0) {
    throw new ValidationError(`Invalid SRID: "${sr}"`, { inSR: sr })
  }

  // ArcGIS Web Mercator aliases -> EPSG:3857
  if (srid === 102100 || srid === 102113) return 3857
  return srid
}

/**
 * Tokenize a standard ArcGIS SQL-92 WHERE clause.
 * Rejects comments, semicolons, dollar-quoting, and unsupported characters.
 */
function tokenizeWhere (input) {
  const tokens = []
  let i = 0
  const len = input.length

  while (i < len) {
    const ch = input[i]

    // Whitespace
    if (/\s/.test(ch)) {
      i++
      continue
    }

    // Reject SQL comments and statement terminators
    if (ch === ';') {
      throw new ValidationError('Semicolons are not allowed in where clause')
    }
    if ((ch === '-' && input[i + 1] === '-') || (ch === '/' && input[i + 1] === '*')) {
      throw new ValidationError('SQL comments are not allowed in where clause')
    }

    // Parentheses & commas
    if (ch === '(' || ch === ')' || ch === ',') {
      tokens.push({ type: ch, value: ch })
      i++
      continue
    }

    // Two-character comparison operators
    const two = input.slice(i, i + 2)
    if (two === '<>' || two === '!=' || two === '<=' || two === '>=') {
      tokens.push({ type: 'OP', value: two === '!=' ? '<>' : two })
      i += 2
      continue
    }

    // Single-character comparison operators
    if (ch === '=' || ch === '<' || ch === '>') {
      tokens.push({ type: 'OP', value: ch })
      i++
      continue
    }

    // Single-quoted string literal (supports '' escaping)
    if (ch === '\'') {
      i++
      let str = ''
      let closed = false
      while (i < len) {
        if (input[i] === '\'') {
          if (input[i + 1] === '\'') {
            str += '\''
            i += 2
          } else {
            i++
            closed = true
            break
          }
        } else {
          str += input[i]
          i++
        }
      }
      if (!closed) {
        throw new ValidationError('Unterminated string literal in where clause')
      }
      tokens.push({ type: 'STRING', value: str })
      continue
    }

    // Double-quoted identifier
    if (ch === '"') {
      i++
      let ident = ''
      let closed = false
      while (i < len) {
        if (input[i] === '"') {
          if (input[i + 1] === '"') {
            ident += '"'
            i += 2
          } else {
            i++
            closed = true
            break
          }
        } else {
          ident += input[i]
          i++
        }
      }
      if (!closed || !IDENTIFIER_REGEX.test(ident)) {
        throw new ValidationError(`Invalid quoted identifier in where clause: "${ident}"`)
      }
      tokens.push({ type: 'IDENT', value: ident })
      continue
    }

    // Number literal (including negative numbers when not preceded by a value/ident)
    const prev = tokens[tokens.length - 1]
    const canBeNegative = ch === '-' && /[0-9]/.test(input[i + 1] || '') &&
      (!prev || prev.type === 'OP' || prev.type === '(' || prev.type === ',' || prev.type === 'KEYWORD')

    if (/[0-9]/.test(ch) || canBeNegative) {
      let numStr = ch
      i++
      let hasDot = false
      while (i < len && (/[0-9]/.test(input[i]) || (!hasDot && input[i] === '.'))) {
        if (input[i] === '.') hasDot = true
        numStr += input[i]
        i++
      }
      const num = Number(numStr)
      if (Number.isNaN(num)) {
        throw new ValidationError(`Invalid numeric literal in where clause: "${numStr}"`)
      }
      tokens.push({ type: 'NUMBER', value: num })
      continue
    }

    // Unquoted keyword or identifier
    if (/[a-zA-Z_]/.test(ch)) {
      let word = ''
      while (i < len && /[a-zA-Z0-9_]/.test(input[i])) {
        word += input[i]
        i++
      }
      const upper = word.toUpperCase()
      const keywords = new Set([
        'AND', 'OR', 'NOT', 'IS', 'NULL', 'IN', 'BETWEEN',
        'LIKE', 'ILIKE', 'TRUE', 'FALSE', 'DATE', 'TIMESTAMP'
      ])
      if (keywords.has(upper)) {
        tokens.push({ type: 'KEYWORD', value: upper })
      } else {
        tokens.push({ type: 'IDENT', value: word })
      }
      continue
    }

    throw new ValidationError(`Unsupported character "${ch}" in where clause`)
  }

  return tokens
}

/**
 * Parse an ArcGIS SQL-92 WHERE clause into a parameterized PostgreSQL SQL fragment.
 * All literal values are bound as $n parameters; all identifiers are validated and quoted.
 */
function parseWhereClause (whereStr, startParamIndex = 1) {
  if (typeof whereStr !== 'string' || !whereStr.trim()) {
    return { sql: '', params: [] }
  }

  const tokens = tokenizeWhere(whereStr)
  if (tokens.length === 0) {
    return { sql: '', params: [] }
  }

  let pos = 0
  const params = []

  function peek (offset = 0) {
    return tokens[pos + offset]
  }

  function consume () {
    return tokens[pos++]
  }

  function matchKeyword (kw) {
    const t = peek()
    if (t && t.type === 'KEYWORD' && t.value === kw) {
      pos++
      return true
    }
    return false
  }

  function addParam (val) {
    params.push(val)
    return `$${startParamIndex + params.length - 1}`
  }

  function parseLiteral () {
    const t = peek()
    if (!t) {
      throw new ValidationError('Unexpected end of where clause; expected a literal value')
    }
    if (t.type === 'STRING' || t.type === 'NUMBER') {
      consume()
      return addParam(t.value)
    }
    if (t.type === 'KEYWORD' && (t.value === 'TRUE' || t.value === 'FALSE')) {
      consume()
      return addParam(t.value === 'TRUE')
    }
    if (t.type === 'KEYWORD' && (t.value === 'DATE' || t.value === 'TIMESTAMP')) {
      consume()
      const strTok = consume()
      if (!strTok || strTok.type !== 'STRING') {
        throw new ValidationError(`Expected string literal after ${t.value} in where clause`)
      }
      const placeholder = addParam(strTok.value)
      return `CAST(${placeholder} AS ${t.value.toLowerCase()})`
    }
    throw new ValidationError(`Expected literal value in where clause, got "${t.value}"`)
  }

  function parseOperand () {
    const t = peek()
    if (!t) {
      throw new ValidationError('Unexpected end of where clause')
    }
    if (t.type === 'IDENT') {
      consume()
      // Reject function calls like pg_sleep(...)
      if (peek() && peek().type === '(') {
        throw new ValidationError(`Function calls are not allowed in where clause: "${t.value}"`)
      }
      return `t.${quoteIdentifier(t.value, 'column')}`
    }
    if (t.type === 'KEYWORD' && t.value === 'NULL') {
      consume()
      return 'NULL'
    }
    return parseLiteral()
  }

  function parseComparison () {
    if (peek() && peek().type === '(') {
      consume()
      const inner = parseOr()
      const close = consume()
      if (!close || close.type !== ')') {
        throw new ValidationError('Unclosed parenthesis in where clause')
      }
      return `(${inner})`
    }

    const left = parseOperand()

    // IS [NOT] NULL
    if (matchKeyword('IS')) {
      const isNot = matchKeyword('NOT')
      if (!matchKeyword('NULL')) {
        throw new ValidationError('Expected NULL after IS in where clause')
      }
      return `${left} IS ${isNot ? 'NOT ' : ''}NULL`
    }

    // [NOT] IN (...) | [NOT] BETWEEN a AND b | [NOT] LIKE / ILIKE pattern
    const negated = matchKeyword('NOT')

    if (matchKeyword('IN')) {
      const open = consume()
      if (!open || open.type !== '(') {
        throw new ValidationError('Expected "(" after IN in where clause')
      }
      const items = []
      items.push(parseLiteral())
      while (peek() && peek().type === ',') {
        consume()
        items.push(parseLiteral())
      }
      const close = consume()
      if (!close || close.type !== ')') {
        throw new ValidationError('Expected ")" after IN list in where clause')
      }
      return `${left} ${negated ? 'NOT ' : ''}IN (${items.join(', ')})`
    }

    if (matchKeyword('BETWEEN')) {
      const low = parseLiteral()
      if (!matchKeyword('AND')) {
        throw new ValidationError('Expected AND in BETWEEN expression')
      }
      const high = parseLiteral()
      return `${left} ${negated ? 'NOT ' : ''}BETWEEN ${low} AND ${high}`
    }

    if (matchKeyword('LIKE') || matchKeyword('ILIKE')) {
      const op = tokens[pos - 1].value
      const pattern = parseLiteral()
      return `${left} ${negated ? 'NOT ' : ''}${op} ${pattern}`
    }

    if (negated) {
      throw new ValidationError('Unexpected NOT in where clause')
    }

    const opTok = peek()
    if (opTok && opTok.type === 'OP') {
      consume()
      const right = parseOperand()
      return `${left} ${opTok.value} ${right}`
    }

    // Standalone boolean literal (e.g. TRUE / FALSE)
    return left
  }

  function parseNot () {
    if (matchKeyword('NOT')) {
      return `NOT (${parseNot()})`
    }
    return parseComparison()
  }

  function parseAnd () {
    let left = parseNot()
    while (matchKeyword('AND')) {
      const right = parseNot()
      left = `(${left} AND ${right})`
    }
    return left
  }

  function parseOr () {
    let left = parseAnd()
    while (matchKeyword('OR')) {
      const right = parseAnd()
      left = `(${left} OR ${right})`
    }
    return left
  }

  const sql = parseOr()
  if (pos < tokens.length) {
    throw new ValidationError(`Unexpected token "${tokens[pos].value}" in where clause`)
  }

  return { sql, params }
}

/**
 * Parse ArcGIS objectIds parameter into a parameterized SQL condition.
 */
function parseObjectIds (objectIdsParam, idColumn, startParamIndex = 1) {
  if (objectIdsParam === undefined || objectIdsParam === null || objectIdsParam === '') {
    return null
  }

  const rawList = Array.isArray(objectIdsParam)
    ? objectIdsParam
    : String(objectIdsParam).split(',')

  const cleaned = rawList
    .map(v => String(v).trim())
    .filter(Boolean)

  if (cleaned.length === 0) return null

  const allNumeric = cleaned.every(v => /^-?\d+$/.test(v))
  const values = allNumeric ? cleaned.map(v => Number(v)) : cleaned
  const quotedId = quoteIdentifier(idColumn, 'id')

  return {
    sql: `t.${quotedId} = ANY($${startParamIndex})`,
    params: [values]
  }
}

/**
 * Parse ArcGIS geometry / geometryType / inSR / spatialRel into a PostGIS SQL filter.
 * Transforms the query geometry into the table's SRID so PostGIS can use spatial GIST indexes.
 */
function parseSpatialFilter (query, geomColumn, tableSrid, startParamIndex = 1) {
  if (!query || !query.geometry) return null

  let geomInput = query.geometry
  if (typeof geomInput === 'string') {
    const trimmed = geomInput.trim()
    if (trimmed.startsWith('{')) {
      try {
        geomInput = JSON.parse(trimmed)
      } catch (e) {
        throw new ValidationError('Invalid JSON in geometry parameter')
      }
    }
  }

  const geomType = query.geometryType || 'esriGeometryEnvelope'
  const inSrid = parseSrid(
    (typeof geomInput === 'object' && geomInput !== null && geomInput.spatialReference) || query.inSR,
    4326
  )

  const params = []
  const addParam = (val) => {
    params.push(val)
    return `$${startParamIndex + params.length - 1}`
  }

  let queryGeomSql

  if (geomType === 'esriGeometryEnvelope' && typeof geomInput === 'string') {
    const parts = geomInput.split(',').map(Number)
    if (parts.length !== 4 || parts.some(Number.isNaN)) {
      throw new ValidationError('Envelope geometry must be "xmin,ymin,xmax,ymax"')
    }
    const [xmin, ymin, xmax, ymax] = parts
    queryGeomSql = `ST_MakeEnvelope(${addParam(xmin)}, ${addParam(ymin)}, ${addParam(xmax)}, ${addParam(ymax)}, ${addParam(inSrid)})`
  } else if (typeof geomInput === 'object' && geomInput !== null && geomInput.xmin !== undefined) {
    const { xmin, ymin, xmax, ymax } = geomInput
    if ([xmin, ymin, xmax, ymax].some(v => typeof v !== 'number' || Number.isNaN(v))) {
      throw new ValidationError('Envelope geometry JSON must have numeric xmin, ymin, xmax, ymax')
    }
    queryGeomSql = `ST_MakeEnvelope(${addParam(xmin)}, ${addParam(ymin)}, ${addParam(xmax)}, ${addParam(ymax)}, ${addParam(inSrid)})`
  } else if (geomType === 'esriGeometryPoint' && typeof geomInput === 'string') {
    const parts = geomInput.split(',').map(Number)
    if (parts.length !== 2 || parts.some(Number.isNaN)) {
      throw new ValidationError('Point geometry must be "x,y"')
    }
    queryGeomSql = `ST_SetSRID(ST_MakePoint(${addParam(parts[0])}, ${addParam(parts[1])}), ${addParam(inSrid)})`
  } else if (typeof geomInput === 'object' && geomInput !== null && geomInput.x !== undefined && geomInput.y !== undefined) {
    queryGeomSql = `ST_SetSRID(ST_MakePoint(${addParam(Number(geomInput.x))}, ${addParam(Number(geomInput.y))}), ${addParam(inSrid)})`
  } else if (typeof geomInput === 'object' && geomInput !== null && Array.isArray(geomInput.rings)) {
    const geojson = { type: 'Polygon', coordinates: geomInput.rings }
    queryGeomSql = `ST_SetSRID(ST_GeomFromGeoJSON(${addParam(JSON.stringify(geojson))}), ${addParam(inSrid)})`
  } else if (typeof geomInput === 'object' && geomInput !== null && Array.isArray(geomInput.paths)) {
    const geojson = { type: 'MultiLineString', coordinates: geomInput.paths }
    queryGeomSql = `ST_SetSRID(ST_GeomFromGeoJSON(${addParam(JSON.stringify(geojson))}), ${addParam(inSrid)})`
  } else if (typeof geomInput === 'object' && geomInput !== null && geomInput.type && geomInput.coordinates) {
    queryGeomSql = `ST_SetSRID(ST_GeomFromGeoJSON(${addParam(JSON.stringify(geomInput))}), ${addParam(inSrid)})`
  } else {
    // Unsupported geometry format: let Koop handle it in-memory rather than failing
    return null
  }

  const targetGeomSql = inSrid !== tableSrid
    ? `ST_Transform(${queryGeomSql}, ${addParam(tableSrid)})`
    : queryGeomSql

  const quotedGeom = `t.${quoteIdentifier(geomColumn, 'geometry column')}`
  const spatialRel = query.spatialRel || 'esriSpatialRelIntersects'

  if (spatialRel === 'esriSpatialRelEnvelopeIntersects') {
    return {
      sql: `${quotedGeom} && ${targetGeomSql}`,
      params
    }
  }

  const postgisFn = SPATIAL_REL_MAP[spatialRel] || 'ST_Intersects'
  return {
    sql: `${postgisFn}(${quotedGeom}, ${targetGeomSql})`,
    params
  }
}

/**
 * Parse ArcGIS orderByFields (e.g. "street_name ASC, objectid DESC").
 */
function parseOrderByFields (orderByParam, fallbackIdCol) {
  const fallback = `t.${quoteIdentifier(fallbackIdCol, 'id')} ASC`
  if (typeof orderByParam !== 'string' || !orderByParam.trim()) {
    return { sql: fallback, applied: false }
  }

  const clauses = orderByParam
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const pieces = part.split(/\s+/)
      if (pieces.length > 2) {
        throw new ValidationError(`Invalid orderByFields entry: "${part}"`)
      }
      const col = quoteIdentifier(pieces[0], 'orderByFields column')
      const dir = pieces[1] ? pieces[1].toUpperCase() : 'ASC'
      if (dir !== 'ASC' && dir !== 'DESC') {
        throw new ValidationError(`Invalid sort direction "${pieces[1]}" in orderByFields`)
      }
      return `t.${col} ${dir}`
    })

  if (clauses.length === 0) {
    return { sql: fallback, applied: false }
  }

  return { sql: clauses.join(', '), applied: true }
}

/**
 * Build SQL pushdown options and Koop filtersApplied metadata from req.query.
 */
function buildQueryOptions (reqQuery = {}, { idColumn, geomColumn, tableSrid, maxLimit = 2000 }) {
  const conditions = []
  const params = []
  const filtersApplied = {}

  // 1. WHERE clause
  if (reqQuery.where && String(reqQuery.where).trim()) {
    const parsed = parseWhereClause(String(reqQuery.where), params.length + 1)
    if (parsed.sql) {
      conditions.push(parsed.sql)
      params.push(...parsed.params)
      filtersApplied.where = true
    }
  }

  // 2. objectIds
  if (reqQuery.objectIds !== undefined && reqQuery.objectIds !== null && String(reqQuery.objectIds).trim() !== '') {
    const parsed = parseObjectIds(reqQuery.objectIds, idColumn, params.length + 1)
    if (parsed) {
      conditions.push(parsed.sql)
      params.push(...parsed.params)
      filtersApplied.objectIds = true
    }
  }

  // 3. Spatial geometry filter
  let geometryUnapplied = false
  if (reqQuery.geometry) {
    const parsed = parseSpatialFilter(reqQuery, geomColumn, tableSrid, params.length + 1)
    if (parsed) {
      conditions.push(parsed.sql)
      params.push(...parsed.params)
      filtersApplied.geometry = true
    } else {
      geometryUnapplied = true
    }
  }

  // 4. ORDER BY
  const orderBy = parseOrderByFields(reqQuery.orderByFields, idColumn)
  if (orderBy.applied) {
    filtersApplied.orderByFields = true
  }

  // 5. LIMIT & OFFSET (only mark limit/offset as applied if all filters were pushed down)
  let limit = maxLimit
  if (reqQuery.resultRecordCount !== undefined && reqQuery.resultRecordCount !== '') {
    const requested = parseInt(reqQuery.resultRecordCount, 10)
    if (Number.isNaN(requested) || requested < 0) {
      throw new ValidationError(`Invalid resultRecordCount: "${reqQuery.resultRecordCount}"`)
    }
    limit = Math.min(requested, maxLimit)
  }

  let offset = 0
  if (reqQuery.resultOffset !== undefined && reqQuery.resultOffset !== '') {
    const parsedOffset = parseInt(reqQuery.resultOffset, 10)
    if (Number.isNaN(parsedOffset) || parsedOffset < 0) {
      throw new ValidationError(`Invalid resultOffset: "${reqQuery.resultOffset}"`)
    }
    offset = parsedOffset
  }

  if (!geometryUnapplied) {
    filtersApplied.limit = true
    if (offset > 0) {
      filtersApplied.offset = true
    }
  } else {
    // Do not truncate or offset before Koop applies the unhandled geometry filter
    limit = maxLimit
    offset = 0
  }

  const returnCountOnly = reqQuery.returnCountOnly === true ||
    String(reqQuery.returnCountOnly).toLowerCase() === 'true'

  return {
    whereSql: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    orderBySql: orderBy.sql,
    limit,
    offset,
    params,
    returnCountOnly,
    filtersApplied
  }
}

module.exports = {
  quoteIdentifier,
  parseSrid,
  parseWhereClause,
  parseObjectIds,
  parseSpatialFilter,
  parseOrderByFields,
  buildQueryOptions
}
