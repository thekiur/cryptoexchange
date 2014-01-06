var EventEmitter = require('events').EventEmitter;
var Util = require('util');

Exchange = function() {
	EventEmitter.call(this);
}

Util.inherits(Exchange, EventEmitter);

module.exports = Exchange;