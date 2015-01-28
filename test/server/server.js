/**
 * User: Constantine Melnikov
 * Email: ka.melnikov@gmail.com
 * Date: 23.01.15
 * Time: 15:07
 */
'use strict';

var express = require('express');
var bodyParser = require('body-parser');

var app = express();

app.set('port', process.env.PORT || 3000);

//app.use(express.bodyParser());

// ## CORS middleware
var allowCrossDomain = function(req, res, next) {
  if (!req.get('Origin')) return next();

  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

  // intercept OPTIONS method
  if ('OPTIONS' == req.method) return res.send(200);

  next();
};
app.use( allowCrossDomain );

// parse application/json
app.use( bodyParser.json() );



app.get('/', function( req, res ){
  res.json({ user: 'tobi' });
});

app.get('/users', function( req, res ){
  res.json([{ user: 'tobi' },{ user: 'loki' }]);
});

var server = app.listen( app.get('port'), function(){

  var host = server.address().address;
  var port = server.address().port;

  console.log('Test server app listening at http://%s:%s', host, port);

});