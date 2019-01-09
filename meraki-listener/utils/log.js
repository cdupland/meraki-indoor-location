var winston = require('winston');
const log = winston.createLogger({
    // levels: winston.config.syslog.levels,
    // level: 'info',
    // format: winston.format.json(),
    // defaultMeta: {service: 'user-service'},
    transports: [
      new winston.transports.File({ filename: './log/error.log', format: winston.format.simple(), level: 'error' }),
      new winston.transports.File({ filename: './log/combined.log', format: winston.format.simple(), level: 'info' })
    ]
  });


exports.log = function(msg) {
    log.info(msg);
};

exports.error = function(msg) {
    log.error(msg);
};
