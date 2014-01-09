_require = require;
require = function(module) {
	console.log('Loading ' + module);
	return _require(module);
}

var express = require('express');
var routes = {
	index: require('../routes/index.js'),
	login: require('../routes/login.js'),
	wallet: require('../routes/wallet.js'),
	exchange: require('../routes/exchange.js'),
	order: require('../routes/order.js')	
};
var http = require('http');
var path = require('path');

function Server(exchange) {

	var app = express();

	// all environments
	app.set('port', process.env.PORT || 3000);
	app.set('views', path.join(__dirname, 'views'));
	app.set('view engine', 'jade');
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser('!sword[]fish!'));
	app.use(express.session());
	app.use(app.router);
	app.use(express.static(path.join(__dirname, 'public')));

	// development only
	if ('development' == app.get('env')) {
	  app.use(express.errorHandler());
	}

	app.get('/', routes.index);
	app.get('/login', routes.login);
	app.post('/login', routes.login);
	app.get('/wallet', routes.wallet);
	app.post('/wallet/:currency?', routes.wallet);
	app.get('/exchange/:pair?', routes.exchange);
	app.post('/order', routes.order);

	app.get('/whoami', function(req, res, next) {
		res.end(req.session.account);
	});
	app.get('/fakelogin/:aid', function(req, res, next) {
		req.session.account = req.params.aid;
		res.end(req.session.account);
	});
	app.get('/withdraw/:currency/:amount/:address', function(req, res, next) {
		exchange.wallet.withdraw(req.session.account, req.params.currency, req.params.amount, req.params.address, function(err, txid) {
			if (err) res.end(err.toString());
			else res.end(txid);
		});
	});

	http.createServer(app).listen(app.get('port'), function() {
	  console.log('Express server listening on port ' + app.get('port'));
	  setInterval(function() { console.log('Ping-pong...'); }, 30000);
	});

	return app;

}

module.exports = Server;