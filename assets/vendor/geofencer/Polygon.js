    
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


    // Map icons
    var img_dir = 'assets/vendor/geofencer/images/'
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
        var clear = this.polygon_layer? this.map.removeLayer(this.polygon_layer) : this.map.removeLayer(this.line_layer);
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
        // Don't delete inactive markers
        if(!marker.isActive()){
            return;
        }

        if (this._markers.length > 1) {
            var marker = marker;
            var id = marker._leaflet_id;

            // Find and remove marker from array
            for (var i = 0; i < this._markers.length; i++) {
                if (this._markers[i]._leaflet_id == id) {
                    this._markers.splice(i, 1);
                    break;
                }
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

        if(!this.isSolid()){
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
            this._setVertexCursor(false);
            this.shapeClosed = true;
            this.updateMidpoints();
            this.updateShapes();
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
            fillOpacity: 0.5
        });

        this.polygon_layer.dragging = new L.Handler.PolyDrag(this.polygon_layer);  

        this.map.addLayer(this.polygon_layer);

        this.polygon_layer.on('click', this.onPolygonClick, this);
        this.polygon_layer.on('dragstart', this.onPolygonDragStart, this);
        this.polygon_layer.on('dragend', this.onPolygonDragEnd, this);
        this.polygon_layer.dragging.enable();

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
            $('.geofencer-map').css('cursor', 'url(assets/vendor/geofencer/images/vertex-cursor.png)7 7, auto');
        }
        else{
            $('.geofencer-map').css('cursor', '')
        }
    }
}
