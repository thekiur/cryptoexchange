var Util = require('util');
var EventEmitter = require('events').EventEmitter;

Orderbook = function() {
	EventEmitter.call(this);
	this.init();
}

Orderbook.prototype.init = function() {
	//
}

Util.inherits(Orderbook, EventEmitter);

module.exports = Orderbook;