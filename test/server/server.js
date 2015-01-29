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
  if ('OPTIONS' == req.method) return res.sendStatus(200);

  next();
};
app.use( allowCrossDomain );

// for parsing application/json
app.use( bodyParser.json() );
// for parsing application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));



app.get('/', function( req, res ){
  res.json({ user: 'tobi' });
});

app.get('/users', function( req, res ){
  res.json([{ user: 'tobi' },{ user: 'loki' }]);
});

app.post('/users', function( req, res ){
  console.log( req.body );
  res.json( req.body );
});

var server = app.listen( app.get('port'), function(){

  var host = server.address().address;
  var port = server.address().port;

  console.log('Test server app listening at http://%s:%s', host, port);

});