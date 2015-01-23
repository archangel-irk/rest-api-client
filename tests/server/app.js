/**
 * User: Constantine Melnikov
 * Email: ka.melnikov@gmail.com
 * Date: 23.01.15
 * Time: 15:07
 */
'use strict';

var express = require('express');
var app = express();

app.get('/', function (req, res) {
  res.send('Hello World!');
});

var server = app.listen(3000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

});