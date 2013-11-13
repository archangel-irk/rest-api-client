/**
 * API Client
 */
!function(){
'use strict';

var resourceMixin = {
  resourceName: 'resource',
  url: '', // = resourceName

  // Добавить новый ресурс
  add: function( resourceName, base, mixin ){
    if ( !mixin ) {
      mixin = base;
      base = this;
    }

    return this[ resourceName ] = Resource( resourceName, base, mixin );
  },

  // Пробежаться по всем родителям и собрать url (без query string)
  constructUrl: function constructUrl(){
    var identity = this.identity ? '/' + this.identity : '';

    // Пробежаться по всем ресурсам и заглянуть в корень апи, чтобы собрать url
    var url = this.parent
      ? constructUrl.call( this.parent ) + '/' + this.url + identity
      : this.url;

    // Этот параметр сохраняется для возможности собирать url,
    // по этому его надо очистить для дальшейших запросов.
    this.identity = '';

    return url;
  },

  _request: function( method, headers ){
    console.log( this.resourceName + '::_request' );
    return this.instance._request( method, this.constructUrl(), this.data, headers );
  }
};

$.each('create read update delete patch'.split(' '), function( i, verb ){
  resourceMixin[ verb ] = function( headers, doneCallback ){
    console.log( this.resourceName + '::' + verb );
    if ( $.isFunction( headers ) && typeof doneCallback === 'undefined' ){
      doneCallback = headers;
    }

    return this._request( verb, headers ).done( doneCallback );
  };
});

// Как бы конструктор ресурса, но возвращает функцию-объект с примесями
var Resource = function( resourceName, base, mixin ){
  var
  //TODO: сделать два параметра identity и data
    resource = function resource( data ){
      // Если объект - значит это куча параметров
      if ( $.isPlainObject( data ) ){
        resource.data = data;
        resource.identity = '';

      // А иначе это identity ресурса
      } else {
        resource.identity = data;
      }

      return resource;
    };

  $.extend( resource, resourceMixin, {
    resourceName: resourceName,
    url: resourceName
  }, mixin );

  resource.parent = base;
  resource.instance = base.instance || base;

  return resource;
};

/**
 * Создать новый экземпляр api клиента
 *
 * @example
 * Api('/api', {
 *   token: 'XXXXXX'
 * });
 *
 * Api('https://domain.com/api', {
 *   token: 'XXXXXX'
 * });
 *
 * Api({
 *   url: '/api'
 *   token: 'XXXXXX'
 * });
 *
 * @param url
 * @param options
 */
var Api = function( url, options ){
  return new Api.instance.init( url, options );
};

Api.instance = Api.prototype = {
  constructor: Api,

  init: function( url, options ){
    if ( typeof url === 'string' ){
      options = options || {};
      options.url = url;
    }

    $.extend( this, $.isPlainObject( url ) ? url : options );
  },

  // Добавить новый ресурс
  add: resourceMixin.add,

  methodMap: {
    'create': 'POST',
    'read':   'GET',
    'update': 'PUT',
    'delete': 'DELETE',
    'patch':  'PATCH'
  },

  _request: function( method, url, data, headers ){
    console.log( 'api::_request' );
    headers = headers || {};

    if ( this.token && typeof headers.token === 'undefined' ){
      headers.Authorization = 'token ' + this.token;
      //Accept: 'application/vnd.github.preview'
    }

    var api = this,
      type = this.methodMap[ method ],
      settings = {
        //cache: false,
        type: type,
        url: url,
        data: data,
        headers: headers
      };

    if ( $.isPlainObject( method ) ){
      settings = method;
    }

    // Используется для алиасов, в которых второй параметр - есть объект настроек
    if ( $.isPlainObject( url ) ){
      settings = url;
    }

    return $.ajax( settings ).fail(function( jqXHR, textStatus, errorThrown ){
      console.warn( jqXHR, textStatus, errorThrown );
    });
  },

  read: function( headers, doneCallback ){
    console.log( 'instance::read' );
    if ( $.isFunction( headers ) && typeof doneCallback === 'undefined' ){
      doneCallback = headers;
    }

    return this._request('read', this.url, undefined, headers ).done( doneCallback );
  }
};

Api.instance.init.prototype = Api.instance;

// Добавим полезную функцию extend
Api.extend = Api.instance.extend = $.extend;

window.Api = Api;

// Example
/*window.github = api('https://api.github.com', {
  token: '7d3268a2396ee7f4a601a37054ca8778dd45e8d5'
});

github.add('search', {
  searchMethod: function(){
    console.log( 'search::searchMethod' );
  }
});
github.search.add('users', {
  usersMethod: function(){
    this.parent.searchMethod();
  }
});

github.add('user');
github.add('users');
github.users.add('repos');*/

//github.users.repos.read();
}();