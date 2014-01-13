_require = require;
require = function(module) {
	console.log('Loading ' + module);
	return _require(module);
}

console.log('# CryptoExchange v0.1 starting up #');

var Exchange = require('./lib/Exchange.js');
var config = require('/root/lol/config.json');

exchange = new Exchange(config);
process.exchange = exchange;

exchange.wallet.daemons.RPC.getInfo(function(err, info) {
	console.log('# RonPaulCoin Status #');
	if (err) throw err;
	else console.log(info.blocks, info.connections);
});

exchange.wallet.daemons.LTC.getInfo(function(err, info) {
	console.log('# Litecoin Status #');
	if (err) throw err;
	else console.log(info.blocks, info.connections);
});