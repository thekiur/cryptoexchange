console.log('# CryptoExchange v0.1 starting up #');

var Exchange = require('./lib/Exchange.js');
var config = require('/root/lol/config.json');

exchange = new Exchange(config);
process.exchange = exchange;

exchange.wallet.daemons.LTC.getInfo(function(err, info) {
	console.log('# Litecoin Status #');
	if (err) throw err;
	else console.log(info.blocks, info.connections);
});

exchange.wallet.daemons.DOGE.getInfo(function(err, info) {
	console.log('# Dogecoin Status #');
	if (err) throw err;
	else console.log(info.blocks, info.connections);
});

exchange.wallet.daemons.RPC.getInfo(function(err, info) {
	console.log('# Ronpaulcoin Status #');
	if (err) throw err;
	else console.log(info.blocks, info.connections);
});