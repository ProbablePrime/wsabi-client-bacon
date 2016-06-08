var EventEmitter = require('events').EventEmitter;
var util = require('util');

var Socket = require('./Socket');
var Promise = require('bluebird');

var Bacon = require('baconjs');

const checkStatus = require('./checkStatus.js');

var Client = function(url, autoConnect) {
	var self = this;

	if (autoConnect === void 0) {
		autoConnect = true;
	}

	self.liveUrl = "/api/v1/live";

	self.subscriptions = {};

	self.socket = new Socket(url);

	self.socket.on("reopen", function() {
		Object.keys(self.subscriptions).forEach(function(slug) {
			self.put(self.liveUrl, { slug: slug });
		});
	});

	self.socket.on("error", function(err){
		self.emit("error", err);
	});

	if (autoConnect) {
		self.connect();
	}

	EventEmitter.call(self);
}

util.inherits(Client, EventEmitter);

Client.prototype.connect = function() {
	this.socket.connect();
};

Client.prototype.request = function (method, url, data, headers) {
	var self = this;
	if (data === void 0) {
		data = {};
	}
	if (headers === void 0) {
		headers = {};
	}
	return new Promise(function (resolve, reject) {
		var _request = function () {
			self.socket.send([
				method,
				{
					method: method,
					headers: headers,
					url: url,
					data: data
				}
			], function (data) {
				if (checkStatus(data[0].statusCode)) {
					resolve(data);
				} else {
					reject(data);
				}
			});
		}
		if (!self.socket.isConnected()) {
			self.socket.once("open", _request.bind(self));
		} else {
			_request();
		}
	}).then(function (res) {
		return res[0];
	});
};

Client.prototype.get = function (url, headers) {
	if (headers === void 0) {
		headers = {};
	}
	return this.request("get", url, {}, headers).then(function (res) {
		return res.body;
	});
};

Client.prototype.post = function (url, data, headers) {
	if (headers === void 0) {
		headers = {};
	}
	return this.request("post", url, data, headers).then(function (res) {
		return res.body;
	});
};

Client.prototype.put = function (url, data, headers) {
	if (headers === void 0) {
		headers = {};
	}
	return this.request("put", url, data, headers).then(function (res) {
		return res.body;
	});
};

Client.prototype.delete = function (url, data, headers) {
	if (headers === void 0) {
		headers = {};
	}
	return this.request("delete", url, data, headers).then(function (res) {
		return res.body;
	});
};

Client.prototype.live = function (slug) {
	var self = this;
	if (!this.subscriptions.hasOwnProperty(slug)) {
		this.subscriptions[slug] = Bacon.fromEvent(this.socket, slug);
	}
	return this.put(self.liveUrl, { slug: slug }).then(function (res) {
		return self.subscriptions[slug];
	});
};

module.exports = Client;
