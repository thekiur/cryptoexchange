var Util = require('util');
var EventEmitter = require('events').EventEmitter;

Orderbook = function() {
	EventEmitter.call(this);
	this.init();
}

Util.inherits(Orderbook, EventEmitter);

Orderbook.prototype.init = function() {
	//
}

Orderbook.prototype.fill = function(pair, ask, bid, callback) {
	console.log(arguments);
}

module.exports = Orderbook;