# Indoor Location with Cisco Meraki

Cisco Meraki is a network, and in particular WiFi, infrastructure which allows to do indoor positioning in multiple ways.

There are 3 possibilites to use Meraki for Indoor Location:

1. Get device location from the infrastructure: the device's location is computed by the Meraki cloud based on the signal strengh of the signals received by multiple access-points.
2. Have the device computing its position based on the WiFi signal strenght of the surrounding access points.
3. Have the device computing its position based on the bluetooth signal strenght of iBeacons embedded in the surrounding access points.

Option 2 requires the mobile phone to be able to scan for WiFi access point, which is not allowed on iOS. Because of this limitation, the solution is not an option for most general public application, but could be used in some enterprise cases when only android phones are used.

Here are some pros and cons between options 1 and 3:

Infrastructure | iBeacons
------------- | -------------
Gets the position of all wiFi enabled devices | An app need to be installed on the device
User need to be connected to the wifi to be able to retrieve its position  | User does not need to be connected to the wifi
A new location is computed on average every minute and depends on phone state | A new position can be computed every second


## Indoor Location from the infrastructure

Every WiFi-enabled device coming in the vicinity of the wifi infrastructure will be positioned by Meraki. The network probe requests coming form the phones will be intercepted by the different access points and their signal strenght will serve to trilaterate the position. Each device is identified by its MAC address.

To protect the privcacy of the user, most modern phones running iOS and Android will use randomized MAC addresses in their probe requests. Therefore, one need to pay attention when analysing the received data that the MAC of a single device will change over time.

Probe requests are sent by the phone to discover the network around them. Depending its state (active, sleeping, energy-saving, in communication, ...) the phone will not necesseraly always send a probe request at the same interval. We can expect on average to have a probe request every minute but the infrastructure has no control on it.

On iOS and Android, it is impossible for an app to retrieve the MAC address of the device, also for privacy reasons. So our only option to identify the location of a specific device in the set of seen devices is using the local IP address of the device.

The procedure works as such:

- The location of the device is computed by the Meraki cloud
- Those locations are sent as notifications to a listener server (see below)
- The listener decodes the location and stores it in a Redis database using the local IP as key. It can also send it to any other system or database for further processing.
- The device connects using web socket to an emitter server and provides its local IP as userId.
- The emitter server listens for changes in the Redis database and sends the right location to the right user matching the local IP

### Floor and aligment

The Meraki cloud provides a device location as a latitude / longitude pair. However, there are 2 reasons why an extra processing is required:

- The provided location is missing a floor, which is critical for indoor applications.
- Most of the time, the alignment of the building floorplan on the world map done in Meraki is approximative and not done with indoor positioning in mind, and therefore will not match with the indoor map in your application.

Therefore, a correction phase is required and it works like this:

- Using the configurator provided below, the Meraki configuration (the floorplans and their alignments) are injected in Mapwize as `layers`.
- In Mapwize, we configure a floor for each floorplan. 
- If required, we move the floorplan in Mapwize to align with our indoor map.
- Using the configurator provided below, we get a configuration file that will be used by the listener to process every location received from Meraki. 

### App SDK

The configrator, listener and emitter provided in this repository are running on the server side.

If you want to get the user's position in your app, and for example display it on the map, you will need to use the SocketIndoorLocationProvider modules which are available for both [iOS](https://github.com/IndoorLocation/socket-indoor-location-provider-ios) and [Android](https://github.com/IndoorLocation/socket-indoor-location-provider-android)




## Indoor Location using iBeacons

