/* eslint-env node */

const express = require('express');
const bodyParser = require('body-parser');

// from example
// https://github.com/tasubo/karma-express-http-server
// https://github.com/weblogixx/karma-restify-server

function createApiClientTestServer(args, config, logger, helper) {
  var log = logger.create('api-client-test-server');
  log.info('Creating');

  var app = express();
  app.set('port', 3022);

  // ## CORS middleware
  function allowCrossDomain(req, res, next) {
    if (!req.get('Origin')) return next();

    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers',
      'Content-Type, Authorization, Content-Length, X-Requested-With');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) return res.sendStatus(200);

    next();
  }

  app.use(allowCrossDomain);

  // for parsing application/json
  app.use(bodyParser.json());
  // for parsing application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({ extended: true }));

  app.get('/', function(req, res) {
    res.json({ user: 'tobi' });
  });

  app.get('/users', function(req, res) {
    res.json([{ user: 'tobi' }, { user: 'loki' }]);
  });

  app.post('/users', function(req, res) {
    log.info(req.body);
    res.json(req.body);
  });

  app.listen(app.get('port'), () => {
    log.info(`Started on port ${app.get('port')}`);
  });
}

module.exports = {
  'framework:api-client-test-server': ['factory', createApiClientTestServer],
};
