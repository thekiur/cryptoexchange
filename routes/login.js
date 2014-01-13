exchange = process.exchange;

module.exports = function(req, res) {
  if (req.params.logout) {
  	req.session.account = null;
  	req.session.user = null
  	delete req.session.account;
  	delete req.session.user;
  	res.redirect('/');
  	return;
  }
  if (req.body.username && req.body.password) {
  	exchange.login(req.body.username, req.body.password, function(err, user) {
  	  if (err && err !== 'User not found') {
  	  	res.render('index', { login_error : true })
  	  	return;
  	  }
  	  else if (err) {
  	  	res.render('index', { login_error : true });
  	  	return;
  	  }
  	  else {
  	  	req.session.account = user.id.toString();
  	  	req.session.user = user;
		res.redirect('/');
		return;
  	  }
  	});
  }
  else {
    res.redirect('/');  	
  }
};