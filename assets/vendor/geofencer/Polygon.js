    
var Polygon = function Polygon(map){
    var img_dir = 'assets/vendor/geofencer/images/';
    this.id_counter     = 0;
    this.map            = map;
    this.map.polygon    = this;
    this.array_markers  = new Array();
    this.layer_markers  = new L.LayerGroup().addTo(this.map);
    this.drag           = false;
    this.drag_end       = false;
    this.override_map_click = false;
    this.icon = {
        vertex: L.icon({
            iconUrl: img_dir + 'vertex.png',
            iconSize: [15, 15],
        }), 
        active: L.icon({
            iconUrl: img_dir + 'vertex-active.png',
            iconSize: [18, 18],
        }),
        ghost: L.icon({
            iconUrl: img_dir + 'vertex-ghost.png',
            iconSize: [10, 10],
        })
    }
}

// folder of marker images
var img_dir = 'assets/vendor/geofencer/images/'

Polygon.prototype = {
    make_marker: function(latlng, type){
        var marker = new L.Marker(latlng, {
            icon: this.icon[type],
            draggable: true
        });
        var id = "marker_" + this.id_counter++;
        marker._leaflet_id = id;
        marker.type = type;

        marker.on('dragstart', this.onMarkerDragStart, this);
        marker.on('dragend', this.onMarkerDragEnd, this);
        marker.on('mouseover', this.onMarkerMouseOver, this);
        marker.on('mouseout', this.onMarkerMouseOut, this);
        marker.on('drag', this.onMarkerDrag, this);
        marker.on('click', this.onMarkerClick, this);
        marker.bindPopup("Marker " + id);
        return marker;
    },

    make_midpoint_marker: function(aLatLng, bLatLng){
        if(!aLatLng || !bLatLng){
            return null;
        }

        // find midpoint as new vertex point
        var midLat, midLng, midLatLng;
        
        midLat = (aLatLng.lat + bLatLng.lat)/2.0;
        midLng = (aLatLng.lng + bLatLng.lng)/2.0;
        midLatLng = L.latLng(midLat, midLng);

        return this.make_marker(midLatLng, 'ghost');
    },

    add_midpoint_marker: function(marker){

    },

    add_marker_to_layer: function(marker){
        marker.addTo(this.layer_markers),
        this.array_markers.push(marker);
    },

    create_marker: function (latlng, type) {
        if(!type){
            type = 'vertex';
        }
        var marker = this.make_marker(latlng, type)

        this.add_marker_to_layer(marker);
        this.update_midpoints();

        if (this.array_markers.length > 1) {
            this.create_polygon();
        }
    },

    changeMarkerType: function(marker, type){
        if(marker.type != type){
            marker.type = type;
            marker.icon = this.icon[type];
        }
    },

    remove_midpoints: function(){
        // Remove all midpoint markers
        var midpoint_type = 'ghost';
        this.layer_markers.eachLayer(function(e){
            if(e.type == midpoint_type){
                this.layer_markers.removeLayer(e);
                var m = this.array_markers.splice(this.array_markers.indexOf(e), 1);
            }
            else{
                var m = e;
            }
        }, this);
    },

    update_midpoints: function(){
        // Remove midpoints
        this.remove_midpoints();

        // Add new midpoints
        var prevMarker, prevLatLng, currMarker, currLatLng, midMarker, firstMarker;
        var newMarkers = new Array();

        for(var i = 0; i < this.array_markers.length; i++){
            currMarker = this.array_markers[i];
            if(!prevMarker){
                prevMarker = currMarker;
                firstMarker = currMarker;
            }
            else{
                prevLatLng = prevMarker.getLatLng();
                currLatLng = currMarker.getLatLng();
                midMarker = this.make_midpoint_marker(prevLatLng, currLatLng);
                newMarkers.push(midMarker);
            }

            newMarkers.push(currMarker);
            prevMarker = currMarker;

            // Midpoint for first and last
            if(i == this.array_markers.length-1 && firstMarker && currMarker){
                var lastMidpoint = this.make_midpoint_marker(currMarker.getLatLng(), firstMarker.getLatLng());
                newMarkers.push(lastMidpoint);
            }
        }

        this.layer_markers.clearLayers();
        this.array_markers = new Array();
        for(var i in newMarkers){
            this.add_marker_to_layer(newMarkers[i]);
        }

        this.create_polygon();
    },

    onMarkerDragStart: function (e) {
        this.remove_midpoints();
        this.drag = true;
    },

    onMarkerDragEnd: function (e) {
        this.drag = false;
        this.override_map_click = true;
        this.drag_end = true;
        this.update_midpoints();
    },

    onMarkerMouseOver: function (e) {
        e.target.setIcon(this.icon.active);
    },

    onMarkerMouseOut: function (e) {
        e.target.setIcon(this.icon[e.target.type]);
    },

    onMarkerDrag: function(e) {
        var self = this;

        this.changeMarkerType(e.target, 'vertex')

        if (self.array_markers.length > 1) { 
            var id = e.target._leaflet_id;
            var latlng = e.target.getLatLng();

            for (var i = 0; i < self.array_markers.length; i++) {
                if (self.array_markers[i]._leaflet_id == id) {
                    self.array_markers[i].setLatLng(latlng);

                    self.create_polygon();
                    break;
                }
            }
        }
    },

    onMarkerClick: function (e) {
        if(this.drag_end){
            this.drag_end = false;
            return;
        }
        var self = this;

        if (self.array_markers.length > 1) {
            var marker = e.target;
            var id = marker._leaflet_id;

            // Find and remove marker from array
            for (var i = 0; i < self.array_markers.length; i++) {
                if (self.array_markers[i]._leaflet_id == id) {
                    self.array_markers.splice(i, 1);
                    break;
                }
            }

            // Remove marker from later and redraw polygon
            this.layer_markers.removeLayer(marker);
            this.update_midpoints();
            self.create_polygon();
        }
    },

    create_polygon: function () {
        var polygon_coords = new Array();

        var prev, curr, mid;
        for (var i = 0; i < this.array_markers.length; i++) {
            curr = this.array_markers[i].getLatLng();
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
        this.polygon_layer.on('dragstart', this.onPoligonDragStart);
        this.polygon_layer.on('dragend', this.onPoligonDragEnd, this);
        this.polygon_layer.dragging.enable();

        // Create popup
        this.polygon_layer.bindPopup('Polygon');
    },

    onPolygonClick: function(e){
        e.target.openPopup();
    },

    onPoligonDragStart: function (e) {
        var self = Polygon;
        if (self.layer_markers != null) {
            self.map.removeLayer(self.layer_markers);
        }

        self.drag = true;
    },

    onPoligonDragEnd: function (e) {
        if (this.layer_markers != null) {
            var polygon_coords = e.target._latlngs;

            var new_markers = new Array();
            var curr;
            for (var i = 0; i < polygon_coords.length; i++) {
                curr = this.array_markers[i];
                curr._latlng = polygon_coords[i];
                new_markers.push(curr);
            }

            // Remove old markers and add new ones
            this.layer_markers.clearLayers();
            while(new_markers.length > 0){
                curr = new_markers.pop()
                curr.addTo(this.layer_markers);
            }

            this.drag = false;
            this.override_map_click = true;
        }
    }
}
