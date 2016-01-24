var ws = require('ws');
var EventEmitter = require('events');
var util = require('util');

var Socket = function(url) {
	this.url = url;
	this.messageId = 0;
	this.waiting = {};
	this.reconnecting = false;
	this.pingInterval = 25000;
	this.sid = "";
	this.reconnectionDelay = 1000;

	EventEmitter.call(this);
}

Socket.messageRegex = /(\d)(\d*)(.*)/;

Socket.prototype = {
	connect: function() {
		var self = this;
		this._socket = new ws(this.url + "/socket.io/?transport=websocket&__sails_io_sdk_version=0.11.0");
		this._socket.on("message", function (data) {
			return self._handleSocketMessage(data); 
		});
		this._socket.on("close", function (res) {
			self.emit("close");
			self.reconnecting = true;
			setTimeout(function () {
				self.connect();
			}, self.reconnectionDelay);
		});
		this._socket.on("error", function (res) {
			if(!self.isConnected()) {
				setTimeout(function(){
					self.connect();
				}, self.reconnectionDelay);
			}
			self.emit("error", res);
		});
	},
	_handleSocketMessage: function (res) {
		var self = this;
		var match = Socket.messageRegex.exec(res);
		switch (parseInt(match[1])) {
			case 0:
				var data;
				if (this.reconnecting) {
					this.reconnecting = false;
					this.emit("reopen");
				}
				try {
					data = JSON.parse(match[3]);
					self.pingInterval = data.pingInterval;
					self.sid = data.sid;
				} catch (e) {

				}
				this.emit("open");
				self.ping();
				break;
			case 1:
				this.close();
				break;
			case 3:
				this.emit("pong");
				break;
			case 4:
				var type = parseInt(match[2][0]);
				var id = parseInt(match[2].slice(1));
				var data;
				try {
					data = JSON.parse(match[3]);
				}
				catch (_) {
					data = match[3];
				}
				this._handleMessagePacket(type, id, data);
				break;
			default:
				console.warn("Unsupported packet id", match[1]);
		}
	},
	_handleMessagePacket: function (type, id, data) {
		switch (type) {
			case 2:
				if (Array.isArray(data) && data.length == 2) {
					this.emit(data[0], data[1]);
				}
				else {
					this.emit("message", data);
				}
				break;
			case 3:
				if (this.waiting[id] != null) {
					this.waiting[id].call(this, data);
					delete this.waiting[id];
				}
				else {
					this.emit("response", {
						id: id,
						data: data
					});
				}
				break;
		}
	},
	ping: function () {
		var self = this;
		if (self.isConnected()) {
			this._socket.send("2");
			setTimeout(function () {
				self.ping();
			}, self.pingInterval);
		}
	},
	send: function (data, callback) {
		var id = ++this.messageId;
		if (callback != null) {
			this.wait(id, callback);
		}
		this._socket.send(("42" + id) + JSON.stringify(data));
	},
	wait: function (id, callback) {
		this.waiting[id] = callback;
	},
	isConnected: function () {
		return this._socket.readyState === this._socket.OPEN;
	},
	close: function() {
		if(this._socket) {
			this._socket.close();
		}
	}
}
util.inherits(Socket, EventEmitter);

module.exports = Socket;
