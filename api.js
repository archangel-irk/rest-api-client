/**
 * API Client
 *
 * User: Constantine Melnikov
 * Email: ka.melnikov@gmail.com
 * Date: 21.08.13
 * Time: 21:50
 */
!function(){
'use strict';

var resourceMixin = {
  resourceName: 'resource',
  url: '',

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
    return this.parent
      ? constructUrl.call( this.parent ) + '/' + this.url + ( this.identity ? '/' +  this.identity : '' )
      : this.url;
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
    resource = function resource( data ){
      // Если объъект - значит это куча параметров
      if ( $.isPlainObject( data ) ){
        resource.data = data;

      // А иначе это identity ресурса
      } else {
        resource.identity = data;
      }

      return resource;
    };

  $.extend( resource, resourceMixin, {
    url: resourceName,
    resourceName: resourceName
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
var
  api = function( url, options ){
    return new api.instance.init( url, options );
  };

api.instance = api.prototype = {
  constructor: api,

  init: function( url, options ){
    if ( typeof url === 'string' ){
      options = options || {};
      options.url = url;
    }

    $.extend( this, $.isPlainObject( url ) ? url : options );
  },

  // Добавить новый ресурс
  add: resourceMixin.add,

  _request: function( method, url, data, headers ){
    headers = headers || {};

    if ( this.token && typeof headers.token === 'undefined' ){
      headers.Authorization = 'token ' + this.token;
      //Accept: 'application/vnd.github.preview'
    }

    console.log( 'instance::_request' );
    return api._request( method, url, data, headers );
  },

  read: function( headers, doneCallback ){
    console.log( 'instance::read' );
    if ( $.isFunction( headers ) && typeof doneCallback === 'undefined' ){
      doneCallback = headers;
    }

    return this._request('read', this.url, undefined, headers ).done( doneCallback );
  }
};

api.instance.init.prototype = api.instance;

// Добавим полезную функцию extend
api.extend = api.instance.extend = $.extend;

api.extend({
  methodMap: {
    'create': 'POST',
    'read':   'GET',
    'update': 'PUT',
    'delete': 'DELETE',
    'patch':  'PATCH'
  },

  _request: function( method, url, data, headers ){
    console.log( 'api::_request' );
    var type = this.methodMap[ method ],
      settings = {
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
  }
});

$.each('create read update delete patch'.split(' '), function( i, verb ){
  api[ verb ] = function( settings, doneCallback ){
    console.log( this.resourceName + '::' + verb );
    if ( $.isFunction( settings ) && typeof doneCallback === 'undefined' ){
      doneCallback = settings;
    }

    return this._request( verb, settings ).done( doneCallback );
  };
});

window.api = api;


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