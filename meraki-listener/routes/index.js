'use strict';

var _ = require('lodash');
var flatten = require('flat');
var net = require('net');
var fs = require('fs');

var config = require('../config/config');
var parcours = require('../utils/parcours');
var eventHub = require('../utils/eventhub');
var mapwize = require('../utils/mapwize');
var utils = require('../utils/index');
var logger = require('../utils/log');
var moment = require('moment-timezone');
const crypto = require('crypto');
var cache = require('../cache');

var ipExtractor = /^\/?(.+)/;
const datetime_format = 'YYYY-MM-DD HH:mm:ss' ;

/**
 * Default route
 */
exports.default = function (req, res) {
    res.status(200).send(config.validator);
};

/**
 * POST route that will process the notifications sent by a Meraki server
 * @param req
 * @param res
 */
exports.processMerakiNotifications = function (req, res) {
    var body = req.body;

    // Check secret sent by Meraki (if set)
    if ((!config.secret || config.secret === body.secret) && body.type === 'DevicesSeen') {

        // logger.log("Revceive Meraki Observations : "+req.body.data.observations.length+" Observations");
        
        _.each(req.body.data.observations, function (observation) {
            var globalObservation = _.merge({apMac: _.get(req.body.data, 'apMac'), apTags: _.get(req.body.data, 'apTags'), apFloors: _.get(req.body.data, 'apFloors')}, observation);
            var indoorLocation = mapwize.getIndoorLocation(globalObservation);
            var original_client_mac = globalObservation.clientMac ;
            indoorLocation.client_mac = original_client_mac ;

            // Check place
            indoorLocation.place = mapwize.checkPlace(globalObservation.apFloors,indoorLocation.latitude,indoorLocation.longitude);
            globalObservation.place = mapwize.checkPlace(globalObservation.apFloors,observation.location.lat,observation.location.lng);

            // Hash MAC address
            // var client_mac = crypto.createHmac('sha256',config.secret_hash).update(globalObservation.clientMac).digest('hex');
            // globalObservation.clientMac = client_mac ;
            // indoorLocation.client_mac = globalObservation.clientMac ;
            // indoorLocation.original_client_mac = original_client_mac ;
            
            /*
             IP address
            */             
            var ip = _.get(observation, 'ipv4') || 'null';
            ip = ip.match(ipExtractor)[1];

             /*
             Store in cache
             */
            if (!_.isEmpty(indoorLocation)) {
                indoorLocation.ip = ip ;
                cache.setObject(indoorLocation.client_mac,indoorLocation,config.merakiNotificationTTL);
            }

            // globalObservation.clientMac = client_mac ;
            // indoorLocation.client_mac = client_mac ;

            // Generate Random data
            // indoorLocation.place = _.sample(['Zone A','Zone B']);
            // globalObservation.seenEpoch = indoorLocation.timestamp ;
            
            // parcours.gestionParcours(indoorLocation,2);

            // // Do whatever you want with the observations received here
            // eventHub.sendMessage({
            //     client_mac : client_mac,
            //     indoorLocation_latitude : indoorLocation.latitude,
            //     indoorLocation_longitude : indoorLocation.longitude,
            //     indoorLocation_floor : indoorLocation.floor,
            //     indoorLocation_place : indoorLocation.place,

            //     merakiObservation_latitude : globalObservation.location.lat,
            //     merakiObservation_longitude : globalObservation.location.lng,
            //     merakiObservation_unc : globalObservation.location.unc,

            //     merakiObservation_seenEpoch : globalObservation.seenEpoch,
            //     merakiObservation_seenTime : moment.unix(globalObservation.seenEpoch).tz(config.timezone).format(datetime_format),
            //     merakiObservation_rssi : globalObservation.rssi,
            //     merakiObservation_place : globalObservation.place,
            //     merakiObservation_ssid : globalObservation.ssid,
            //     merakiObservation_apMac : globalObservation.apMac,

            //     secret: config.secret,
            //     message_type: 'brut'
            // });

        });

        res.status(200).end();
    }
    else if (config.secret && config.secret !== body.secret) {
        res.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Wrong secret, access forbidden' });
    }
    else if (body.type !== 'DevicesSeen') {
        res.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Wrong notification type' });
    }
    else {
        res.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Unknown error' });
    }
};