All Meraki access points can be configured to emit a iBeacon bluetooth signal. Those signals can be heard by the mobile phones and used to compute the device's location. See [the Bluetooth Beaconing section in the Meraki documentation
](https://documentation.meraki.com/MR/Bluetooth/Bluetooth_Low_Energy_(BLE))

In order to do so, an iBeacon SDK needs to be included in your app. This framework proposes a BasicBeaconIndoorLocationProvider available for both [iOS](https://github.com/IndoorLocation/basic-beacon-indoor-location-provider-ios) and [Android](https://github.com/IndoorLocation/basic-beacon-indoor-location-provider-android). Other providers exists with more comprehensive features.

In order to use the BasicBeaconIndoorLocationProvider, the steps are the following:

- Using the configurator (see below), import the floorplan configuration from Meraki to Mapwize. Set the floor of each floorplan and re-align it if necessary.
- Import the position of the access points in Mapwize with their iBeacon UUID, major and minor settings.
- Add the BasicBeaconIndoorLocationProvider in your mobile app and make sure the API key used has read access to your venue.




## Configurator

A configurator tool is provided to import data from Meraki to Mapwize and create the configuration file required to run the Meraki listener server.

The configurator is split in 3 steps described below.

### Getting data from Meraki

Unfortunately, at this point, Meraki is missing the required API to extract any floorplan information. Therefore, we'll need to find ways around that. If you have the chance to speak to someone from Meraki, please don't hesitate to upvote the idea of a floorplan API :-)

Here is the description of how to get the required data from Meraki.

#### Getting the floorplans

- Log in to your Meraki dashboard
- In the Wireless menu, navigate to `Map & floor plan`
- Display the source of the HTML page in your browser
- Search the source for `MKI.Current.get('ng').set(`. You should find it twice. The one we need is the first one, around line 473, just after `if (window.google_maps_loaded) {`
- Copy-paste the JSON that is inside `MKI.Current.get('ng').set( **JSON** );` to a text file and save it on disk.

#### Getting the list of access points

- Log in to your Meraki dashboard
- In the Wireless menu, navigate to `Access points`
- On the top right, use the `Download As` button to download the list of AP as XML

You might wonder why we use XML in this case and not JSON as everywhere else? Simply because in the JSON export, the nodeId of the access points are not exported, while in the floorplans we got above, only the nodeId are available. Meraki God, if you hear us ...

### Install

The configurator is a command line tool developed in nodeJS. Before running it, you need to have node installed on your machine and install the dependencies using `npm install`.

### Upload Meraki floorplans into Mapwize

This step creates a layer in Mapwize for each floorplan in Meraki. The layer's name is `Meraki - ` followed by the floorplan name.

At first, these layers do not have a floor configured, as the floor data is not available in Meraki, You need to manually edit each layer for updating their floor properties.

As some alignment problems can be observed, you might also have to check that each layer image perfectly overlays the Mapwize layers for a better accuracy.

The command is as follow

```
./meraki-configurator/merakiFloorplansToMapwize.js --merakiFloorPlansConfig [FILEPATH_FOR_FLOORPLANS_JSON] --mapwizeUser [YOUR_MAPWIZE_EMAIL] --mapwizePwd [YOUR_MAPWIZE_PWD] --mapwizeApiKey [YOUR_MAPWIZE_API_KEY] --mapwizeOrganizationId [YOUR_MAPWIZE_ORGANIZATIONID] --mapwizeVenueId [YOUR_MAPWIZE_VENUEID]
```

### Generate the configuration file

Once the layers are correctly configured in Mapwize, with right floor and alignment, use the command below to generate the JSON configuration file that will be used later by the listener.

```
./meraki-configurator/configureFromMapwize --merakiFloorPlansConfig [FILEPATH_FOR_FLOORPLANS_JSON] --mapwizeUser [YOUR_MAPWIZE_EMAIL] --mapwizePwd [YOUR_MAPWIZE_PWD] --mapwizeApiKey [YOUR_MAPWIZE_API_KEY] --mapwizeOrganizationId [YOUR_MAPWIZE_ORGANIZATIONID] --mapwizeVenueId [YOUR_MAPWIZE_VENUEID] --output [OUTPUT_PATH_FOR_LISTENER_CONFIGURATION]
```


### Import the access points to Mapwize

This steps creates beacons in Mapwize based on the Meraki configuration. Please note that the beacons will be added in Mapwize based on the floorplan configuration done in Mapwize, with the floor and alignment given to the floorplans.

```
./meraki-configurator/merakiAccessPointsToMapwize --merakiFloorPlansConfig [FILEPATH_FOR_FLOORPLANS_JSON] --merakiAccessPointsConfig [FILEPATH_FOR_ACCESSPOINTS_XML] --mapwizeUser [YOUR_MAPWIZE_EMAIL] --mapwizePwd [YOUR_MAPWIZE_PWD] --mapwizeApiKey [YOUR_MAPWIZE_API_KEY] --mapwizeOrganizationId [YOUR_MAPWIZE_ORGANIZATIONID] --mapwizeVenueId [YOUR_MAPWIZE_VENUEID]
```


## Listener server

This the NodeJS server receiving the Meraki Location notifications.
Each notification will be received and processed into an IndoorLocation object.

The computed IndoorLocation will be saved in a Redis database with the IP address as userId to be used by the emitter.

Thanks to Redis, the emitter will be notified each time a key value has been changed.

To do so, redis notifications have to be enabled with the command described below.
```
redis-cli config set notify-keyspace-events K$
```

### Use

*   We first need to correctly set the configuration parameters
    *   Directly in the `config/all.js` file
    *   Via environment variables
        *   PORT: port used by the server
        *   SECRET: secret defined in the Meraki dashboard to authenticate the POST query (__required__)
        *   VALIDATOR: token defined by Meraki to identify the source (__required__)
        *   FLOOR_PLANS: serialized JSON with the output of the configurator (__required__)
        *   REDIS_HOST: redis host (__required__)
        *   REDIS_PORT: redis port
        *   REDIS_AUTH: redis password (__required__ if set)
        *   REDIS_MERAKI_NOTIF_TTL: redis key TTL
*   Start the server
    ```
    npm run start-listener
    ```

#### Notes

To correctly serialize the Meraki configuration, one can execute the command described below:
```
export FLOOR_PLANS=$(node -e 'var json = require("FILEPATH"); console.log(JSON.stringify(json));')
```

If you want to put this variable into your clipboard instead, please execute the command below:
```
node -e 'var json = require("FILEPATH"); console.log(JSON.stringify(json));' | pbcopy
```

An example of a valid JSON Meraki floor plans configuration can be found at `meraki-listener/test/floor-plans.json`.


## Emitter server

This is the NodeJS server that will transmit the updated locations to the app using web socket.
Each socket connection will lead to a redis subscription that will help to only get the IndoorLocation objects when the location of a user has been changed.
These objects will be sent to the providers via a socket channel.

### Use

*   We first need to correctly set the configuration parameters
    *   Directly in the `config/all.js` file
    *   Via environment variables
        *   PORT: port used by the server
        *   REDIS_HOST: redis host (__required__)
        *   REDIS_PORT: redis port
        *   REDIS_AUTH: redis password (__required__ if set)
*   Start the server
    ```
    npm run start-emitter
    ```
* Add the socketIndoorLocationProvider in your app and point the module to your emitter server URL.


## Contribute

Contributions are welcome. We will be happy to review your PR.

## Support

For any support with this provider, please do not hesitate to contact [support@mapwize.io](mailto:support@mapwize.io)

## License

MIT
