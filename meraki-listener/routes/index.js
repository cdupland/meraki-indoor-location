'use strict';

var _ = require('lodash');
var flatten = require('flat');
var net = require('net');
var fs = require('fs');

var config = require('../config/config');
var documentDB = require('../utils/documentdb');
var mapwize = require('../utils/mapwize');
var redis = require('../utils/redis');
var utils = require('../utils/index');
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

        // Prepare for MAC Addr Hash
        var d = new Date();
        var str_date_hour = d.getFullYear()+''+d.getMonth()+''+d.getDay()+''+d.getHours();
        var secret_hour = config.secret_hash+str_date_hour ;

        _.each(req.body.data.observations, function (observation) {
            var globalObservation = _.merge({apMac: _.get(req.body.data, 'apMac'), apTags: _.get(req.body.data, 'apTags'), apFloors: _.get(req.body.data, 'apFloors')}, observation);
            var ip = _.get(observation, 'ipv4') || 'null';
            ip = ip.match(ipExtractor)[1];

            var indoorLocation = mapwize.getIndoorLocation(globalObservation);

            // Store the indoorLocation into a Redis cache if an indoorLocation exists, and if the extracted ip and/or macAddress are valid
            if (!_.isEmpty(indoorLocation)) {
                if (net.isIP(ip) === 4) {
                    redis.setObject(ip, indoorLocation, config.redis.merakiNotificationTTL);
                }

                if (config.macAddressEnabled.toString() === 'true' && observation.clientMac) {
                    redis.setObject(observation.clientMac, indoorLocation, config.redis.merakiNotificationTTL);
                }
            }


            // Check place
            var place = mapwize.checkPlace(indoorLocation.latitude,indoorLocation.longitude);

            // Hash MAC address
            globalObservation.clientMac = crypto.createHmac('sha256',secret_hour).update(globalObservation.clientMac).digest('hex');

            // Do whatever you want with the observations received here
            // As an example, we log the indoorLocation along with the Meraki observation
            // into a DocumentDB collection if enabled
            // All object properties are flatten to ease any further analysis
            if (config.documentDB.enabled.toString() === 'true') {
                documentDB.insertDocument(flatten({
                    indoorLocation: indoorLocation,
                    merakiObservation: globalObservation,
                    deviceId: globalObservation.clientMac,
                    place: place
                },{delimiter:'_'}));
            }

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