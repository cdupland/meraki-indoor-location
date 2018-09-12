'use strict';

var _ = require('lodash');

function log() {
    console.log(arguments);
};
exports.log = log;

var SphericalMercator = (function(){
// Closures including constants and other precalculated values.
    var cache = {},
        EPSLN = 1.0e-10,
        D2R = Math.PI / 180,
        R2D = 180 / Math.PI,
        // 900913 properties.
        A = 6378137.0,
        MAXEXTENT = 20037508.342789244;


    function SphericalMercator() {};

    // Convert lon/lat values to 900913 x/y.
    SphericalMercator.prototype.forward = function(ll) {
        var xy = [
            A * ll[0] * D2R,
            A * Math.log(Math.tan((Math.PI*0.25) + (0.5 * ll[1] * D2R)))
        ];
        // if xy value is beyond maxextent (e.g. poles), return maxextent.
        (xy[0] > MAXEXTENT) && (xy[0] = MAXEXTENT);
        (xy[0] < -MAXEXTENT) && (xy[0] = -MAXEXTENT);
        (xy[1] > MAXEXTENT) && (xy[1] = MAXEXTENT);
        (xy[1] < -MAXEXTENT) && (xy[1] = -MAXEXTENT);
        return xy;
    };

    return SphericalMercator;

})();

/*
 Return true if point is inside polygon
 arguments:
 - point = [x,y] an array with 2 coordinates
 - vs = [[x,y], [x, y]] an of array with 2 coordinates
 */
function isInside(point, vs) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

    var x = point[0], y = point[1];

    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0], yi = vs[i][1];
        var xj = vs[j][0], yj = vs[j][1];

        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
};

//GEOJSON for both point and polygon --> [Longitude, latitude]
function isInsideGeoJson(point, polygon) {

    var merc = new SphericalMercator();

    var xyPoint = merc.forward(point);
    var xyPolygon = [];
    polygon.forEach(function(p){
        xyPolygon.push(merc.forward(p));
    });

    return isInside(xyPoint, xyPolygon);
}

function checkPlaces(appFloor,latlng,places){
    var _room = '' ;
    _.each(places,function(place){
        var polygon = place.geometry.coordinates[0] ;
        if(appFloor === place.floor && isInsideGeoJson([ latlng[0],latlng[1] ], polygon) )
            _room = place.name ;
    });
    return _room ;
}
exports.checkPlaces = checkPlaces ;