$(function() {  

    // var totalLatLng = '';
    var totalLatLng = '(24.99539, 121.51033)|(25.02277, 121.53368)|(25.05295, 121.49935)|(25.01624, 121.44579)|(24.99508, 121.48252)';
    totalLatLng = "(24.958670130576788, 121.54380798339844)|(25.00721721376883, 121.57539367675781)|(25.048280535236525, 121.63719177246094)| (25.048280535236525, 121.55067443847655)| (25.066319162978587, 121.50329589843749)| (25.042681800625747, 121.47377014160155)| (25.066319162978587, 121.43394470214844)| (25.06880704116911, 121.38313293457031)| (25.053256973596127, 121.30828857421875)| (25.003483503351507, 121.2403106689453)| (24.958047607668494, 121.18400573730469)| (24.886436490787712, 121.25473022460936)| (24.870240390088835, 121.31034851074219)| (24.900139225095582, 121.40853881835936)| (24.937502586022006, 121.45866394042967)|"
    var map        = null;
    var polygon    = null;

    initialize();
    
    function initialize() {
        // Create map and polygon for map
        map     = new GeofencingMap('map').map;
        polygon = new Polygon(map, $('#polygon-name').val());

        // Add markers for polygon coordinates
        var splitLatLng = totalLatLng.split("|");
        for(var i = 0; i < splitLatLng.length; i++){
            var latlng = splitLatLng[i].trim().substring(1, splitLatLng[i].length-1).split(",");
            if(latlng.length > 1){
                polygon.createMarker(L.latLng(latlng[0], latlng[1]));
            }
        }

        polygon.openPopup();
        
        // Update coordinates displayed on 'C' press
        updateCoords();
        $(window).keyup(function(e){
            if(e.keyCode == 67){
                updateCoords();
            }
        })

        $('#clear-all').click(function(){
            polygon.clearAll();
        })
        $('#update-polygon').click(function(){
            polygon.setName($('#polygon-name').val());
        })
    }

    function updateCoords(e){
        var coords = polygon.getCoordinates();
        $('.coords').empty();

        for (var i in coords){
            var c = $('<li>').html(coords[i].lat + ", " + coords[i].lng);
            $('.coords').append(c);
        }
    }
});