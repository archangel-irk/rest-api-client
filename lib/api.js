/**
 * RESTful API Client
 *
 * Simple use: $.api.module.create({ ••• DATA ••• }, success, error);
 *
 * User: Maksim Chetverikov
 * Date: 04.06.13
 * Time: 14:53
 */

"use strict";

(function(){

  var Api = {
    module: '',
    address: 'http://api.irkdev.com/',

    create: function( data, success, error ){
      if(!$.isPlainObject(data))
        console.log(" --CF-- Data is not plain object --CF-- ");

      this._request( 'post', data, success, error );
    },

    update: function( id, data, success, error ){
      var settings = {
        postfix: "/" + id
      };

      this._request( "PUT", data, success, error, settings);
    },

    delete: function( id, data, success, error){
      var settings = {
        postfix: "/" + id
      };

      this._request( 'delete', data, success, error, settings);
    },

    get: function( id, data, success, error ){
      var settings = {
        postfix: "/" + id
      };

      this._request( 'get', data, success, error, settings);
    },

    /**
     * Request to server
     *
     * @param method   String of {POST,GET,PUT,DELETE}
     * @param data     Plain object
     * @param success  Function on success
     * @param error    Function on error
     * @param settings Other settings for $.ajax
     * @private
     */
    _request: function(method, data, success, error, settings ){
      var url = this.address + this.module;

      settings = settings || {};

      url = (settings.postfix)? url + settings.postfix: url;

      settings = $.extend({
        data: data,
        dataType: "json",
        crossDomain: true,
        contentType: "application/json",
        type: method
      }, settings);

      $.ajax( url , settings)
        .success(success)
        .error(error);
    },

    _response: function( data, xhr ){

    }
  };

  cf.api = {};

  /**
   * Method for add module
   * in cf.api namespace
   *
   * @param module_name
   * @param module_object
   */
  cf.api.module = function( module_name, module_object ){
    var proxied_prototype = $.extend({}, Api);

    module_object.module = module_name;

    $.each( module_object, function( prop, value ) {
      if ( !$.isFunction( value ) ) {
        proxied_prototype[ prop ] = value;
        return;
      }

      proxied_prototype[ prop ] = (function() {
        var _super = function() {
            return Api[ prop ].apply( this, arguments );
          },
          _superApply = function( args ) {
            return Api[ prop ].apply( this, args );
          };

        return function() {
          var __super = this._super,
            __superApply = this._superApply,
            returnValue;

          this._super = _super;
          this._superApply = _superApply;

          returnValue = value.apply( this, arguments );

          this._super = __super;
          this._superApply = __superApply;

          return returnValue;
        };
      })();
    });

    cf.api[ module_name ] = proxied_prototype;
  };

  console.log(" --CF-- API Client is init --CF-- ");

})();