## Koop PostGIS provider
 Koop [provider](https://koopjs.github.io/docs/usage/provider) to query [PostGIS](https://postgis.net/) spatial data, convert it to [GeoJSON](https://geojson.org/) as input into [Koop](https://koopjs.github.io/) and convert into the GeoServices specification supported by ArcGIS products.

## Dependencies
- [Koop](https://koopjs.github.io/)
- [bluebird](http://bluebirdjs.com/docs/getting-started.html)
- [config](https://lorenwest.github.io/node-config/)
- [Lodash](https://lodash.com/)
- [pg-promise](https://vitaly-t.github.io/pg-promise/)

## Test it out
Run server:
- `npm install`
- `npm start`

**Example API Query:**

Replace `${schema}.${table}` with **schema.table** from your PostGIS db to translate.

```bash
curl localhost:8080/pg/${schema}.${table}/FeatureServer/0/query
```

## Contributors
<a href="https://github.com/doneill/koop-provider-pg/graphs/contributors">
  <img src="https://contributors-img.web.app/image?repo=doneill/koop-provider-pg" />
</a>

## Licensing
A copy of the license is available in the repository's [LICENSE](LICENSE) file.