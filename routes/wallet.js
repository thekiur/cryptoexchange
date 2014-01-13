exchange = process.exchange;

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

module.exports = function(req, res) {
  if (!req.session.account) {
  	res.redirect('/');
  	return;
  }
  var data = {};
  var numDaemons = Object.keys(exchange.wallet.daemons).length;
  var okDaemons = 0;
  var account = req.session.account;
  if (req.params.ajax == 'ajax') {
  	loopIt(undefined, undefined, 'wallet-ajax');
  	return;
  }
  if (req.params.newaddress && req.params.coin && exchange.wallet.daemons[req.params.coin]) {
  	// get new address and output
  	if (!req.session.getnewaddrcount) req.session.getnewaddrcount = 1;
  	else req.session.getnewaddrcount++;
  	if (req.session.getnewaddrcount >= 10 * numDaemons) {
  		loopIt('Flood protection: You can generate 30 addresses per session.');
  		return;
  	}
  	exchange.wallet.getNewAddress(account, req.params.coin, function(err, addr) {
  	  if (err) throw err;
  	  loopIt();
  	});
  }
  else if (req.body.amount && req.body.address) {
  	// withdraw and output
  	console.log(req.body);
	exchange.wallet.withdraw(req.session.account, req.params.currency, req.body.amount, req.body.address, function(err, txid) {
		if (err) loopIt(err.toString());
		else loopIt(undefined, 'Transaction initiated: ' + txid);
	});
  }
  else {
  	// just output
  	loopIt();
  }
  function loopIt(_err, _success, view) {
  	for (var d in exchange.wallet.daemons) {
	  	if (exchange.wallet.daemons.hasOwnProperty(d)) {
	  	  (function(d){
	  	  	data[d] = {};
	  		exchange.wallet.getBalance(account, d, function(err, balance) {
	  			if (err) throw err;
	  			data[d].name = d;
	  			data[d].balance = balance;
	  			exchange.wallet.getAddress(account, d, function(err, address) {
	  				if (err) throw err;
	  				data[d].address = address;
	  				exchange.wallet.getUnconfirmedBalance(account, d, function(err, balance) {
	  					data[d].unconfirmedbalance = balance;
	  					if (++okDaemons == numDaemons) {
							res.render(view || 'wallet', { currency: req.params.currency, data: data, loggedin: true, error: _err, success: _success, page: 'wallet' });
		  				}
	  				});
	  			});
	  		  });
	        })(d);
	  	  }
	    }
    }
};