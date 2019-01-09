'use strict';

var NodeCache = require('node-cache');
var EventEmitter = require('events');

var utils = require('../utils/index');
var logger = require('../utils/log');

utils.log('Using in-memory node-cache');

var cache = new NodeCache({
    // checkperiod : 0.5,
    // deleteOnExpire : false,
    // errorOnMissing : true
});

function setObject(key, obj, ttl) {
    cache.set(key, JSON.stringify(obj), ttl);
};
exports.setObject = setObject;

function getObject(key, callback) {
    cache.get(key, function(err, reply) {
        if(err) logger.error(err);
        callback(err, reply ? JSON.parse(reply) : null);
    });
};
exports.getObject = getObject;

// function getTTL(key){
//     console.log(key,new Date(cache.getTtl(key)));
// }
// exports.getTTL = getTTL ;

// cache.on("expired", function( key, value ){
//     console.log('deleting',new Date());
//     cache.del(key,function(){
//         console.log("Cache deleted : "+key);
//     });
// });

exports.subscribe = function(key) {
    var subscriber = new EventEmitter();

    var listener =  function (_key, _value) {
        if (key == _key) {
            subscriber.emit('update', _value ? JSON.parse(_value) : null);
        }
    };

    cache.on('set', listener);

    subscriber.quit = function(){
        cache.removeListener('set', listener);
    };

    return subscriber;
};
