    
var Polygon = function Polygon(map){
    var img_dir = 'assets/vendor/geofencer/images/';
    this.map            = map;
    this.map.polygon    = this;
    this.array_markers  = new Array();
    this.layer_markers  = new L.LayerGroup();
    this.drag           = false;
    this.override_map_click = false;
    this.icon = {
        vertex: L.icon({
            iconUrl: img_dir + 'vertex.png',
            iconSize: [15, 15],
        })
    }
}

// folder of marker images
var img_dir = 'assets/vendor/geofencer/images/'

Polygon.prototype = {
    create_marker: function (latlng) {
        var marker = new L.Marker(latlng, {
            icon: this.icon.vertex,
            draggable: true
        });

        var d = new Date();
        var n = d.getTime();

        marker._leaflet_id = "marker_" + n.toString();

        var self = this;

        marker.on('dragstart', this.onMarkerDragStart);
        marker.on('dragend', this.onMarkerDragEnd);
        marker.on('mouseover', this.onMarkerMouseOver);
        marker.on('mouseout', this.onMarkerMouseOut);
        marker.on('drag', this.onMarkerDrag);
        marker.on('click', this.onMarkerClick);

        marker.polygon = this;

        marker.addTo(this.layer_markers),

        this.array_markers.push(marker);

        //this.map.addLayer(marker);
        this.map.removeLayer(this.layer_markers);
        this.map.addLayer(this.layer_markers);

        if (this.array_markers.length > 1) {
                this.create_polygon();
        }
    },

    onMarkerDragStart: function (e) {
        var self = this.polygon;
        self.drag = true;
    },

    onMarkerDragEnd: function (e) {
        var self = this.polygon;

        self.drag = false;
        self.override_map_click = true;

    },

    onMarkerMouseOver: function (e) {
    },

    onMarkerMouseOut: function (e) {
    },

    onMarkerDrag: function(e) {
        var self = this.polygon;

        if (self.array_markers.length > 1) { 
            var id_marker_pulsado = e.target._leaflet_id;
            var coordenadas_voy = e.target._latlng;

            for (var i = 0; i < self.array_markers.length; i++) {
                if (self.array_markers[i]._leaflet_id == id_marker_pulsado) {
                    self.array_markers[i]._latlng = coordenadas_voy;

                    self.create_polygon();
                    break;
                }
            }
        }
    },

    onMarkerClick: function (e) {
        var self = this.polygon;

        if (self.array_markers.length > 1) {
            var marker_pulsado = e.target;
            var marker_pulsado_id = marker_pulsado._leaflet_id;

            for (var i = 0; i < self.array_markers.length; i++) {
                if (self.array_markers[i]._leaflet_id == marker_pulsado_id) {
                    self.array_markers.splice(i, 1);
                    break;
                }
            }

            self.map.removeLayer(marker_pulsado);
            self.map.removeLayer(self.layer_markers);

            self.layer_markers = new L.LayerGroup();
            for (var i = 0; i < self.array_markers.length; i++) {
                self.array_markers[i].addTo(self.layer_markers);
            }
            self.map.addLayer(self.layer_markers);

            self.create_polygon();
        }

    },

    create_polygon: function () {
        var array_coordinates = new Array();

        for (var i = 0; i < this.array_markers.length; i++) {
            array_coordinates.push(this.array_markers[i]._latlng)
        }

        if (this.polygon_layer != null) {
            this.map.removeLayer(this.polygon_layer);
        }

        this.polygon_layer = new L.Polygon(array_coordinates,
        {   
            color: '#810541',
            fillColor: '#D462FF',
            fillOpacity: 0.5
        }
        );

        this.polygon_layer.dragging = new L.Handler.PolyDrag(this.polygon_layer);  
        //POLYDRAG source from:JPK   SOURCE: https://github.com/thatjpk/leaflet.polydrag/blob/master/index.html

        this.map.addLayer(this.polygon_layer);

        this.polygon_layer.on('dragstart', this.onPoligonDragStart);
        this.polygon_layer.on('dragend', this.onPoligonDragEnd, this);
        this.polygon_layer.dragging.enable();
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
