// Constructor
var GeofencingMap = function GeofencingMap(id){
    this.mapId  = id;
    this.map = this.init();
};

// Instance methods
GeofencingMap.prototype = {
    init : function init(){
        var osmUrl = 'http://192.168.2.86:8888/Sites/Tiles/{z}/{x}/{y}.png';
        

        osmUrl = 'http://{s}.tiles.mapbox.com/v3/piratefsh.jl6ae25j/{z}/{x}/{y}.png';
        var osmAttrib = 'OpenStreetMap contributors';
        var osm = new L.TileLayer(osmUrl, { minZoom: 8, maxZoom: 17, attribution: osmAttrib });
        
        var map = new L.map(this.mapId, {
            contextmenu: true,
        });
        map.setView(new L.LatLng(25.038567638374172, 121.49175156248842), 11);
        map.addLayer(osm);

        this.map = map;
        return map;
    }
}
