var EventEmitter = require('events');
var util = require('util');

var Socket = require('./Socket');
var Promise = require('bluebird');

var Bacon = require('baconjs');

var Client = function(url, autoConnect) {
	var self = this;
	if (autoConnect === void 0) { autoConnect = true; }
	this.liveUrl = "/api/v1/live";

	this.subscriptions = {};

	this.socket = new Socket(url);

	this.socket.on("reopen",function() {
		var slugs = Object.keys(self.subscriptions);
		for (var i = 0, len = slugs.length; i < len; i++) {
			self.put(self.liveUrl, { slug: slugs[i] });
		}
	});

	this.socket.on("error", function(err){
		self.emit("error", err);
	});

	if(autoConnect) {
		this.connect();
	}

	EventEmitter.call(this);
}
Client.prototype = {
	connect: function() {
		this.socket.connect();
	},
	request : function (method, url, data, headers) {
		var self = this;
		if (data === void 0) {
			data = {};
		}
		if (headers === void 0) {
			headers = {};
		}
		return new Promise(function (resolve, reject) {
			if (!self.socket.isConnected()) {
				self.socket.once("open", function () {
					self.socket.send([
						method,
						{
							method: method,
							headers: headers,
							url: url,
							data: data
						}
					], function (data) {
						if (data[0].statusCode != 200) {
							reject(data[0]);
						}
						else {
							resolve(data);
						}
					});
				});
			} else {
				self.socket.send([
					method,
					{
						method: method,
						headers: headers,
						url: url,
						data: data
					}
				], function (data) {
					if (data[0].statusCode != 200) {
						reject(data);
					}
					else {
						resolve(data);
					}
				});
			}
		}).then(function (res) {
			return res[0];
		});
	},
	get : function (url, headers) {
		if (headers === void 0) {
			headers = {};
		}
		return this.request("get", url, {}, headers).then(function (res) {
			return res.body;
		});
	},
	post : function (url, data, headers) {
		if (headers === void 0) {
			headers = {};
		}
		return this.request("post", url, data, headers).then(function (res) {
			return res.body;
		});
	},
	put : function (url, data, headers) {
		if (headers === void 0) {
			headers = {};
		}
		return this.request("put", url, data, headers).then(function (res) {
			return res.body;
		});
	},
	delete : function (url, data, headers) {
		if (headers === void 0) {
			headers = {};
		}
		return this.request("delete", url, data, headers).then(function (res) {
			return res.body;
		});
	},
	live : function (slug) {
		var self = this;
		if (!this.subscriptions.hasOwnProperty(slug)) {
			this.subscriptions[slug] = Bacon.fromEvent(this.socket, slug);
		}
		return this.put(self.liveUrl, { slug: slug }).then(function (res) {
			return self.subscriptions[slug];
		});
	}
}
util.inherits(Client, EventEmitter);

module.exports = Client;
