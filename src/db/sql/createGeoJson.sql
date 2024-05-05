SELECT jsonb_build_object(
    'type',     'FeatureCollection',
    'features', jsonb_agg(features.feature)
) FROM (
  SELECT jsonb_build_object(
    'type',       'Feature',
    'gid',         ${id},
    'geometry',   ST_AsGeoJSON(ST_Transform(${geom:raw},${srid}))::jsonb,
    'properties', to_jsonb(inputs) - ${geom}
  ) AS feature
  FROM (SELECT * FROM ${table:raw} WHERE ${id:raw} IN (SELECT ${id:raw} FROM ${table:raw} ORDER BY ${id:raw} LIMIT ${limit:raw} OFFSET ${offset:raw})) inputs) features;
