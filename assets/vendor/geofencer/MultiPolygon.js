var MultiPolygon = function MultiPolygon(map, name){
    this._polygons = new Array();
    this.name = name;
    this._map = map;
}

MultiPolygon.prototype = {
    getMap: function(){
        return this.map;
    },

    getPolygons: function(){
        return this._polygons;
    },

    // Create polygon out of array of coordinates
    addPolygon: function(coords){
        var p = new Polygon(this._map, 'polygon-' + this._polygons.length);
        for(var i in coords){
            p.createMarker(coords[i]);
        }

        this._polygons.push(p);
    },

    // Return coordinates for each Polygon in double array
    getPolygonCoordinates: function(){
        var coords = new Array();
        for(var i in this._polygons){
            var p = this._polygons[i];
            coords.push(p.getCoordinates())
        }
        return coords;
    }
}