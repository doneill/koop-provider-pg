SELECT f_geometry_column, srid
  FROM geometry_columns
  WHERE f_table_schema = $[schema] AND f_table_name = $[table]
  LIMIT 1;