# Koop Postgres provider
 Koop [provider](https://koopjs.github.io/docs/usage/provider) to query [PostGIS](https://postgis.net/) spatial data from a [PostgreSQL](https://www.postgresql.org/), convert it to [GeoJSON](https://geojson.org/) as input into [Koop](https://koopjs.github.io/) that translates GeoJSON into the GeoServices specification supported by ArcGIS products.

## Dependencies
TODO

## Test it out
Run server:
- `npm install`
- `npm start`

Example API Query:
- `curl localhost:8080/pg/FeatureServer/0/query\?table\=${table-name}`

## Contributors
<a href="https://github.com/doneill/koop-provider-pg/graphs/contributors">
  <img src="https://contributors-img.web.app/image?repo=doneill/koop-provider-pg" />
</a>

## Licensing
A copy of the license is available in the repository's [LICENSE](LICENSE) file.