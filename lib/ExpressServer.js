_require = require;
require = function(module) {
	console.log('Loading ' + module);
	return _require(module);
}

var express = require('express');
var routes = {
	index: require('../routes/index.js'),
	login: require('../routes/login.js'),
	register: require('../routes/register.js'),
	wallet: require('../routes/wallet.js'),
	exchange: require('../routes/exchange.js'),
	order: require('../routes/order.js')	
};
var http = require('http');
var path = require('path');
var MySQL = require('mysql');

var config = require('/root/lol/config.json');
var db_config = config.db;

function satoshis(amount) { return amount * 100000000; }
function coins(amount) { return amount / 100000000; }

var db;

function handleDisconnect() {
	db = MySQL.createConnection(db_config);
	db.connect(function(err) {
	  if(err) {
	    console.log('Error when connecting to db:', err);
	    setTimeout(handleDisconnect, 3000);
	  }
	});
	db.on('error', function(err) {
	  console.log('DB error', err);
	  if(err.code === 'PROTOCOL_CONNECTION_LOST') {
	    handleDisconnect();
	  } else {
	    throw err;
	  }
	});
}

handleDisconnect();

function Server(exchange) {

	var app = express();

	// all environments
	app.set('port', process.env.PORT || 3000);
	app.set('views', path.join(__dirname, '../views'));
	app.set('view engine', 'jade');
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser('!sword[]fish!'));
	app.use(express.session());
	app.use(app.router);
	app.use(express.static(path.join(__dirname, '../public')));

	// development only
	if ('development' == app.get('env')) {
	  app.use(express.errorHandler());
	}

	app.get('/', routes.index);
	app.all('/register', routes.register);
	app.all('/login/:logout?', routes.login);
	app.get('/wallet', routes.wallet);
	app.post('/wallet/withdraw/:currency', routes.wallet);
	app.get('/wallet/:ajax', routes.wallet);
	app.get('/wallet/:newaddress?/:coin?', routes.wallet);
	app.get('/exchange/:pair?', routes.exchange);
	app.post('/order', routes.order);

	app.get('/whoami', function(req, res, next) {
		if(!req.session.account) {
			res.end('Login first maybe?');
			return;
		}
		res.write('User id: ' + req.session.account + '\n');
		exchange.wallet.getBalance(req.session.account, 'RPC', function(err, balance) {
			res.write('RPC balance: ' + balance + '\n');
			exchange.wallet.getUnconfirmedBalance(req.session.account, 'RPC', function(err, balance) {
				res.write('RPC unconfirmed balance: ' + balance + '\n');
				res.end();
			});
		});
	});
	app.get('/getaddress/:currency', function(req, res, next) {
		if(!req.session.account) {
			res.end('Login first maybe?');
			return;
		}
		exchange.wallet.getAddress(req.session.account, req.params.currency, function(err, address) {
			if (err) res.end(err.toString());
			res.end(address);
		});
	});
	app.get('/getnewaddress/:currency', function(req, res, next) {
		if(!req.session.account) {
			res.end('Login first maybe?');
			return;
		}
		exchange.wallet.getNewAddress(req.session.account, req.params.currency, function(err, address) {
			if (err) res.end(err.toString());
			res.end(address);
		});		
	});
	app.get('/status', function(req, res, next) {
		if(!req.session.account) {
			res.end('Login first maybe?');
			return;
		}
		db.query('SELECT * FROM withdraws WHERE account = ? AND status = ?', [req.session.account, 'pending'], function(err, rows) {
			if (err) throw err;
			res.end(rows);
		});
	});
	app.get('/register/:username/:email/:password', function(req, res, next) {
		if(req.session.account) {
			res.end('Logout first maybe?');
			return;
		}
		exchange.createAccount(req.params.username, req.params.email, req.params.password, function(err, id) {
			res.end(err ? err.toString() : id.toString());
		});
	});

	http.createServer(app).listen(app.get('port'), function() {
	  console.log('Express server listening on port ' + app.get('port'));
	  setInterval(function() { console.log('Ping-pong...'); }, 30000);
	});

	return app;

}

module.exports = Server;