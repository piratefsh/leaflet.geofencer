    
var Polygon = function Polygon(map){
    var img_dir = 'assets/vendor/geofencer/images/';
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
        var d = new Date();
        var n = d.getTime();
        marker._leaflet_id = "marker_" + n.toString();
        marker.type = type;

        marker.on('dragstart', this.onMarkerDragStart, this);
        marker.on('dragend', this.onMarkerDragEnd, this);
        marker.on('mouseover', this.onMarkerMouseOver, this);
        marker.on('mouseout', this.onMarkerMouseOut, this);
        marker.on('drag', this.onMarkerDrag, this);
        marker.on('click', this.onMarkerClick, this);
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

    create_marker: function (latlng, type) {
        if(!type){
            type = 'vertex';
        }
        var marker = this.make_marker(latlng, type)

        // Add midpoint marker
        var prevMarker, prevLatLng, midMarker;
        var currLatLng = latlng;

        prevMarker = this.array_markers[this.array_markers.length-1]

        if(prevMarker){
            prevLatLng = prevMarker.getLatLng();
            midMarker = this.make_midpoint_marker(prevLatLng, currLatLng);
            midMarker.addTo(this.layer_markers),
            this.array_markers.push(midMarker);
        }

        marker.addTo(this.layer_markers),
        this.array_markers.push(marker);

        if (this.array_markers.length > 1) {
            this.create_polygon();
        }
    },

    changerMarkerType: function(marker, type){
        if(marker.type != type){
            marker.type = type;
            marker.icon = this.icon[type];
        }
    },

    updateMidpoints: function(){
        // Remove all midpoints
    },

    onMarkerDragStart: function (e) {
        this.drag = true;
    },

    onMarkerDragEnd: function (e) {
        this.drag = false;
        this.override_map_click = true;
        this.drag_end = true;
    },

    onMarkerMouseOver: function (e) {
        e.target.setIcon(this.icon.active);
    },

    onMarkerMouseOut: function (e) {
        e.target.setIcon(this.icon[e.target.type]);
    },

    onMarkerDrag: function(e) {
        var self = this;

        this.changerMarkerType(e.target, 'vertex')

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

            for (var i = 0; i < self.array_markers.length; i++) {
                if (self.array_markers[i]._leaflet_id == id) {
                    self.array_markers.splice(i, 1);
                    break;
                }
            }

            this.layer_markers.removeLayer(marker);

            self.create_polygon();
        }

    },

    create_polygon: function () {
        var array_coordinates = new Array();

        var prev, curr, mid;
        for (var i = 0; i < this.array_markers.length; i++) {
            curr = this.array_markers[i].getLatLng();
            

            // if (!prev){
            //     prev = curr;
            // }
            // else{
            //     // find midpoint as new vertex point
            //     var midLat = (prev.lat + curr.lat)/2.0;
            //     var midLng = (prev.lng + curr.lng)/2.0;
            //     mid = L.latLng(midLat, midLng);

            //     array_coordinates.push(mid)
            //     // this.add_marker(mid, 'ghost')
            //     prev = curr;
            // }
            array_coordinates.push(curr);
        }


        if (this.polygon_layer != null) {
            this.map.removeLayer(this.polygon_layer);
        }

        this.polygon_layer = new L.Polygon(array_coordinates,
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

            var new_markers = new L.LayerGroup();
            
            for (var i = 0; i < polygon_coords.length; i++) {
                this.array_markers[i]._latlng = polygon_coords[i];
                this.array_markers[i].addTo(new_markers);
            }
            
            this.map.removeLayer(this.layer_markers);
            this.layer_markers = new_markers
            this.map.addLayer(this.layer_markers);

            this.drag = false;
            this.override_map_click = true;
        }
    }
}
