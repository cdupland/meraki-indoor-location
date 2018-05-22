'use strict';

var config = require('./config/config');
var mapwize = require('./utils/mapwize');

// Check required environment variables
if (!config.floorPlans) {
    throw 'Missing required parameter: FLOOR_PLANS';
}

mapwize.parseFloorPlans();

mapwize.getPlaces();

require('./config/express')();