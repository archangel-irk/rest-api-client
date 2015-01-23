/**
 * User: Constantine Melnikov
 * Email: ka.melnikov@gmail.com
 * Date: 05.12.14
 * Time: 14:42
 */
'use strict';

var gulp = require('gulp');
var browserify = require('gulp-browserify');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var server = require('gulp-develop-server');
var karma = require('karma').server;

gulp.task('build:debug', function() {
  gulp.src('src/index.js')
    .pipe( browserify({
      standalone: 'ApiClient',
      debug: true
    }) )
    .pipe( rename('api-client.js') )
    .pipe( gulp.dest('dist') );
});

gulp.task('build', function() {
  gulp.src('src/index.js')
    .pipe( browserify({
      standalone: 'ApiClient'
    }) )
    .pipe( uglify() )
    .pipe( rename('api-client.min.js') )
    .pipe( gulp.dest('dist') );
});

/*gulp.task('server', function () {
  // Start the server at the beginning of the task
  server.run({
    file: 'tests/server/app.js'
  });

  server.stop();
});*/

gulp.task('server', function() {
  server.listen({
    path: 'tests/server/app.js'
  });

  setTimeout(function(){
    server.kill();
  }, 10000 );
});

gulp.task('test', ['server'], function (done) {
  karma.start({
    configFile: __dirname + '/karma.conf.js'
  }, function(){

    server.kill();

    done();
  });
});

gulp.task('default', ['build', 'build:debug']);
