## Koop PostGIS provider
[![npm version][npm-img]][npm-url]

[npm-img]: https://img.shields.io/npm/v/koop-provider-pg.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/koop-provider-pg

Koop [provider](https://koopjs.github.io/docs/usage/provider) to query [PostGIS](https://postgis.net/) spatial data, convert it to [GeoJSON](https://geojson.org/) as input into [Koop](https://koopjs.github.io/) and convert into the GeoServices specification supported by ArcGIS products.

## Install

Koop providers require you to first install [Koop](https://koopjs.github.io/).  You can add `koop-provider-pg` to your Koop server dependencies by installing it with npm:

```
=> koop add provider koop-provider-pg
```

## Database configuration

Database connection parameters can be configured to any connection using the following environment variables:

```
PG_HOST=<host>
PG_PORT=<port>
PG_DATABASE=<database>
PG_USER=<user>
PG_PASSWORD=<password>
```

If enviornment variables are not set the provider will use the default configuration.

- Open **config/default.json** and set your database connection parameters, an example is provided in **config/example.json**.

```json
{
  "db": {
    "host": "host",
    "port": 5432,
    "database": "dbname",
    "user": "user",
    "password": "password"
  }
}
```

## Test it out
Run server:
- `npm install`
- `npm start`

**Example API Query:**

Replace `${schema}.${table}` with **schema.table** from your PostGIS db to translate.

```bash
curl localhost:8080/pg/${schema}.${table}/FeatureServer/0/query
```

**Add as Feature Layer**

- Esri Leaflet

```javascript
// esri leaflet feature layer
L.esri.featureLayer({
    url: 'http://localhost:8080/pg/${schema}.${table}/FeatureServer/layers'
  }).addTo(map);
````

![feature-service](./assets/postgis-feature-service.png)

- ArcGIS Online WebMap

```bash
https://www.arcgis.com/home/webmap/viewer.html?url=http://localhost:8080/pg/${schema}.${table}/FeatureServer/
```

![agol feature-service](./assets/postgis-agol-featureservice.png)

## Dependencies
- [Koop](https://koopjs.github.io/)
- [bluebird](http://bluebirdjs.com/docs/getting-started.html)
- [config](https://lorenwest.github.io/node-config/)
- [Lodash](https://lodash.com/)
- [pg-promise](https://vitaly-t.github.io/pg-promise/)

## Contributors
<a href="https://github.com/doneill/koop-provider-pg/graphs/contributors">
  <img src="https://contributors-img.web.app/image?repo=doneill/koop-provider-pg" />
</a>

## Licensing
A copy of the license is available in the repository's [LICENSE](LICENSE) file.