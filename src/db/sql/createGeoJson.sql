WITH ordered_ids AS (
  SELECT ${id:raw}
  FROM ${table:raw}
  ORDER BY ${id:raw}
  LIMIT ${limit:raw} OFFSET ${offset:raw}
),
feature_data AS (
  SELECT 
    ${id:raw},
    ST_AsGeoJSON(ST_Transform(${geom:raw}, ${srid}))::jsonb AS geometry,
    to_jsonb(t) - ${geom} AS properties
  FROM ${table:raw} t
  INNER JOIN ordered_ids USING (${id:raw})
),
features AS (
  SELECT jsonb_build_object(
    'type', 'Feature',
    'gid', ${id:raw},
    'geometry', geometry,
    'properties', properties
  ) AS feature
  FROM feature_data
)
SELECT jsonb_build_object(
  'type', 'FeatureCollection',
  'features', COALESCE(jsonb_agg(feature), '[]'::jsonb)
) AS jsonb_build_object
FROM features;
