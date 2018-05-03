'use strict';

module.exports = {
    port: process.env.PORT || 3004,
    secret: '8985058',
    validator: 'c1fd91ca5c98a45920d34dec9fa6c3462e0f8b17',
    // See all valid formats in: https://www.npmjs.com/package/bytes
    maxBodySize: process.env.MAX_BODY_SIZE || '50mb',
    floorPlans: process.env.FLOOR_PLANS ? JSON.parse(process.env.FLOOR_PLANS) : [{"name":"Terminal Billi","floor":null,"merakiCorners":[{"lng":-0.7007566259670723,"lat":44.8295250335519},{"lng":-0.6989086056,"lat":44.829533047},{"lng":-0.7007512832,"lat":44.8289053035},{"lng":-0.6989032628329279,"lat":44.82891331703426}],"mapwizeCorners":[{"lat":44.8295250335519,"lng":-0.7007566259670723},{"lat":44.829533047,"lng":-0.6989086056},{"lat":44.8289053035,"lng":-0.7007512832},{"lat":44.82891331703426,"lng":-0.6989032628329279}]}],
    macAddressEnabled: process.env.MAC_ADDRESS_ENABLED || false,
    redis: {
        host: 'redisAirportBOD.redis.cache.windows.net',
        port: process.env.REDIS_PORT || 6379,
        password: 'whP2NfpNI0RCmF9N5Ou1RUPGPkfvO0aWO/P+Mkob+p0=',
        merakiNotificationTTL: process.env.REDIS_MERAKI_NOTIF_TTL || 3600
    },
    documentDB: {
        enabled: true,
        endpoint: 'https://data-bziiit.documents.azure.com:443/',
        primaryKey: 'cf6UwuAFV6WfJVQSmTIPmBchGma2w6tzjIE09Hlln0BeUtXSTX1sZnk388wavJc95WumKnF0NZV1oHOZC4MguA==',
        database: 'shared-data-bziiit',
        collection: 'iot_meraki_bod'
    },
    mapwise: {
        user: 'cd@bziiit.com',
        password: 'bziiit2018',
        venueid: '5abd11f1bd863f0013eaffd2',
        organizationid: '5a68b8071a87c000133152a1',
        apikey: '0f77d2bcde1ca3d6707b86fe24c2b74b',
        apiurl: 'https://api.mapwize.io'
    },
    secret_hash: 'bodBZport'
};