// Constructor
var GeofencingMap = function GeofencingMap(id){
    this.mapId  = id;
    this.map = this.init();
};

// Instance methods
GeofencingMap.prototype = {
    init : function init(){
        var osmUrl = 'http://localhost:8888/Tiles/{z}/{x}/{y}.png';
        var osmAttrib = '? OpenStreetMap contributors';
        var osm = new L.TileLayer(osmUrl, { minZoom: 11, maxZoom: 17, attribution: osmAttrib });
        
        var map = new L.map(this.mapId);
        map.setView(new L.LatLng(25.038567638374172, 121.49175156248842), 11);
        map.addLayer(osm);

        this.map = map;
        return map;
    }
}
