'use strict';

var utf8 = require('utf8');
var crypto = require('crypto');
var config = require('../config/config');
var request = require("request");
var logger = require('../utils/log');

var token = createSharedAccessToken(config.eventHub.uri,config.eventHub.saName,config.eventHub.saKey);

// Generate Access Signature
function createSharedAccessToken(uri, saName, saKey) {
    if (!uri || !saName || !saKey) {
        throw "Missing required parameter";
    }
    var encoded = encodeURIComponent(uri);
    var now = new Date();
    var week = 60*60*24*7;
    var ttl = Math.round(now.getTime() / 1000) + week;
    var signature = encoded + '\n' + ttl;
    var signatureUTF8 = utf8.encode(signature);
    var hash = crypto.createHmac('sha256', saKey).update(signatureUTF8).digest('base64');
    return 'SharedAccessSignature sr=' + encoded + '&sig=' +
        encodeURIComponent(hash) + '&se=' + ttl + '&skn=' + saName;
}


exports.sendMessage = function (msg){
    var options = {
        method: 'POST',
        url: config.eventHub.uri+'/'+config.eventHub.eventHubName+'/messages',
        headers:{
            authorization: token,
            'content-type': 'application/json'
        },
        body: msg,
        json: true
    };

    request(options, function (error, response, body) {
        if (error) logger.error(error);
        // console.log(response); // response.statusCode
        // console.log(response.statusMessage); // response.statusCode
        // 401 : Unauthorized (Bad Authorization)
    });
};