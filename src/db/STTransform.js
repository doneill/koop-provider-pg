
// st.asGeoJson(st.transform('geom', 4326))

function asGeoJson(transform){
    this.rawType = true; // no escaping, because we return pre-formatted SQL
    this.toPostgres = () => pgp.as.format('ST_AsGeoJSON($1)', [transform]);
}


// st.transform('geom', 4326)
function transform(column, proj){
    this.rawType = true; // no escaping, because we return pre-formatted SQL
    this.toPostgres = () => pgp.as.format('ST_Transform($1, $2)', [column, proj]);
}
