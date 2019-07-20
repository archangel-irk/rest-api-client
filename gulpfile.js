/**
 * User: Constantine Melnikov
 * Email: ka.melnikov@gmail.com
 * Date: 05.12.14
 * Time: 14:42
 */
'use strict';

const { series } = require('gulp');
const gulpDevelopServer = require('gulp-develop-server');
const karmaServer = require('karma').Server;

function server(cb) {
  return gulpDevelopServer.listen({
    path: 'test/server/server.js',
  }, function(err) {
    cb();
  });
}

function test(cb) {
  return new karmaServer({
    configFile: __dirname + '/karma.conf.js',
  }, function() {
    gulpDevelopServer.kill();
    cb();
  }).start();
}

exports.test = series(server, test);
