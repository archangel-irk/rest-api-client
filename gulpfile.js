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

gulp.task('build:debug', function() {
  gulp.src('src/index.js')
    .pipe( browserify({
      standalone: 'ApiClient',
      debug: true
    }) )
    .pipe( rename('api-client.js') )
    .pipe( gulp.dest('dist') )
});

gulp.task('build', function() {
  gulp.src('src/index.js')
    .pipe( browserify({
      standalone: 'ApiClient'
    }) )
    .pipe( uglify() )
    .pipe( rename('api-client.min.js') )
    .pipe( gulp.dest('dist') )
});

gulp.task('default', ['build', 'build:debug']);
