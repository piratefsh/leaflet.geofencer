var MultiPolygon = function MultiPolygon(map, name){
    this._map = map;
    this.name = name;
    this._polygons = new Array();
    this._curr_polygon = -1;

    // Create marker for current active polygon
    this._map.on('click', function(e){
        var curr_polygon = this._polygons[this._curr_polygon];
        if(curr_polygon && !curr_polygon.isSolid()){
            this._polygons[this._curr_polygon].createMarker(e.latlng);
        }
    }, this);
}

MultiPolygon.prototype = {
    getMap: function(){
        return this.map;
    },

    getPolygons: function(){
        return this._polygons;
    },

    // Create polygon out of array of coordinates
    addPolygon: function(coords, closeShape){
        // If previous new polygon not created yet, ignore
        if(this._polygons[this._curr_polygon] && this._polygons[this._curr_polygon].getNumVertices() < 1){
            return;
        }

        // Show new polygon cursor
        var p = new Polygon(this._map, 'polygon-' + this._polygons.length);
        for(var i in coords){
            p.createMarker(coords[i]);
        }

        if(closeShape){
            p.closeShape(); 
        }

        this._polygons.push(p);
        this._curr_polygon = this._polygons.length - 1;
    },

    // Return coordinates for each Polygon in double array
    getPolygonCoordinates: function(){
        var coords = new Array();
        for(var i in this._polygons){
            var p = this._polygons[i];
            if(p.isSolid()){
               coords.push(p.getCoordinates());
            }
        }
        return coords;
    },

    // Delete all Polygons
    deleteAllPolygons: function(){
        for(var i in this._polygons){
            this._polygons[i].clearAll();
        }
    },

    // Create new Polygon
    createNewPolygon: function(){
        this.addPolygon();
        this._curr_polygon = this._polygons.length - 1;
    },

}