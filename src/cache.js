import { utils } from './utils.js';

export function Cache(){
  this.data = {};
}

Cache.prototype.getKey = function( ajaxSettings ){
  var key = '';
  var _this = this;

  Object.keys( ajaxSettings ).forEach(function( k ){
    var value = ajaxSettings[ k ];

    key += k + '=' + (utils.isObject( value ) ? '{' + _this.getKey( value ) + '}' : value) + '|';
  });

  return key;
};

Cache.prototype.put = function( key, data ){
  this.data[ key ] = {
    created: new Date(),
    data: data
  };
};

Cache.prototype.get = function( key ){
  var result;
  result = this.data[ key ];
  if ( !result ) {
    return;
  }

  // cached flag
  result.data.response.__cached = true;

  //if ( this.valid(result.created) ){
    return result.data;
  //}
};

Cache.prototype.clear = function(  ){
  this.data = {};
};
