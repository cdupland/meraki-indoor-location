'use strict';

module.exports = {
    port: process.env.PORT || 3004,
    secret: process.env.SECRET,
    validator: process.env.VALIDATOR,
    // See all valid formats in: https://www.npmjs.com/package/bytes
    maxBodySize: process.env.MAX_BODY_SIZE || '50mb',
    floorPlans: process.env.FLOOR_PLANS ? JSON.parse(process.env.FLOOR_PLANS) : [],
    macAddressEnabled: process.env.MAC_ADDRESS_ENABLED || false,
    redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_AUTH,
        merakiNotificationTTL: process.env.REDIS_MERAKI_NOTIF_TTL || 3600
    },
    documentDB: {
        enabled: process.env.DOCUMENT_DB_ENABLED,
        endpoint: process.env.DOCUMENT_DB_ENDPOINT,
        primaryKey: process.env.DOCUMENT_DB_PRIMARY_KEY,
        database: process.env.DOCUMENT_DB_DATABASE,
        collection: process.env.DOCUMENT_DB_COLLECTION
    },
    mapwise: {
        user: process.env.MAPWISE_USER,
        password: process.env.MAPWISE_PASSWORD,
        venueid: process.env.MAPWISE_VENUEID,
        organizationid: process.env.MAPWISE_ORGANIZATIONID,
        apikey: process.env.MAPWISE_APIKEY,
        apiurl: process.env.MAPWISE_APIURL
    },
    secret_hash: process.env.SECRET_HASH
};
