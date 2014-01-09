_require = require;
require = function(module) {
	console.log('Loading ' + module);
	return _require(module);
}

var Util = require('util');
var EventEmitter = require('events').EventEmitter;
var Bitcoin = require('bitcoin');
var MySQL = require('mysql');

var db_config = {
	host: 'localhost',
	user: 'root',
	password: 'lollakas',
	database: 'db'
};

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
	  if(err.code === 'PROTOCOL_sql_LOST') {
	    handleDisconnect();
	  } else {
	    throw err;
	  }
	});
}

handleDisconnect();

var config = require('/root/lol/config.json');

Wallet = function(config) {
	EventEmitter.call(this);
	this.init();
}

Util.inherits(Wallet, EventEmitter);

Wallet.prototype.init = function() {
	var wallet = this;
	this.daemons = {
		BTC: new Bitcoin.Client(config.wallets.BTC),
		LTC: new Bitcoin.Client(config.wallets.LTC)
	};
	this.txcache = {};
	this.interval_1 = setInterval(function() {
		wallet._getTxList();
	}, 15000);
	this.interval_2 = setInterval(function() {
		wallet._creditConfirmed();
	}, 25000);
}

Wallet.prototype._getTxList = function() {
	var wallet = this;
	this.daemons.BTC.listTransactions('*', function(err, txlist) {
		console.log('BTC:', txlist);
	});
	this.daemons.LTC.listTransactions('*', function(err, txlist) {
		for(var t in txlist) {
			console.log('LTC ' + txlist[t].txid + ' ' + txlist[t].confirmations);
		}
		txlist.forEach(function(tx) {
			if (tx.category == 'receive') {
				if (!wallet.txcache[tx.txid]) {
					wallet.txcache[tx.txid] = tx;
					db.query('INSERT INTO deposits (id, account, currency, txid, amount, timereceived, confirmations, status) VALUES (\'\', ?, ?, ?, ?, ?, ?, ?)', [
						tx.account, 'LTC', tx.txid, tx.amount, tx.timereceived, tx.confirmations, 'pending'
					], function(err, status) {
						//
					});
				}
				else {
					var oldConfirmations = wallet.txcache[tx.txid].confirmations;
					wallet.txcache[tx.txid] = tx;
					if (tx.confirmations > oldConfirmations) {
						console.log(tx.confirmations, oldConfirmations);
						db.query('UPDATE deposits SET confirmations = ? WHERE txid = ? AND status = "pending"', [tx.confirmations, tx.txid], function(err, status) {
							if (err) throw err;
							console.log(status);
						});
					}
				}
			}
		});
	});
}

Wallet.prototype._creditConfirmed = function() {
	db.query('SELECT * FROM deposits WHERE currency = ? AND confirmations >= ? AND status = ?', ['LTC', 3, 'pending'], function(err, txlist) {
		txlist.forEach(function(tx) {
			db.query('UPDATE deposits SET status = "credited" WHERE id = ?', [tx.id], function() {
				console.log('Credited ' + tx.txid);
				// flagged as credited in the deposits table
				// db.query('UPDATE balances SET LTC = LTC + ? WHERE account = ?', [tx.amount, tx.account], function() {
					//
				//});
			});
		});
	});
}


Wallet.prototype.getBalance = function(userId, currency, minConf) {
	
}

module.exports = Wallet;