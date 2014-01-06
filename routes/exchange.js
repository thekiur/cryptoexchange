module.exports = function(req, res){
  res.render('exchange', { pair: req.params.pair });
};