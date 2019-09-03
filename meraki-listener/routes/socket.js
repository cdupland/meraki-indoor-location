'use strict';

var _ = require('lodash');

var utils = require('../utils');
var cache = require('../cache');

/**
 * Once a connection is opened, we will subscribe to redis notifications for detecting
 * any location change for a given user.
 * To receive notifications, redis needs to be configured via the notify-keyspace-events parameter set to 'K$'.
 */
module.exports = function (socket) {
    socket.mac = _.get(socket, 'handshake.query.mac', null);
    // socket.allObs = _.get(socket, 'handshake.query.allObs', null);

//    if (!socket.allObs) {
    if (!socket.mac) {
        socket.emit('error', new Error('Unknown user'));
        socket.disconnect(true);
    }

    // We sent the last known user position if it exists
    // cache.getObject(`${socket.userId}`, function (err, indoorLocation) {
    // cache.getObject(`${socket.mac}`, function (err, indoorLocation) {
    //     if (!err && indoorLocation) {
    //         // utils.sendIndoorLocationTo(indoorLocation, socket.userId);
    //     }
    // });

    var subscriber = cache.subscribe(socket.mac);
    // var subscriber = cache.subscribe(socket.allObs);
    socket.on('disconnect', function () {
        subscriber.quit();
    });
    subscriber.on('update', function (indoorLocation) {
        if (indoorLocation) {
            utils.sendIndoorLocationTo(indoorLocation,socket.mac);
            // utils.sendIndoorLocationTo(indoorLocation);
        }
    });
};