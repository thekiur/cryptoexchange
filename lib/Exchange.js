var Util = require('util');
var EventEmitter = require('events').EventEmitter;

var Server = require('./ExpressServer.js');
var Wallet = require('./Wallet.js');
var Orderbook = require('./Orderbook.js');

Orderbook = function() {
	EventEmitter.call(this);
	this.init();
}

Orderbook.prototype.init = function() {
	var exchange = this;
	this.server = new Server();
	this.wallet = new Wallet();
	this.orderbook = new Orderbook();
	this.orderbook.on('new order', function(pair) {
		// orderbook has changed, check for matching orders
		sql.query('SELECT * FROM orderbook WHERE pair = ? AND type = ? ORDER BY price ASC, id ASC', [pair, 'ask'], function(err, rows) {
			var ASKS = rows;
			sql.query('SELECT * FROM orderbook WHERE pair = ? AND type = ? ORDER BY price DESC, id ASC', [pair, 'bid'], function(err, rows) {
				var BIDS = rows;
				ASKS.forEach(function(askOrder) {
					var askPrice = askOrder.price;
					for (var b = 0; b < BIDS.length; b++) {
						var bidOrder = BIDS[b];
						if (bidOrder.price > askPrice) {
							// fill ask order with a (maybe partially) matching bid order
							exchange.orderbook.fill(pair, askOrder, bidOrder, function(err, status) {
								
							});
						}
					}
				});
			});
		});
	});
}

Util.inherits(Orderbook, EventEmitter);

module.exports = Orderbook;