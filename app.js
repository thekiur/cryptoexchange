_require = require;
require = function(module) {
	console.log('Loading ' + module);
	return _require(module);
}

console.log('######## CryptoExchange v0.1 starting up ########');

var Exchange = require('./lib/Exchange.js');
var config = require('/root/lol/config.json');

exchange = new Exchange(config);

exchange.wallet.daemons.BTC.getInfo(function(err, info) {
	console.log('BITCOIN DAEMON INFO');
	if (err) throw err;
	else console.log(info);
});

exchange.wallet.daemons.LTC.getInfo(function(err, info) {
	console.log('LITECOIN DAEMON INFO');
	if (err) throw err;
	else console.log(info);
});