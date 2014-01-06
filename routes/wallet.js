module.exports = function(req, res) {
  res.render('wallet', { currency: req.params.currency });
};