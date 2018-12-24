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
var moment = require('moment');
const crypto = require('crypto');

var ipExtractor = /^\/?(.+)/;


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

        _.each(req.body.data.observations, function (observation) {
            var globalObservation = _.merge({apMac: _.get(req.body.data, 'apMac'), apTags: _.get(req.body.data, 'apTags'), apFloors: _.get(req.body.data, 'apFloors')}, observation);
            var indoorLocation = mapwize.getIndoorLocation(globalObservation);

            // Hash MAC address
            var client_mac = crypto.createHmac('sha256',config.secret_hash).update(globalObservation.clientMac).digest('hex');
            globalObservation.clientMac = client_mac ;
            indoorLocation.client_mac = client_mac ;

            // Check place
            // indoorLocation.place = mapwize.checkPlace(globalObservation.apFloors,indoorLocation.latitude,indoorLocation.longitude);
            // globalObservation.place = mapwize.checkPlace(globalObservation.apFloors,observation.location.lat,observation.location.lng);

            // Generate Random data
            // indoorLocation.place = _.sample(['Zone A','Zone B']);
            globalObservation.seenEpoch = indoorLocation.timestamp ;
            
            parcours.gestionParcours(indoorLocation,2);

            // Do whatever you want with the observations received here
            eventHub.sendMessage({
                client_mac : client_mac,
                indoorLocation_latitude : indoorLocation.latitude,
                indoorLocation_longitude : indoorLocation.longitude,
                indoorLocation_floor : indoorLocation.floor,
                indoorLocation_place : indoorLocation.place,

                merakiObservation_latitude : globalObservation.location.lat,
                merakiObservation_longitude : globalObservation.location.lng,
                merakiObservation_unc : globalObservation.location.unc,

                merakiObservation_seenEpoch : globalObservation.seenEpoch,
                merakiObservation_rssi : globalObservation.rssi,
                merakiObservation_place : globalObservation.place,
                merakiObservation_ssid : globalObservation.ssid,
                apMac : globalObservation.apMac,

                secret: config.secret,
                message_type: 'brut'
            });

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