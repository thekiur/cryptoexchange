module.exports = function(req, res){
  res.render('index', { title: 'CryptoExchange' , loggedin: !!req.session.user});
};