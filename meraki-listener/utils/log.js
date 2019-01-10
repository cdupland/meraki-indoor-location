var winston = require('winston');
var os = require('os');
var moment = require('moment-timezone');
var config = require('../config/config');

const fs = require('fs');
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

const log_folder = './log/' ;
const error_file = 'error.log' ;
const log_file = 'combined.log' ;

const date_folder_format = 'YYYY-MM-DD_HH:00:00' ;
const date_line_format = 'YYYY-MM-DD HH:mm:ss' ;

exports.log = function(msg){
    writeFile(log_file,msg);
};

exports.error = function(msg){
    writeFile(error_file,msg);
};

function writeFile(file,txt){
    file = log_folder + /* moment().tz(config.timezone).format(date_folder_format) + '_' + */ file ;
    txt = moment().tz(config.timezone).format(date_line_format) + " " + txt + os.EOL ;

    fs.appendFile(file, txt, function(err) {
        if(err) {
            return console.log(err);
        }    
    });
}

// exports.log = function(msg) {
//     log.info(msg);
// };

// exports.error = function(msg) {
//     log.error(msg);
// };
