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

  _request: function( method ){
    console.log( this.resourceName + '::_request' );
    return this.instance._request( method, this.constructUrl(), this.data );
  }
};

$.each('create read update delete patch'.split(' '), function( i, verb ){
  resourceMixin[ verb ] = function( doneCallback ){
    console.log( this.resourceName + '::' + verb );
    return this._request( verb ).done( doneCallback );
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

  read: function(){
    console.log( 'instance::read' );
    return this._request('read', this.url);
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
    var type = this.methodMap[ method ];

    //TODO: нужен обработчик ошибок
    //TODO: дать больше настроек
    //TODO: возможность добавлять свои заголовки (при инициализации апи или вызове метода)
    return $.ajax({
      type: type,
      url: url,
      data: data,
      headers: headers
    });
  }
});

$.each('create read update delete patch'.split(' '), function( i, verb ){
  api[ verb ] = function( doneCallback ){
    console.log( this.resourceName + '::' + verb );
    return this._request( verb ).done( doneCallback );
  };
});

window.api = api;





window.github = api('https://api.github.com', {
  token: '8fbfc540f1ed1417083c70a990b4db3c9aa86efe'
});

github.add('search', {
  asd: function(){
    console.log( 'user::asd' );
  }
});
github.search.add('users', {
  asd: function(){
    this.parent.asd();
  }
});

github.add('user');
github.add('users');
github.users.add('repos');

//github.user.repos.read();

// /places/filter?sort=rating-desc&orgtype[]=place&map=1
/*cf.api.places.filter.get({
  sort: 'rating-desc',
  orgtype: ['place'],
  map: 1
});*/

}();