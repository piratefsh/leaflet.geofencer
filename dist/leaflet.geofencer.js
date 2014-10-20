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
        var osm = new L.TileLayer(osmUrl, { minZoom: 1, maxZoom: 17, attribution: osmAttrib });
        
        var map = new L.map(this.mapId, {
            contextmenu: true,
        });
        map.setView(new L.LatLng(2.67968661580376,109.16015624999999), 6);
        map.addLayer(osm);

        this.map = map;
        return map;
    }
}

var MultiPolygon = function MultiPolygon(map, name){
    this._map = map;
    this.name = name;
    this._polygons = new Array();
    this._curr_polygon = -1;
    this.allow_dragging = false;

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

        p.setOnPolygonCreate(this.create_polygons_callback)
        p.setAllowDragging(this.allow_dragging)
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

        this._polygons = new Array();
    },

    // Create new Polygon
    createNewPolygon: function(){
        this.addPolygon();
        this._curr_polygon = this._polygons.length - 1;
    },

    setCreatePolygonsCallback: function(f){
        this.create_polygons_callback = f;
        var polys = this.getPolygons();

        for (var i in polys){
            var p = polys[i];
            p.setOnPolygonCreate(f);
        }
    },

    setEditable: function(allow){
        this.allow_dragging = allow;
        for(var i in this._polygons){
            this._polygons[i].setEditable(allow);
        }
    }, 
    setAllowDragging: function(allow){
        this.allow_dragging = allow;
        for(var i in this._polygons){
            this._polygons[i].setAllowDragging(allow);
        }
    },

    // Returns array of self intersecting polygons
    selfIntersectingPolygons: function(){
        var polygons = new Array();

        for(var i in this._polygons){
            if(this._polygons[i].selfIntersects()){
                polygons.push(this._polygons[i]);
            }
        }

        return polygons;
    }

}
var img_dir = '../src/images/'

var Polygon = function Polygon(map, name){
    this.name           = name;
    this.id_counter     = 0;
    this.map            = map;
    this._markers  = new Array();
    this._layers  = new L.LayerGroup().addTo(this.map);
    this.drag           = false;
    this.drag_end       = false;
    this.override_map_click = false;
    this.shapeClosed         = false; //line has been joined with start
    this.polygon_layer  = null;
    this.allow_dragging = false;

    // Map icons
    this.icon = {
        vertex: L.icon({
            iconUrl: img_dir + 'vertex.png',
            iconSize: [15, 15],
        }), 
        active: L.icon({
            iconUrl: img_dir + 'vertex-active.png',
            iconSize: [18, 18],
        }),
        inactive: L.icon({
            iconUrl: img_dir + 'vertex-inactive.png',
            iconSize: [15, 15],
        })
    };

    this._setVertexCursor(true);
}

