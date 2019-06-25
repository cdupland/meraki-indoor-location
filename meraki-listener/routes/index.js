'use strict';

var _ = require('lodash');
var flatten = require('flat');
var net = require('net');
var fs = require('fs');

var config = require('../config/config');
var eventHub = require('../utils/eventhub');
var mapwize = require('../utils/mapwize');
var utils = require('../utils/index');
const crypto = require('crypto');
var cache = require('../cache');
var moment = require("moment-timezone");

var ipExtractor = /^\/?(.+)/;
const datetime_format = "YYYY-MM-DD HH:mm:ss" ;

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
            // Check place
            indoorLocation.place = mapwize.checkPlace(globalObservation.apFloors,indoorLocation.latitude,indoorLocation.longitude);
            globalObservation.place = mapwize.checkPlace(globalObservation.apFloors,observation.location.lat,observation.location.lng);

            // Hash MAC address
            globalObservation.clientMac = crypto.createHmac('sha256',config.secret_hash).update(globalObservation.clientMac).digest('hex');
            indoorLocation.client_mac = globalObservation.clientMac ;
            
            if (!_.isEmpty(indoorLocation)) {
                cache.setObject(indoorLocation.client_mac,indoorLocation,config.merakiNotificationTTL);
            }

            // console.log(globalObservation.seenTime);
            // console.log(moment(globalObservation.seenTime));
            // console.log(moment(globalObservation.seenTime).tz(config.timezone).format(datetime_format));
            
            globalObservation.seenTimeUTC = globalObservation.seenTime ;
            globalObservation.seenTime = moment(globalObservation.seenTime).tz(config.timezone).format(datetime_format);
            
            // Do whatever you want with the observations received here
            eventHub.sendMessage({
                indoorLocation: indoorLocation,
                merakiObservation: globalObservation,
                merakiObservation_latitude : globalObservation.location.lat,
                merakiObservation_longitude : globalObservation.location.lng,
                merakiObservation_unc : globalObservation.location.unc,
                secret: config.secret
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