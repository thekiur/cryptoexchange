var EventEmitter = require('events').EventEmitter;
var Util = require('util');

Exchange = function() {
	EventEmitter.call(this);
	this.init();
}

Exchange.prototype.init = function() {
	var exchange = this;
	this.server = new Server();
	this.wallet = new Wallet();
	this.orderbook = new Orderbook();
	this.orderbook.on('new order', function(pair) {
		// orderbook has changed, check for matching orders
		exchange.orderbook.orders[pair].asks.forEach(function(order) {
			//
		});
		exchange.orderbook.orders[pair].bids.forEach(function(order) {
			//
		});
	});
}

Util.inherits(Exchange, EventEmitter);

module.exports = Exchange;