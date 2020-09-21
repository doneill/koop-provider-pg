var map = L.map('map').setView([36.9591311, -121.97182], 10);

L.esri.basemapLayer('DarkGray', {
detectRetina: true
}).addTo(map);

var postgis = L.esri.featureLayer({
url: 'http://localhost:8080/pg/rest/services/groot.fire_service_areas/FeatureServer/layers'
}).addTo(map);

postgis.bindPopup(function (layer) {
    return L.Util.template('{name}', layer.feature.properties);
  });