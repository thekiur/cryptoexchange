exchange = process.exchange;

module.exports = function(req, res){
  if (req.body.username && req.body.email && req.body.password1 && req.body.password2) {
  	if(req.body.password1.length < 8) {
		res.render('register', {
			error : 'Error: Password too short!',
			page : 'register'
		});
  		return;
  	}
  	if(req.body.password1 != req.body.password2) {
		res.render('register', {
			error : 'Error: Passwords dont match!',
				page : 'register'
		});
  		return;
  	}
  	exchange.createAccount(req.body.username, req.body.email, req.body.password1, function(err, id) {
  		if (err) {
  			res.render('register', {
  				error : 'Error: ' + err.toString(),
				page : 'register'
  			});
  		}
  		else {
  			res.render('register', {
  				success : true,
  				page : 'register'
  			});
  		}
  	});
  }
  else if(Object.keys(req.body).length > 0) {
		res.render('register', {
			error : 'Error: Please fill all the fields!',
			page : 'register'
		});  	
  }
  else {
  	res.render('register', {page:'register'});
  }
};