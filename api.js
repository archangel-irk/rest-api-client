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
    return this.parent
      ? constructUrl.call( this.parent ) + '/' + this.url + identity
      : this.url;
  },

  _request: function( method, headers ){
    var url = this.constructUrl();

    console.log( this.resourceName + '::' + method + ' _request to ' + url );
    return this.instance._request( method, url, this.params, headers );
  }
};

$.each('create read update delete patch get post'.split(' '), function( i, verb ){
  resourceMixin[ verb ] = function( headers, doneCallback ){
    // Если headers - есть функция, то это doneCallback
    if ( $.isFunction( headers ) && typeof doneCallback === 'undefined' ){
      doneCallback = headers;
    }

    var request = this._request( verb, headers ).done( doneCallback );

    // Этот параметр сохраняется для возможности собирать url,
    // по этому его надо очистить для дальшейших запросов.
    this.identity = '';
    return request;
  };
});

// Как бы конструктор ресурса, но возвращает функцию-объект с примесями
var Resource = function( resourceName, base, mixin ){
  var
    resource = function resource( identity, params ){
      // Если объект - значит это куча параметров
      if ( $.isPlainObject( identity ) ){
        resource.identity = '';
        resource.params = identity;
      // А иначе это identity ресурса
      } else {
        resource.identity = identity;
        resource.params = params;
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

  /**
   * Добавить новый ресурс
   * @see resourceMixin.add
   */
  add: resourceMixin.add,

  // Объект для добавления произвольных заголовков ко всем запросам
  // удобно для авторизации по токенам
  headers: {},

  methodsMap: {
    'create': 'POST',
    'read':   'GET',
    'update': 'PUT',
    'delete': 'DELETE',
    'patch':  'PATCH',

    'post':   'POST',
    'get':    'GET'
  },

  _request: function( method, url, params, headers ){
    headers = $.extend( true, {}, this.headers, headers );

    if ( this.token && typeof headers.token === 'undefined' ){
      headers.Authorization = 'token ' + this.token;
      //Accept: 'application/vnd.github.preview'
    }

    var instance = this,
      type = this.methodsMap[ method ],
      ajaxSettings = {
        //cache: false,
        type: type,
        url: url,
        data: JSON.stringify(params),
        headers: headers,
        contentType: 'application/json'
      };

    if ( $.isPlainObject( method ) ){
      ajaxSettings = method;
    }

    // Используется для алиасов, в которых второй параметр - есть объект настроек
    if ( $.isPlainObject( url ) ){
      ajaxSettings = url;
    }

    return $.ajax( ajaxSettings ).fail(function( jqXHR, textStatus, errorThrown ){
      console.warn( jqXHR, textStatus, errorThrown );

      // Unauthorized
      if ( jqXHR.status === 401 && instance.unauthorizedCallback ){
        instance.unauthorizedCallback( jqXHR );
      }
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