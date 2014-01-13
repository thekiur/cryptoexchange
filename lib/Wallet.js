_require = require;
require = function(module) {
	console.log('Loading ' + module);
	return _require(module);
}

var Util = require('util');
var EventEmitter = require('events').EventEmitter;
var Bitcoin = require('bitcoin');
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

Wallet = function(config) {
	EventEmitter.call(this);
	this.init();
}

Util.inherits(Wallet, EventEmitter);

Wallet.prototype.init = function() {
	var wallet = this;
	this.daemons = {
//		BTC: new Bitcoin.Client(config.wallets.BTC),
		RPC: new Bitcoin.Client(config.wallets.RPC),
		LTC: new Bitcoin.Client(config.wallets.LTC)
	};
	this.txcache = {};
	db.query('SELECT daemon, blockcount, lastcheckedblock FROM daemons WHERE server_id = ?', [1], function(err, rows) {
		if (err) throw err;
		for (var i = 0; i < rows.length; i++) {
			(function(i) {
				var d = rows[i];
				wallet.daemons[d.daemon].blockcount = d.blockcount;
				wallet.daemons[d.daemon].lastcheckedblock = d.lastcheckedblock;
			})(i);
		}
		wallet.interval_0 = setInterval(function() {
			wallet._getInfo();
		}, 20000);
		wallet.interval_1 = setInterval(function() {
			wallet._getTxList();
		}, 30000);
		wallet.interval_2 = setInterval(function() {
			wallet._creditConfirmed();
		}, 55000);
	});
}

Wallet.prototype._getInfo = function() {
	var wallet = this;
	for (var d in this.daemons) {
		if (this.daemons.hasOwnProperty(d)) {
			(function(d){
				var cd = wallet.daemons[d];
				cd.getInfo(function(err, info) {
					if (err) throw err;
					cd.blockcount = info.blocks;
					db.query('UPDATE daemons SET blockcount = ? WHERE server_id = ? AND daemon = ?', [info.blocks, 1, d]);
				});
			})(d);
		}
	}
}

