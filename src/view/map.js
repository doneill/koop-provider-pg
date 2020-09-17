var map = L.map('map').setView([36.9591311, -121.97182], 10);

L.esri.basemapLayer('Topographic').addTo(map);

L.esri.featureLayer({
url: 'http://localhost:8080/pg/rest/services/groot.fire_service_areas/FeatureServer/layers'
}).addTo(map);