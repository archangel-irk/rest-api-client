/**
 * User: Constantine Melnikov
 * Email: ka.melnikov@gmail.com
 * Date: 27.01.15
 * Time: 16:16
 */
'use strict';

var utils = {};

/**
 * https://github.com/aheckmann/mquery/blob/master/lib/mquery.js
 * mquery.select
 *
 * Specifies which document fields to include or exclude
 *
 * ####String syntax
 *
 * When passing a string, prefixing a path with `-` will flag that path as excluded.
 * When a path does not have the `-` prefix, it is included.
 *
 * ####Example
 *
 *     // include a and b, exclude c
 *     utils.select('a b -c');
 *
 *     // or you may use object notation, useful when
 *     // you have keys already prefixed with a "-"
 *     utils.select({a: 1, b: 1, c: 0});
 *
 * @param {Object|String} selection
 * @return {Object|undefined}
 * @api public
 */
utils.select = function( selection ){
  if (!selection) return;

  if (arguments.length !== 1) {
    throw new Error('Invalid select: select only takes 1 argument');
  }

  var fields = {};
  var type = typeof selection;

  if ('string' === type || 'object' === type && 'number' === typeof selection.length && !Array.isArray( selection )) {
    if ('string' === type){
      selection = selection.split(/\s+/);
    }

    for (var i = 0, len = selection.length; i < len; ++i) {
      var field = selection[ i ];
      if ( !field ) continue;
      var include = '-' === field[ 0 ] ? 0 : 1;
      if (include === 0) field = field.substring( 1 );
      fields[ field ] = include;
    }

    return fields;
  }

  if (_.isPlainObject( selection ) && !Array.isArray( selection )) {
    var keys = Object.keys( selection );
    for (var j = 0; j < keys.length; ++j) {
      fields[ keys[ j ] ] = selection[ keys[ j ] ];
    }
    return fields;
  }

  throw new TypeError('Invalid select() argument. Must be string or object.');
};

module.exports = utils;
