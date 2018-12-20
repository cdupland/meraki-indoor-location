'use strict';

var cache = require('../cache');
var _ = require('lodash');
var moment = require('moment');

var parcours_zone = [] ;

exports.gestionParcours = function (indoorLocation,version){
    
    cache.getObject(indoorLocation.client_mac,function(err,cacheObj){

        console.log(moment.unix(indoorLocation.timestamp));

        if(err) console.log(err)
        else if (!cacheObj) {
            // Init new object before caching
            indoorLocation = _.omit(indoorLocation,['latitude','longitude','floor','accuracy']);
            indoorLocation.short_places_list = [] ;
            indoorLocation.places_list = [
                {
                    place : indoorLocation.place,
                    first_seen : indoorLocation.timestamp,
                    last_seen : null,
                    order : 0,
                    nb_points : 1
                }
            ];
            cache.setObject(indoorLocation.client_mac,indoorLocation);
            console.log(indoorLocation);
        }
        else {
            
            if(indoorLocation.place != cacheObj.places_list[cacheObj.places_list.length-1].place){

                // Prev Zone
                var prev_place = cacheObj.places_list[cacheObj.places_list.length-1] ;
                var prev_duration = prev_place.last_seen-prev_place.first_seen
                console.log("Prev duration ",prev_duration);
                
                if(prev_duration < 5){
                    // On supprime si inférieur à X second
                    cacheObj.places_list.splice(-1,1);
                }else{
                    cacheObj.places_list[cacheObj.places_list.length-1].duration_second = prev_duration ;

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

                // Add New zone
                cacheObj.timestamp = indoorLocation.timestamp ;
                cacheObj.place = indoorLocation.place ;
                cacheObj.places_list.push({
                    place : indoorLocation.place,
                    first_seen : indoorLocation.timestamp,
                    last_seen : null,
                    order : null,
                    nb_points : 1
                });

            }else{
                cacheObj.places_list[cacheObj.places_list.length-1].nb_points++ ;
                cacheObj.places_list[cacheObj.places_list.length-1].last_seen = indoorLocation.timestamp ;
            
                // Set duration
                cacheObj.places_list[cacheObj.places_list.length-1].duration_second = indoorLocation.timestamp - cacheObj.places_list[cacheObj.places_list.length-1].first_seen
            }

            cache.setObject(indoorLocation.client_mac,cacheObj);
            console.log(cacheObj);
        }
    });
}