SELECT f_geometry_column, 
       CASE WHEN srid = 0 THEN 4326 ELSE srid END AS srid 
  FROM geometry_columns
  WHERE f_table_schema = $[schema] AND f_table_name = $[table]
  LIMIT 1;