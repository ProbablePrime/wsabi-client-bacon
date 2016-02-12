var ws = require('ws');
var EventEmitter = require('events');
var util = require('util');

var messageFactory = require('./MessageFactory');
var Types = require('./Types');

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
util.inherits(Socket, EventEmitter);

Socket.prototype.connect = function() {
	var self = this;
	self._socket = self.createSocket(self.url + "/socket.io/?transport=websocket&__sails_io_sdk_version=0.11.0");
	self._socket.on("message", function (data) {
		return self._handleSocketMessage(data); 
	});
	self._socket.on("close", function (res) {
		self.emit("close");
		self.reconnecting = true;
		setTimeout(function () {
			self.connect();
		}, self.reconnectionDelay);
	});
	self._socket.on("error", function (res) {
		if(!self.isConnected()) {
			self.reconnecting = true;
			setTimeout(function(){
				self.connect();
			}, self.reconnectionDelay);
		}
		self.emit("error", res);
	});
};

Socket.prototype.createSocket = function(url) {
	return new ws(url);
};

Socket.prototype._handleSocketMessage = function (res) {
	var self = this;
	var message = messageFactory(res);
	switch (message.type) {
		case Types.packet.CONNECTED:
			var data;
			if (self.reconnecting) {
				self.reconnecting = false;
				self.emit("reopen");
			}
			try {
				data = JSON.parse(message.data);
				self.pingInterval = data.pingInterval;
				self.sid = data.sid;
			} catch (e) {

			}
			self.emit("open");
			self.ping();
			break;
		case Types.packet.ERROR:
			self.close();
			self.emit('error', res);
			break;
		case Types.packet.PONG:
			self.emit("pong");
			break;
		case Types.packet.MESSAGE:
			var data;
			try {
				data = JSON.parse(message.data);
			}
			catch (_) {
				data = message.data;
			}
			self._handleMessagePacket(message.messageType, message.id, data);
			break;
		default:
			console.warn("Unsupported packet id", message.type);
	}
};

Socket.prototype._handleMessagePacket = function (type, id, data) {
	var self = this;
	switch (type) {
		case Types.message.REQUEST:
			if (Array.isArray(data) && data.length == 2) {
				self.emit(data[0], data[1]);
			}
			else {
				self.emit("message", data);
			}
			break;
		case Types.message.RESPONSE:
			if (self.waiting[id] != null) {
				this.waiting[id].call(this, data);
				delete this.waiting[id];
			}
			else {
				self.emit("response", {
					id: id,
					data: data
				});
			}
			break;
	}
};

Socket.prototype.ping = function () {
	var self = this;
	if (self.isConnected()) {
		self._socket.send(Types.packet.PING.toString());
		setTimeout(function () {
			self.ping();
		}, self.pingInterval);
	}
};

Socket.prototype.send = function (data, callback) {

	var self = this;
	var id = ++self.messageId;
	if (callback != null) {
		self.wait(id, callback);
	}
	self._socket.send(Types.packet.MESSAGE.toString() + Types.message.REQUEST + id + JSON.stringify(data));
};

Socket.prototype.wait = function (id, callback) {
	var self = this;
	self.waiting[id] = callback;
};

Socket.prototype.isConnected = function () {
	return this._socket.readyState === this._socket.OPEN;
};

Socket.prototype.close = function() {
	if(this._socket) {
		this._socket.close();
	}
}

module.exports = Socket;