Wallet.prototype._getTxList = function() {
	var wallet = this;
/*	this.daemons.BTC.listTransactions('*', function(err, txlist) {
		console.log('BTC:', txlist);
	});*/
	var fStart = process.hrtime();
	for (var d in this.daemons) {
		if (this.daemons.hasOwnProperty(d)) {
			(function(d){
			var cd = wallet.daemons[d];
			cd.getBlockHash(cd.lastcheckedblock - 10, function(err, hash) {
				if (err) throw err;
				console.log('Checking transactions since block: ', cd.lastcheckedblock - 10);
				cd.listSinceBlock(hash, function(err, txlist) {
					if (err) throw err;
					var ms = Math.round(process.hrtime(fStart)[1]/1000000);
					console.log('Daemon responded with data in ' + ms + 'ms');
					txlist = txlist.transactions;
					for(var t in txlist) {
						console.log(d + ' ' + txlist[t].txid + ' ' + txlist[t].confirmations);
					}
					txlist.forEach(function(tx) {
						if (tx.category == 'receive') {
							if (!wallet.txcache[tx.txid]) {
								wallet.txcache[tx.txid] = tx;
								db.query('INSERT IGNORE INTO deposits (id, account, currency, txid, amount, timereceived, confirmations, status) VALUES (\'\', ?, ?, ?, ?, ?, ?, ?)', [
									tx.account, d, tx.txid, tx.amount, tx.timereceived, tx.confirmations, 'pending'
								], function(err, status) {
									if (err) throw err;
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
					db.query('UPDATE daemons SET lastcheckedblock = ? WHERE server_id = ? AND daemon = ?', [cd.blockcount, 1, d], function(err, status) {
						if (err) throw err;
						cd.lastcheckedblock = cd.blockcount;
					});
				});
			});
			})(d);
		}
	}
}

Wallet.prototype._creditConfirmed = function() {
	db.query('SELECT * FROM deposits WHERE confirmations >= ? AND status = ?', [3, 'pending'], function(err, txlist) {
		if (err) throw err;
		txlist.forEach(function(tx) {
			db.query('UPDATE deposits SET status = "credited" WHERE id = ?', [tx.id], function(err) {
				if (err) throw err;
				console.log('Credited ' + tx.txid);
				db.query('UPDATE balances SET '+tx.currency+' = '+tx.currency+' + ? WHERE account = ?', [satoshis(tx.amount), tx.account], function(err, status) {
					if (err) throw err;
					console.log('Updated '+tx.currency+' balance on account ' + tx.account);
				});
			});
		});
	});
}

Wallet.prototype.withdraw = function(account, currency, amount, address, callback) {
	var wallet = this;
	amount = parseFloat(amount);
	if (amount < config.wallets[currency].txfee) {
		callback('Error: Withdraw amount is less than txfree'); return;
	}
	// got some balance?
	db.query('SELECT ' + currency + ' AS availBalance FROM balances WHERE account = ?', [account], function(err, rows) {
		if (err) throw err;
		var realCost = satoshis(amount) + satoshis(config.wallets[currency].txfee);
		console.log(amount, config.wallets[currency].txfee, currency);
		if (rows[0].availBalance >= realCost) {
			// got enough, proceed with withdraw - first call the coindaemon
			wallet.daemons[currency].sendFrom(account, address, amount, function(err, txid) {
				if (err) { callback(err); return; }
				// if coindaemon was ok, update database
				db.query('UPDATE balances SET ' + currency + ' = ' + currency + ' - ? WHERE account = ?', [realCost, account], function(err, status) {
					if (err) { callback(err); return; }
					db.query('INSERT INTO withdraws (id, account, currency, txid, amount, timesent, confirmations, status) VALUES (\'\', ?, ?, ?, ?, ?, ?, ?)', [
						account, currency, txid, amount, +new Date, 0, 'pending'
					], function(err, status) {
						if (err) { callback(err); return; }
						callback(null, txid);
					});
				});
			});
		}
		else {
			callback('Error: Account has insufficient funds, required: ' + coins(realCost));
		}
	});
}


Wallet.prototype.getBalance = function(account, currency, callback) {
	db.query('SELECT ' + currency + ' AS availBalance FROM balances WHERE account = ?', [account], function(err, rows) {
		if (!rows || !rows.length) {
			callback('Error: Account balance could not be determined'); return;
		}
		callback(null, coins(rows[0].availBalance));
	});
}

Wallet.prototype.getUnconfirmedBalance = function(account, currency, callback) {
	db.query('SELECT SUM(amount) AS unconfirmed FROM deposits WHERE account = ? AND currency = ? AND status = ?', [account, currency, 'pending'], function(err, rows) {
		if (!rows || !rows.length) {
			callback('Error: Account balance could not be determined'); return;
		}
		callback(null, rows[0].unconfirmed);
	});
}

Wallet.prototype.getAddress = function(account, currency, callback) {
	var wallet = this;
	db.query('SELECT address FROM addresses WHERE account = ? AND currency = ? ORDER BY id DESC LIMIT 1', [account, currency], function(err, rows) {
		if (err) throw err;
		if (!rows || !rows.length) {
			wallet.getNewAddress(account, currency, callback);
			return;
		}
		callback(null, rows[0].address);
	});
}

Wallet.prototype.getNewAddress = function(account, currency, callback) {
	var wallet = this;
	this.daemons[currency].getNewAddress(account, function(err, address) {
		if (err) throw err;
		db.query('INSERT INTO addresses (account, currency, created_on, address) VALUES (?, ?, NOW(), ?)', [account, currency, address], function(err) {
			if (err) throw err;
			callback(null, address);
		});
	});
}

module.exports = Wallet;