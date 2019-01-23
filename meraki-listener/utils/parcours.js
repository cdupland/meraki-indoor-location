'use strict';

var config = require('../config/config');
var cache = require('../cache');
var eventHub = require('../utils/eventhub');
var logger = require('../utils/log');

var _ = require('lodash');
var moment = require('moment-timezone');

const datetime_format = 'YYYY-MM-DD HH:mm:ss' ;
var min_duration = config.min_parcours_duration || 30 ;

exports.gestionParcours = function (indoorLocation,version,next){
    
    cache.getObject(indoorLocation.client_mac,function(err,cacheObj){

        // console.log(moment.unix(indoorLocation.timestamp).tz(config.timezone).format('YYYY-MM-DD HH:mm:ss'),indoorLocation.place);

        if(err) logger.error(err);
        else if (!cacheObj) {
            // Init new object before caching
            indoorLocation = _.omit(indoorLocation,['latitude','longitude','floor','accuracy']);
            indoorLocation.id_client_mac = indoorLocation.client_mac + Date() ;
            indoorLocation.current_order = 0 ;
            indoorLocation.short_places_list = [] ;
            indoorLocation.places_list = [
                {
                    place : indoorLocation.place,
                    first_seen : indoorLocation.timestamp,
                    last_seen : null,
                    nb_points : 1
                }
            ];
            cache.setObject(indoorLocation.ip ? indoorLocation.ip : indoorLocation.client_mac,indoorLocation);
        
        } else {
            
            // Si la zone vue est différente dans la précédente
            if(indoorLocation.place != cacheObj.places_list[cacheObj.places_list.length-1].place){

                // Prev Zone
                var prev_place = cacheObj.places_list[cacheObj.places_list.length-1] ;
                var prev_duration = prev_place.last_seen-prev_place.first_seen
                cacheObj.places_list[cacheObj.places_list.length-1].duration_second = prev_duration ;

                // console.log("Prev duration ",prev_duration);
                
                if(prev_duration < min_duration){
                    // On supprime si inférieur à X second
                    cacheObj.places_list.splice(-1,1);
                }else{
                    
                    // On regarde si on peut fusionner avec la zone précédente
                    if(cacheObj.places_list.length > 1){
                        if(prev_place.place == cacheObj.places_list[cacheObj.places_list.length-2].place){
                            cacheObj.places_list[cacheObj.places_list.length-2].last_seen = prev_place.last_seen ;
                            cacheObj.places_list[cacheObj.places_list.length-2].nb_points += prev_place.nb_points ;
                            cacheObj.places_list[cacheObj.places_list.length-2].duration_second = prev_place.last_seen - cacheObj.places_list[cacheObj.places_list.length-2].first_seen ;

                            cacheObj.places_list.splice(-1,1);
                        }
                    }

                }

                // Si j'ai 2 zones successifs >= MIN_DURATION, j'envoi la première
                if(cacheObj.places_list.length > 1){
                    if(cacheObj.places_list[0].duration_second >= min_duration && cacheObj.places_list[1].duration_second >= min_duration){
                        // Envoi zone
                        sendZone({
                            mac : cacheObj.client_mac,
                            zone : cacheObj.places_list[0],
                            i : cacheObj.current_order,
                            v : version
                        });

                        cacheObj.places_list.splice(0,1);
                        cacheObj.current_order++ ;
                    }
                }

                // Add New zone
                cacheObj.timestamp = indoorLocation.timestamp ;
                cacheObj.place = indoorLocation.place ;
                cacheObj.places_list.push({
                    place : indoorLocation.place,
                    first_seen : indoorLocation.timestamp,
                    last_seen : null,
                    nb_points : 1
                });

            }else{
                // Si toujours la même zone, on met à jour 
                cacheObj.places_list[cacheObj.places_list.length-1].nb_points++ ;
                cacheObj.places_list[cacheObj.places_list.length-1].last_seen = indoorLocation.timestamp ;

                // Set duration
                cacheObj.places_list[cacheObj.places_list.length-1].duration_second = indoorLocation.timestamp - cacheObj.places_list[cacheObj.places_list.length-1].first_seen
            }

            cache.setObject(indoorLocation.ip ? indoorLocation.ip : indoorLocation.client_mac,cacheObj);
        }
    });   
}

function sendZone(params){
    var zone = params.zone ;
    eventHub.sendMessage({
        order: params.i,
        zone: zone.place,
        nb_points: zone.nb_points,
        first_seen: moment.unix(zone.first_seen).tz(config.timezone).format(datetime_format),
        last_seen: moment.unix(zone.last_seen).tz(config.timezone).format(datetime_format),
        timestamp_first_seen: zone.first_seen,
        timestamp_last_seen: zone.last_seen,
        duration_second: zone.last_seen-zone.first_seen,
        duration_minute: (zone.last_seen-zone.first_seen)/60,
        version: params.v,
        client_mac: params.mac,
        secret: config.secret,
        message_type: 'parcours'
    });
}