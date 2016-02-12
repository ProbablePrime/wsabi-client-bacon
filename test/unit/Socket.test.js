var io = require('socket.io');
var expect = require('chai').expect;
var Socket = require('../../lib/Socket');
var Types = require('../../lib/Types');
var sinon = require('sinon');

var ws = require('ws');

var EventEmitter = require('events');
var socketStub;
var socketMock;
describe('Socket', function() {

	describe("Socket Operations", function() {
		beforeEach(function() {
			socketMock = sinon.mock(new EventEmitter());
			socketStub = sinon.stub(Socket.prototype, "createSocket").returns(socketMock.object);
		});

		afterEach(function() {
			socketStub.restore();
		});

		it("creates a socket to the specified url", function() {
			var socket = new Socket("http://127.0.0.1:9000");
			socket.connect();
			expect(socketStub.calledWith("http://127.0.0.1:9000"+"/socket.io/?transport=websocket&__sails_io_sdk_version=0.11.0")).to.be.ok;
		});

		it("listens to socket events", function() {
			var socket = new Socket("http://127.0.0.1:9000");
			socketMock.expects("on").withArgs("message");
			socketMock.expects("on").withArgs("close");
			socketMock.expects("on").withArgs("error");
			socket.connect();
			expect(socketMock.verify()).to.be.ok;
		});

		it("tries to reconnect on close", function(done) {
			var socket = new Socket("http://127.0.0.1:9000");
			var connectSpy = sinon.spy(socket, "connect");
			socket.connect();
			socket.reconnectionDelay = 1;
			socketMock.object.emit('close');
			expect(socket.reconnecting).to.be.true;
			setTimeout(function() {
				expect(connectSpy.callCount).to.equal(2);
				socket.connect.restore();
				done();
			},socket.reconnectionDelay);
		});

		it("tries to reconnect on an error with a closed connection", function(done) {
			var socket = new Socket("http://127.0.0.1:9000");
			var connectSpy = sinon.spy(socket, "connect");
			var connectedStub = sinon.stub(Socket.prototype, "isConnected").returns(false);
			socket.on('error', function(){});
			socket.connect();
			socket.reconnectionDelay = 1;
			socketMock.object.emit('error');

			expect(socket.reconnecting).to.be.true;
			setTimeout(function() {
				expect(connectSpy.callCount).to.equal(2);
				socket.connect.restore();
				connectedStub.restore();
				done();
			},socket.reconnectionDelay);
		});
		it("bubles an error up", function(done) {
			var socket = new Socket("http://127.0.0.1:9000");
			socket.connect();
			var connectedStub = sinon.stub(Socket.prototype, "isConnected").returns(true);
			var eventSpy = sinon.spy();
			socket.on('error',eventSpy);
			socketMock.object.emit('error');
			setTimeout(function () {
				expect(eventSpy.called).to.be.ok;
				expect(eventSpy.calledOnce).to.be.ok;
				connectedStub.restore();
				done();
			}, 1);
		});
		it('does not error on a premature close', function() {
			var socket = new Socket("http://127.0.0.1:8080", false);
			socket.close();
		});
	});

	//This is integration
	// it('connects to a socket io server', function(done) {
	// 	var server = io(9000, { pingInterval: 2000 });
	// 	var socket = new Socket("http://127.0.0.1:9000");
	// 	var message = 'hi';
	// 	server.on('connection', function(socket) {
	// 		socket.emit(message);
	// 	});
	// 	socket.on('message', function(data) {
	// 		expect(data[0]).to.equal(message);
	// 		socket.close();
	// 		server.close();
	// 		done();
	// 	});
	// 	socket.connect();
	// });

	
	describe("Packet Handeling", function() {
		var pingStub;
		var sendStub;
		before(function() {
			pingStub = sinon.stub(Socket.prototype, "ping");
			sendStub = sinon.stub(Socket.prototype, "send");
		});
		after(function() {
			pingStub.restore();
			sendStub.restore();
		})
		it('Emits pong messages', function(done) {
			var socket = new Socket("http://127.0.0.1:8080");
			var eventSpy = sinon.spy();
			socket.on("pong", eventSpy);
			setTimeout(function () {
				expect(eventSpy.called).to.be.ok;
				expect(eventSpy.calledOnce).to.be.ok;
				done();
			}, 1);
			socket._handleSocketMessage((Types.packet.PONG).toString());
		});
		it('parses connection details', function(done) {
			var socket = new Socket("http://127.0.0.1:8080");
			socket.on("open", function() {
				expect(socket.pingInterval).to.equal(25000);
				expect(socket.sid).to.equal("Kzi9su6a6UcrDI09AAOR");
				done();
			});
			socket._handleSocketMessage('0{"sid":"Kzi9su6a6UcrDI09AAOR","upgrades":[],"pingInterval":25000,"pingTimeout":60000}');
		});
		it('closes on errors', function() {
			var socket = new Socket("http://127.0.0.1:8080");
			var closeStub = sinon.stub(socket,"close");
			socket.on("error", function(){});
			socket._handleSocketMessage((Types.packet.ERROR).toString());
			expect(closeStub.called).to.be.ok;
			expect(closeStub.calledOnce).to.be.ok;
			closeStub.restore();
		});
		it('emits an error event when an error packet is received', function(done) {
			var eventSpy = sinon.spy();
			var socket = new Socket("http://127.0.0.1:8080");
			var closeStub = sinon.stub(socket,"close");
			socket.on("error", eventSpy);
			setTimeout(function () {
				expect(eventSpy.called).to.be.ok;
				expect(eventSpy.calledOnce).to.be.ok;
				closeStub.restore();
				done();
			}, 1);
			socket._handleSocketMessage((Types.packet.ERROR).toString());
		})
	});
});
