# Wsabi Client Bacon
An alternative lightweight client for the hapi websocket layer, wsabi. Heavily based uppon [wsabi-client](https://github.com/ExoZoneDev/wsabi-client). But is written in pure JavaScript and uses a different Reactive provider [baconjs](https://github.com/baconjs/bacon.js).

## Why?
Mostly a matter of preference. I find BaconJs' documentation easier to understand and their API has a lot less complexity. You can read more about this topic [here](https://github.com/baconjs/bacon.js/wiki/FAQ#whats-the-difference-to-rxjs]) please consider both before choosing. 

Wasabi and bacon also go together well [aparently](https://duckduckgo.com/?q=wasabi+bacon&t=canonical&ia=recipes).

## Differences
There's some minor API differences in the handling of subscribing to live events. That allow you to catch the internal PUT request that occurs on subscribing to a live event. In addition use .onValue rather than .subscribe.

It is also assumed that `ws` and `bluebird` are ok to be used as your websocket and promise provider. If there's a problem with this let me know and i'll restore that functionality.

## Usage
```javascript
var Client = require('wsabi-client-bacon');

var client = new Client("wss://localhost:3000");

var channelName = "channel";

client.socket.on("open", function () {
	// Send requests to the server with get, put, post, delete, or request.
	client.get("/api/v1/channels/"+channelName).then(function(res) {
		// Subscribe to a live event
		client.live('channel:'+res.id+':update').then(function(res) {
			res.onValue(function(value){
				console.log('Channel update',value);
			})
		});
	});
});

```