Polygon.prototype = {
    getNumVertices: function(){
        return this._markers.length/2
    },

    setName: function(name){
        this.name = name;
        if(this.popup){
            this.popup.setContent(name);
        }
    },

    panToPolygon: function(){
        if(this.polygon_layer){
            this.map.fitBounds(this.polygon_layer.getBounds());
        }
    },

    clearAll: function(){
        // Clear layers
        var clear = this.polygon_layer? this.map.removeLayer(this.polygon_layer) : null;
        clear = this.line_layer? this.map.removeLayer(this.line_layer) : null
        this._layers.clearLayers();

        // Clear markers
        while(this._markers.length > 0){
            this._markers.pop();
        };

        // Close popup
        this.map.closePopup();

        this.shapeClosed = false;
        this.override_map_click = false;
    },

    getCoordinates: function(){
        var coords = new Array();
        var curr;
        for(var i in this._markers){
            curr = this._markers[i];

            if(curr.isActive()){
                coords.push(curr.getLatLng());
            }
        }
        return coords;
    },

    isSolid: function(){
        return this.shapeClosed;
    },

    enoughPointsToBeSolid: function(){
        if(this.isSolid()){
            return this._markers.length/2 >= 3;
        } 
        else{
            return this._markers.length >= 3
        }
    },

    isTriangle: function(){
        return this._markers.length/2 == 3;
    },

    onChange: function(f){
        this.polygon_layer.on('change', f)
    },

    buildMarker: function(latlng, type){
        var id = this.name + "_marker_" + this.id_counter++;

        var marker = new L.marker(latlng, {
            icon: this.icon[type],
            draggable: true,
            contextmenu: true,
            contextmenuItems: [{
                text: 'Delete',
                index: 0,
                callback: function(e){
                    this.deleteMarker(marker);
                },
                context: this
            }]
        });
        marker._leaflet_id = id;
        marker.type = type;

        marker.on('dragstart', this.onMarkerDragStart, this);
        marker.on('dragend', this.onMarkerDragEnd, this);
        marker.on('mouseover', this.onMarkerMouseOver, this);
        marker.on('mouseout', this.onMarkerMouseOut, this);
        marker.on('drag', this.onMarkerDrag, this);
        marker.on('click', this.onMarkerClick, this);

        // Add method to determine marker type
        marker.isActive = function(){
            return marker.type != 'inactive';
        }

        var popUpContent = "<span>{{coords}}<span>";
        
        popUpContent = popUpContent.replace(/{{coords}}/g, latlng.lat + ", " + latlng.lng);
        marker.bindPopup(popUpContent);
        return marker;
    },

    buildMidpointMarker: function(aLatLng, bLatLng){
        if(!aLatLng || !bLatLng){
            return null;
        }

        // find midpoint as new vertex point
        var midLat, midLng, midLatLng;
        
        midLat = (aLatLng.lat + bLatLng.lat)/2.0;
        midLng = (aLatLng.lng + bLatLng.lng)/2.0;
        midLatLng = L.latLng(midLat, midLng);

        return this.buildMarker(midLatLng, 'inactive');
    },

    addMarkerToLayer: function(marker){
        marker.addTo(this._layers),
        this._markers.push(marker);
    },

    equalMarkers: function(m1, m2){
        var ll1, ll2 
        if(m1 && m2){
            ll1 = m1.getLatLng();
            ll2 = m2.getLatLng();
            if (ll1 && ll2){
                return ll1.equals(ll2);
            }
        }

        return false;
    },

    createMarker: function (latlng, type) {
        if(!type){
            type = 'vertex';
        }
        var marker = this.buildMarker(latlng, type)

        this.addMarkerToLayer(marker);
        this.updateMidpoints();

        if (this._markers.length > 1) {
            this.updateShapes();
        }
    },

    deleteMarker: function (marker) {
        // Don't delete inactive markers or triangles (minimum polygon)
        if(!marker.isActive() || this.isTriangle()){
            return;
        }

        if (this._markers.length > 0) {
            var marker = marker;
            var id = marker._leaflet_id;

            // Find and remove marker from array
            for (var i = 0; i < this._markers.length; i++) {
                if (this._markers[i]._leaflet_id == id) {
                    this._markers.splice(i, 1);
                    break;
                }
            }
            // If no longer a solid, set flag
            if(!this.enoughPointsToBeSolid()){
                this.shapeClosed = false;
            }
            // Remove marker from later and redraw polygon
            this._layers.removeLayer(marker);
            this.updateMidpoints();
            this.updateShapes();
            
        }
    },

    updateMarkerType: function(marker, type){
        marker.type = type;
        marker.icon = this.icon[type];
        if(marker.isActive()){
            marker.contextmenu = true;
        }
    },

    deleteMidpoints: function(){
        // Remove all midpoint markers
        this._layers.eachLayer(function(e){
            if(!e.isActive()){
                this._layers.removeLayer(e);
                var m = this._markers.splice(this._markers.indexOf(e), 1);
            }
            else{
                var m = e;
            }
        }, this);
    },

    updateMidpoints: function(){
        // Remove midpoints
        this.deleteMidpoints();

        if(!this.isSolid() || this._markers.length < 2){
            return;
        }

        // Add new midpoints
        var prevMarker, prevLatLng, currMarker, currLatLng, midMarker, firstMarker;
        var newMarkers = new Array();

        for(var i = 0; i < this._markers.length; i++){
            currMarker = this._markers[i];
            if(!prevMarker){
                prevMarker = currMarker;
                firstMarker = currMarker;
            }
            else{
                prevLatLng = prevMarker.getLatLng();
                currLatLng = currMarker.getLatLng();
                midMarker = this.buildMidpointMarker(prevLatLng, currLatLng);
                newMarkers.push(midMarker);
            }

            newMarkers.push(currMarker);
            prevMarker = currMarker;

            // Midpoint between first and last marker
            if(i == this._markers.length-1 && firstMarker && currMarker){
                var lastMidpoint = this.buildMidpointMarker(currMarker.getLatLng(), firstMarker.getLatLng());
                newMarkers.push(lastMidpoint);
            }
        }

        this._layers.clearLayers();
        this._markers = new Array();
        for(var i in newMarkers){
            this.addMarkerToLayer(newMarkers[i]);
        }

        this.createPolygon();
    },

    onMarkerDragStart: function (e) {
        this.updateMarkerType(e.target, 'vertex')
        this.deleteMidpoints();
        this.drag = true;
    },

    onMarkerDragEnd: function (e) {
        this.drag = false;
        this.override_map_click = true;
        this.drag_end = true;
        this.updateMidpoints();
    },

    onMarkerMouseOver: function (e) {
        e.target.setIcon(this.icon.active);
    },

    onMarkerMouseOut: function (e) {
        e.target.setIcon(this.icon[e.target.type]);
    },

    onMarkerDrag: function(e) {
        if (this._markers.length > 1) { 
            var id = e.target._leaflet_id;
            var latlng = e.target.getLatLng();

            for (var i = 0; i < this._markers.length; i++) {
                if (this._markers[i]._leaflet_id == id) {
                    this._markers[i].setLatLng(latlng);

                    this.updateShapes();
                    break;
                }
            }
        }
    },

    onMarkerClick: function(e){
        if(this.equalMarkers(this._markers[0], e.target)){
            this.closeShape();
        }  
    },

    createLine: function(){
        var line_coords = new Array();
        var curr;
        for(var i in this._markers){
            curr = this._markers[i]
            if(curr.isActive){
                line_coords.push(curr.getLatLng());
            }
        }

        // Remove old layer
        if (this.line_layer != null) {
            this.map.removeLayer(this.line_layer);
        }
        
        this.line_layer = new L.Polyline(line_coords,{
            color: '#810541',
        })

        this.map.addLayer(this.line_layer);
    },

    createPolygon: function () {
        var polygon_coords = new Array();

        var prev, curr, mid;
        for (var i = 0; i < this._markers.length; i++) {
            curr = this._markers[i].getLatLng();
            polygon_coords.push(curr);
        }


        if (this.polygon_layer != null) {
            this.map.removeLayer(this.polygon_layer);
        }

        this.polygon_layer = new L.Polygon(polygon_coords,
        {   
            color: '#810541',
            fillColor: '#D462FF',
            fillOpacity: 0.5,
            contextmenu: true,
            contextmenuItems: [{
                text: 'Delete Area',
                index: 0,
                callback: function(e){
                    this.clearAll();
                },
                context: this
            }]
        });

        this.polygon_layer.dragging = new L.Handler.PolyDrag(this.polygon_layer);  

        this.map.addLayer(this.polygon_layer);

        this.polygon_layer.on('click', this.onPolygonClick, this);
        this.polygon_layer.on('dragstart', this.onPolygonDragStart, this);
        this.polygon_layer.on('dragend', this.onPolygonDragEnd, this);
        
        if(this.allow_dragging) {
            this.polygon_layer.dragging.enable();
        }

        if(this.create_polygon_callback){
            this.create_polygon_callback(this);
        }

    },

    setAllowDragging: function(allow){
        this.allow_dragging = allow;
        
        if(!this.polygon_layer){
            return;
        }

        if(allow){
            this.polygon_layer.dragging.enable();
        }
        else{
            this.polygon_layer.dragging.disable();
        }
    },

    openPopup: function(){
        // Open popup
        if(this.polygon_layer){
            var center = this.polygon_layer.getBounds().getCenter();
            this.popup = L.popup().setLatLng(center).setContent(this.name).openOn(this.map);
        }
    },

    updateShapes: function(){
        if(!this.isSolid()){
            if(this.polygon_layer){
                this.map.removeLayer(this.polygon_layer);
            }
            this.createLine();
        }
        else{
            this.map.removeLayer(this.line_layer);
            this.updatePolygon();
        }
    },

    updatePolygon: function(e){
        this.createPolygon();
    },

    updateMarkers: function(e){
        if (this._layers != null) {
            var polygon_coords = e.target._latlngs;

            var new_markers = new Array();
            var curr;
            for (var i = 0; i < polygon_coords.length; i++) {
                curr = this._markers[i];
                curr._latlng = polygon_coords[i];
                new_markers.push(curr);
            }

            // Remove old markers and add new ones
            this._layers.clearLayers();
            while(new_markers.length > 0){
                curr = new_markers.pop()
                curr.addTo(this._layers);
            }
        }
    },

    closeShape: function(){
        if(this.enoughPointsToBeSolid()){
            this._setVertexCursor(false);
            this.shapeClosed = true;
            this.updateMidpoints();
            this.updateShapes();
        }
    },

    setOnPolygonCreate: function(f){
        this.create_polygon_callback = f;
    },

    onPolygonClick: function(e){
        this.openPopup();
    },

    onPolygonDragStart: function (e) {
        if (this._layers) {
            this._layers.clearLayers();
        }
        this.drag = true;
    },

    onPolygonDragEnd: function (e) {
        this.updateMarkers(e);
        this.drag = false;
        this.override_map_click = true;
    },

    _setVertexCursor: function(show){
        if(show){
            $('.geofencer-map').css('cursor', 'url(' + img_dir + 'vertex-cursor.png) 7 7, auto');
        }
        else{
            $('.geofencer-map').css('cursor', '')
        }
    },

    _thisToJTS: function(){
        var jtsCoords = new Array();
        var coords = this.getCoordinates();
        for(var i = 0; i < coords.length; i++){
            var curr = coords[i];
            jtsCoords.push(new jsts.geom.Coordinate(curr.lat, curr.lng));
        }
        // push last coord to close poly
        jtsCoords.push(new jsts.geom.Coordinate(coords[0].lat, coords[0].lng));

        return jtsCoords;
    },

    // Returns true if polygon self-intersects. 
    // From http://engblog.nextdoor.com/post/86430627239/fast-polygon-self-intersection-detection-in-javascript
    selfIntersects: function(){
        var coords = this._thisToJTS();
        var geometryFactory = new jsts.geom.GeometryFactory();
        var shell = geometryFactory.createLinearRing(coords);
        var jstsPolygon = geometryFactory.createPolygon(shell);

        var validator = new jsts.operation.IsSimpleOp(jstsPolygon);
        if(validator.isSimpleLinearGeometry(jstsPolygon)){
            return false;
        }

        var res = new Array();
        var graph = new jsts.geomgraph.GeometryGraph(0, jstsPolygon);
        var cat = new jsts.operation.valid.ConsistentAreaTester(graph);
        var r = cat.isNodeConsistentArea();

        if(!r){
            var pt = cat.getInvalidPoint();
            res.push([pt.x, pt.y])
        }

        return res.length > 0;
    },

    setEditable: function(editable){
        this.setAllowDragging(editable)
        if(editable){
            this.map.addLayer(this._layers)
        }
        else{
            this.map.removeLayer(this._layers)
        }
    }
}

Geofencer.js
