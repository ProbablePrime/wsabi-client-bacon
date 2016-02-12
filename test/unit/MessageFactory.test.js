var expect = require('chai').expect;
var messageFactory = require('../../lib/MessageFactory');
var Types = require('../../lib/Types');

describe('MessageFactory', function() {
	it('parses a connection packet', function() {
		var packet = '0{"sid":"Kzi9su6a6UcrDI09AAOR","upgrades":[],"pingInterval":25000,"pingTimeout":60000}';
		var result = {
			type:Types.packet.CONNECTED,
			data:'{"sid":"Kzi9su6a6UcrDI09AAOR","upgrades":[],"pingInterval":25000,"pingTimeout":60000}'
		};
		expect(messageFactory(packet)).to.deep.equal(result);
	});
	it('parses a PONG packet', function() {
		var packet = '3';
		expect(messageFactory(packet)).to.deep.equal({type:Types.packet.PONG});
	});

	it('parses a RESPONSE packet', function() {
		var packet = '431[{"body":"Subscribed successfully."}]';
		var result = {
			type : Types.packet.MESSAGE,
			messageType : Types.message.RESPONSE,
			id : 1,
			data:'[{"body":"Subscribed successfully."}]'
		};
		expect(messageFactory(packet)).to.deep.equal(result);
	});
	it('parses an ERROR packet', function() {
		var packet = '1';
		expect(messageFactory(packet)).to.deep.equal({type:Types.packet.ERROR});
	})
});
