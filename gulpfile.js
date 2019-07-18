/**
 * User: Constantine Melnikov
 * Email: ka.melnikov@gmail.com
 * Date: 05.12.14
 * Time: 14:42
 */
'use strict';

const { series, src, dest } = require('gulp');
const browserify = require('gulp-browserify');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');
const gulpDevelopServer = require('gulp-develop-server');
const karmaServer = require('karma').Server;


function build() {
  return src('src/index.js')
    .pipe(browserify({
      standalone: 'ApiClient',
    }))
    .pipe(uglify())
    .pipe(rename('api-client.min.js'))
    .pipe(dest('dist'));
}

function buildDebug() {
  return src('src/index.js')
    .pipe(browserify({
      standalone: 'ApiClient',
      debug: true,
    }))
    .pipe(rename('api-client.js'))
    .pipe(dest('dist'));
}

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
exports.default = series(build, buildDebug);
