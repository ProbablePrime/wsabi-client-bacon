
var regex = /(\d)(\d*)(.*)/;

var Types = require('./Types');

module.exports = function(data) {
	var match = regex.exec(data);
	var message = {
		type: parseInt(match[1], 10)
	};
	if (message.type === Types.packet.MESSAGE) {
		message.messageType = parseInt(match[2][0], 10);
		message.id = parseInt(match[2].slice(1), 10);
	}
	if (message.type === Types.packet.MESSAGE || message.type === Types.packet.CONNECTED) {
		message.data = match[3];
	}
	return message;
}
