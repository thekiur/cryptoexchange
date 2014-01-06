var initTime = +new Date;
var express = require('express');
var routes = {
	index: require('./routes/index.js'),
	login: require('./routes/login.js'),
	wallet: require('./routes/wallet.js'),
	exchange: require('./routes/exchange.js'),
	order: require('./routes/order.js')	
};
var http = require('http');
var path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
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

http.createServer(app).listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
  console.log('Bootstrapped application in ' + (+new Date - initTime) + 'ms');
  setInterval(function() { console.log('Ping-pong...'); }, 30000);
});
