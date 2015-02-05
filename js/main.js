$(function() {  

    // var totalLatLng = '';
    var totalLatLng = '(24.99539, 121.51033)|(25.02277, 121.53368)|(25.05295, 121.49935)|(25.01624, 121.44579)|(24.99508, 121.48252)';
    totalLatLng = "(24.958670130576788, 121.54380798339844)|(25.00721721376883, 121.57539367675781)|(25.048280535236525, 121.63719177246094)| (25.048280535236525, 121.55067443847655)| (25.066319162978587, 121.50329589843749)| (25.042681800625747, 121.47377014160155)| (25.066319162978587, 121.43394470214844)| (25.06880704116911, 121.38313293457031)| (25.053256973596127, 121.30828857421875)| (25.003483503351507, 121.2403106689453)| (24.958047607668494, 121.18400573730469)| (24.886436490787712, 121.25473022460936)| (24.870240390088835, 121.31034851074219)| (24.900139225095582, 121.40853881835936)| (24.937502586022006, 121.45866394042967)|"
    totalLatLng = "(2.67968661580376,109.16015624999999)|(1.472006010190348,108.80859375)|(-0.373532510228792,109.97314453125)|(0.32958802605356885,113.75244140624999)|(2.5479878714713706,116.8505859375)|(4.105369348495178,118.71826171875)|(5.090944175033399,119.64111328125)|(6.315298538330033,118.14697265625)|(7.536764322084078,117.72949218749999)|(7.340674831854924,116.69677734375)|(6.075011000682009,115.26855468749999)|(5.178482088522876,114.36767578124999)|(4.017699464336852,113.02734374999999)|(2.6138389710984824,110.61035156249999)"
    var map        = null;
    var polygon    = null;
    var draggable  = true;

    initialize();
    
    function initialize() {
        // Create map and polygon for map
        map     = new GeofencingMap('map').map;
        polygon = new MultiPolygon(map, $('#polygon-name').val());

        var coords = new Array();
        // Add markers for polygon coordinates
        var splitLatLng = totalLatLng.split("|");
        for(var i = 0; i < splitLatLng.length; i++){
            var latlng = splitLatLng[i].trim().substring(1, splitLatLng[i].length-1).split(",");
            if(latlng.length > 1){
               coords.push(L.latLng(latlng[0], latlng[1]));
            }
        }

        polygon.addPolygon(coords, true)
        polygon.setCreatePolygonsCallback(updateDetails);
        polygon.setAllowDragging(draggable)
        polygon.setEditable(true);
        
        // Update coordinates displayed on 'C' press
        updateCoords();
        $(window).keyup(function(e){
            if(e.keyCode == 67){
                updateCoords();
            }
        })

        $('#allow-dragging').click(function(){
            draggable = !draggable;
            polygon.setAllowDragging(draggable);
            if(draggable){
                $(this).html('Disable Dragging')
            }
            else{
                $(this).html('Enable Dragging')

            }
        });

        $('#new-polygon').click(function(){
            polygon.createNewPolygon();
        });

        $('#clear-all').click(function(){
            polygon.deleteAllPolygons();
        });

        $('#update-polygon').click(function(){
            polygon.setName($('#polygon-name').val());
            polygon.panToPolygon();
        });
    }

    function updateDetails(p){
        updateCoords();
    }

    function updateCoords(e){
        var polys = polygon.getPolygons();
        var multi_coords = polygon.getPolygonCoordinates();
        $('.coords').empty();

        for (var j in multi_coords){
            var name = $('<h3>' + polys[j].name + '</h3>').addClass(polys[j].name);
            if(polys[j].selfIntersects()){
                name.css('color', 'red')
            }

            $('.coords').append(name);
            var coords = multi_coords[j];
            for (var i in coords){
                var c = $('<li>').html(coords[i].lat + ", " + coords[i].lng);
                $('.coords').append(c);
            }

        }
    }
});