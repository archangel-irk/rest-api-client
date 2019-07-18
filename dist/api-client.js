!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.ApiClient=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
/**
 * User: Constantine Melnikov
 * Email: ka.melnikov@gmail.com
 * Date: 29.01.15
 * Time: 19:37
 */
'use strict';

var utils = _dereq_('./utils');

function Cache(){
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

module.exports = Cache;
},{"./utils":6}],2:[function(_dereq_,module,exports){
/**
 * User: Constantine Melnikov
 * Email: ka.melnikov@gmail.com
 * Date: 29.01.15
 * Time: 15:22
 */
'use strict';

var utils = _dereq_('./utils');

function deleteRequest( data, ajaxSettings, done ){
  var resource = this;
  var method = 'DELETE';

  // Если data - есть функция, то это done
  if ( utils.isFunction( data ) ){
    done = data;
    data = undefined;
  }
  if ( utils.isFunction( ajaxSettings ) ){
    done = ajaxSettings;
    ajaxSettings = undefined;
  }

  ajaxSettings = ajaxSettings || {};
  ajaxSettings.data = data;

  var dfd = $.Deferred();
  this._resourceRequest( method, ajaxSettings ).done(function( response, textStatus, jqXHR ){
    done && done( response, textStatus, jqXHR );
    dfd.resolve( response, textStatus, jqXHR );

  }).fail(function( jqXHR, textStatus, errorThrown ){
    dfd.reject( jqXHR, textStatus, errorThrown );
  });

  // identity сохраняется для constructUrl, его нужно очистить для последующих запросов.
  utils.clearIdentity( resource );

  return dfd;
}

module.exports = deleteRequest;
},{"./utils":6}],3:[function(_dereq_,module,exports){
// API Client
// ---------------

// Example
/*
 var github = ApiClient('https://api.github.com', {
   hooks: {
     headers: {
       Accept: 'application/vnd.github.v3+json',
       Authorization: 'token 8fbfc540f1ed1417083c70a990b4db3c9aa86efe'
     }
   }
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

 // Добавляем ресурсы
 github.add('user');
 github.add('users');
 github.users.add('repos');

 // Прочитать репозитории (отправить гет запрос на https://api.github.com/users/repos/)
 github.users.repos.read();

 //-----------------------------

 // Не совсем REST, все запросы идут на один адрес
 var simpleApi = ApiClient('api.example.com', {});

 simpleApi().read({
  e: '/Base/Department'
 });

 simpleApi.post({ data });
 simpleApi('identity').post({ data }, { ajaxSettings });
 simpleApi('identity').post( null, { ajaxSettings });
 simpleApi.post({ data }, { ajaxSettings });
 simpleApi.post( null, { ajaxSettings });

 simpleApi.read( done ).done( done ).fail( fail );

 Работа с документами (storage), он сам преобразуется через метод $__delta()
 simpleApi.post( Document );
 simpleApi.save( Document );


 // Фичи
 ajaxSettings для каждого запроса
 Identity для каждого запроса

 */

'use strict';

var utils = _dereq_('./utils');
var getRequest = _dereq_('./get');
var createPostLikeRequest = _dereq_('./post' ).createPostLikeRequest;
var deleteRequest = _dereq_('./delete');
var Cache = _dereq_('./cache');

var resourceMixin = {
  resourceName: 'resource',
  url: '', // = resourceName

  /**
   * Добавить новый ресурс
   *
   * @param {string} resourceName
   * @param {object} [parentResource] - родительский ресурс
   * @param {object} [usersMixin] - пользовательская примесь
   * @returns {*}
   */
  add: function( resourceName, parentResource, usersMixin ){
    if ( !usersMixin ) {
      usersMixin = parentResource || {};
      parentResource = this;
    }

    // Бросить исключение, если такой ресурс уже есть
    if ( this[ resourceName ] ){
      throw new TypeError('The resource named ' + resourceName + 'already exists.');
    }

    // Любой из этих параметров указывает на необходимость использовать хранилище
    if ( usersMixin.schemaName || usersMixin.collectionName || usersMixin.storage ) {
      // Определим название создаваемой коллекции
      usersMixin.collectionName = usersMixin.collectionName || resourceName;
    }

    // Перед созданием коллекции нужно создать ресурс, чтобы у коллекции была ссылка на него
    this[ resourceName ] = new Resource( resourceName, parentResource, usersMixin );

    // Создать коллекцию, если этого еще не сделали
    if ( usersMixin.collectionName && !storage[ usersMixin.collectionName ] ){
      // Ищем схему, если она указана
      var schema = storage.schemas[ usersMixin.schemaName ];

      if ( schema ){
        storage.createCollection( usersMixin.collectionName, schema, this[ resourceName ] );
      } else {
        throw new TypeError('Resource::' + resourceName + ' You cannot use storage (create collection), without specifying the schema of the data.');
      }
    }

    return this[ resourceName ];
  },

  _resourceRequest: function( method, ajaxSettings, done ){
    var url = utils.constructUrl( this );
    var useNotifications = this.notifications;

    return this.apiRoot._request( method, url, ajaxSettings.data, ajaxSettings, useNotifications, done );
  }
};

// GET
resourceMixin.get = getRequest;
resourceMixin.read = getRequest;

// POST
resourceMixin.post = createPostLikeRequest('POST');
resourceMixin.create = resourceMixin.post;

// PUT
resourceMixin.put = createPostLikeRequest('PUT');
resourceMixin.update = resourceMixin.put;
resourceMixin.save = resourceMixin.put;

// PATCH
resourceMixin.patch = createPostLikeRequest('PATCH');

// DELETE
resourceMixin.delete = deleteRequest;

/**
 * Конструктор ресурса, но возвращает функцию со свойствами
 *
 * @param {string} resourceName
 * @param {object} parentResource
 * @param {object} usersMixin
 * @returns {Function} resource
 * @constructor
 */
function Resource( resourceName, parentResource, usersMixin ){

  /**
   * Эту функцию мы отдаём пользователю в качестве доступа к ресурсу.
   * Она позволяет задать identity для запроса.
   *
   * @param [identity]
   * @returns {Function}
   */
  var resource = function resource( identity ){
    if ( identity == null ){
      return resource;
    }

    if ( identity && !utils.isString( identity ) ){
      console.error('identity должен быть строкой, а не', identity );
    }

    resource.identity = identity || '';

    return resource;
  };

  $.extend( resource, resourceMixin, {
    resourceName: resourceName,
    url: resourceName
  }, usersMixin );

  resource.parentResource = parentResource;
  resource.apiRoot = parentResource.apiRoot || parentResource;

  return resource;
}

/**
 * Create new api client
 *
 * @example
 * var api = new ApiClient('/api', {
 *   hooks: {
 *     headers: {
 *       token: 'XXXXXX'
 *     }
 *   }
 * });
 *
 * var api = new ApiClient('https://domain.com/api', {
 *   hooks: {
 *     headers: {
 *       token: 'XXXXXX'
 *     }
 *   }
 * });
 *
 * var api = new ApiClient({
 *   url: '/api'
 *   hooks: {
 *     headers: {
 *       token: 'XXXXXX'
 *     }
 *   }
 * });
 *
 * @param url api root url
 * @param options api client options
 */
function ApiClient( url, options ){
  if ( !(this instanceof ApiClient) ) {
    return new ApiClient( url, options );
  }

  this.defaults = {
    // Strip slashes by default
    stripTrailingSlashes: true,
    // Use cache for GET requests
    cache: true
  };

  // If first arg is object
  if ( utils.isObject( url ) ){
    options = url;
    url = location.origin;
  }

  if ( url == null ){
    url = location.origin;
  }

  options = options || {};
  options.url = url;

  // Defaults, notifications is off
  this.notifications = false;

  /**
   * hooks for ajax settings (as base ajaxSettings)
   * @see http://api.jquery.com/jQuery.ajax/
   *
   * @type {Object}
   */
  this.hooks = {
    // дополнительные данные запроса
    data: {},
    // Объект для добавления произвольных заголовков ко всем запросам
    // удобно для авторизации по токенам
    headers: {}
  };

  //todo: to utils (deepMerge) добавить возможность расширять объект, а не возвращать новый
  $.extend( true, this, options );

  // Init cache
  if ( this.defaults.cache ){
    this.cache = new Cache();
  }
}

ApiClient.prototype = {
  /**
   * Добавить новый ресурс
   * @see resourceMixin.add
   */
  add: resourceMixin.add,

  _methods: {
    'create': 'POST',
    'read':   'GET',
    'update': 'PUT',
    'delete': 'DELETE',
    'patch':  'PATCH',

    'post':   'POST',
    'get':    'GET',
    'save':   'PUT'
  },

  _prepareAjaxSettings: function( method, url, data, ajaxSettings ){
    var _ajaxSettings = utils.deepMerge( this.hooks, ajaxSettings );

    _ajaxSettings.type = method;

    // strip trailing slashes and set the url (unless this behavior is specifically disabled)
    if ( this.defaults.stripTrailingSlashes ){
      url = url.replace(/\/+$/, '') || '/';
    }

    _ajaxSettings.url = url;

    // Добавляем авторизацию по токену
    if ( this.token && ajaxSettings.headers && ajaxSettings.headers.token == null ){
      _ajaxSettings.headers.Authorization = 'token ' + this.token;
    }

    if ( method === 'GET' ){
      _ajaxSettings.data = utils.deepMerge( _ajaxSettings.data, data );
    } else {
      // Если сохраняем документ, нужно сделать toObject({depopulate: 1})
      if ( data && data.constructor && data.constructor.name && data.constructor.name === 'Document' ){
        _ajaxSettings.data = utils.deepMerge( _ajaxSettings.data, data.toObject({depopulate: 1}) );

      } else if ( data ) {
        _ajaxSettings.data = utils.deepMerge( _ajaxSettings.data, data );
      }

      if ( _ajaxSettings.data && _ajaxSettings.contentType === 'application/json' ){
        _ajaxSettings.data = JSON.stringify( _ajaxSettings.data );
      }
    }

    // todo проверть надобность кода
    // Используется для алиасов, в которых второй параметр - есть объект настроек
    if ( utils.isObject( url ) ){
      console.info('Ах@*ть, нужный код!!!!');
      _ajaxSettings = url;
      debugger;
    }

    return _ajaxSettings;
  },

  /**
   * Send request on server
   *
   * @param {string} method Название метода (POST, GET, PUT, DELETE, PATCH)
   * @param {string} url Полный урл ресурса
   * @param {object} data Объект с данными для запроса
   * @param {object} ajaxSettings Объект с настройками
   * @param {boolean} useNotifications Флаг, использовать ли уведомления
   * @param {function} done Функция успешного обратного вызова
   * @returns {$.Deferred} возвращает jquery ajax объект
   *
   * @private
   */
  _request: function( method, url, data, ajaxSettings, useNotifications, done ){
    if ( !utils.isString( method ) ){
      throw new Error('Параметр `method` должен быть строкой, а не ', method );
    }

    var self = this;
    var notificationType = method === 'GET' ? 'load' : ( method === 'POST' || method === 'PUT' || method === 'PATCH' ) ? 'save' : 'delete';
    var _ajaxSettings = this._prepareAjaxSettings( method, url, data, ajaxSettings );

    // Использовать значение по умолчанию, если useNotifications не задан
    // тут же порверяем, подключены ли уведомления
    if ( utils.isBoolean( useNotifications ) ){
      useNotifications = useNotifications && cf.notification;
    } else {
      useNotifications = this.notifications && cf.notification;
    }

    if ( useNotifications ){
      cf.notification[ notificationType ].show();
    }

    console.log( method + ' ' + _ajaxSettings.url );

    return $.ajax( _ajaxSettings ).fail(function( jqXHR, textStatus, errorThrown ){
      console.warn( jqXHR, textStatus, errorThrown );

      // Unauthorized Callback
      if ( jqXHR.status === 401 && self.unauthorizedCallback ){
        self.unauthorizedCallback( jqXHR, method, url, data, ajaxSettings, done );

        // Не показывать сообщение с ошибкой при 401, если всё плохо, то роутер сам перекинет на форму входа
        if ( useNotifications ){
          cf.notification[ notificationType ].hide();
        }

        return;
      }

      if ( useNotifications ){
        cf.notification[ notificationType ].fail();
      }

    }).done(function(){
      if ( useNotifications ){
        cf.notification[ notificationType ].hide();
      }
    }).done( done );
  }
};

/**
 * Method for get request to api root
 *
 * @param ajaxSettings
 * @param done
 * @returns {$.Deferred}
 */
ApiClient.prototype.get = function( ajaxSettings, done ){
  console.log( 'api::get' );
  if ( utils.isFunction( ajaxSettings ) ){
    done = ajaxSettings;
    ajaxSettings = undefined;
  }

  ajaxSettings = ajaxSettings || {};

  return this._request('GET', this.url, undefined, ajaxSettings, false, done );
};
/**
 * @alias ApiClient.prototype.get
 * @type {Function}
 */
ApiClient.prototype.read = ApiClient.prototype.get;

ApiClient.version = '0.3.0';

ApiClient.utils = utils;

// exports
module.exports = ApiClient;
},{"./cache":1,"./delete":2,"./get":4,"./post":5,"./utils":6}],4:[function(_dereq_,module,exports){
/**
 * User: Constantine Melnikov
 * Email: ka.melnikov@gmail.com
 * Date: 29.01.15
 * Time: 15:12
 */
'use strict';

var utils = _dereq_('./utils');

/**
 * GET request
 *
 * В ajaxSettings можно указать поле doNotStore - чтобы не сохранять полученный объект в storage
 *
 * @param [data]
 * @param [ajaxSettings]
 * @param [done]
 * @returns {*}
 */
function getRequest( data, ajaxSettings, done ){
  var resource = this;
  var method = 'GET';
  var key;

  // Если data - есть функция, то это done
  if ( utils.isFunction( data ) ){
    done = data;
    data = undefined;
  }
  if ( utils.isFunction( ajaxSettings ) ){
    done = ajaxSettings;
    ajaxSettings = undefined;
  }

  ajaxSettings = ajaxSettings || {};
  ajaxSettings.data = data;

  if ( resource.apiRoot.defaults.cache ){
    ajaxSettings.url = utils.constructUrl( resource );

    key = resource.apiRoot.cache.getKey( ajaxSettings );
    var req = resource.apiRoot.cache.get( key );

    if ( req ){
      done && done( req.response, req.textStatus, req.jqXHR );
      utils.clearIdentity( resource );
      return $.Deferred().resolve( req.response, req.textStatus, req.jqXHR );
    }
  }

  var dfd = $.Deferred();
  this._resourceRequest( method, ajaxSettings ).done(function( response, textStatus, jqXHR ){
    var fields;

    // #example
    // api.places({ fields: 'name', skip: 100 });
    // Если была выборка по полям, нужно правильно обработать её и передать в документ
    if ( data && data.fields ){
      fields = utils.select( data.fields );
    }

    // Есть ответ надо сохранить в хранилище
    if ( resource.storage && !ajaxSettings.doNotStore ){
      response = storage[ resource.collectionName ].add( response, fields, true );
    }

    if ( resource.apiRoot.defaults.cache ){
      resource.apiRoot.cache.put( key, {
        response: response,
        textStatus: textStatus,
        jqXHR: jqXHR
      });
    }

    done && done( response, textStatus, jqXHR );
    dfd.resolve( response, textStatus, jqXHR );

  }).fail(function( jqXHR, textStatus, errorThrown ){
    dfd.reject( jqXHR, textStatus, errorThrown );
  });

  //TODO: Использовать идеологю query? query объект для построения запросов

  // identity сохраняется для constructUrl, его нужно очистить для последующих запросов.
  utils.clearIdentity( resource );

  return dfd;
}

module.exports = getRequest;
},{"./utils":6}],5:[function(_dereq_,module,exports){
/**
 * User: Constantine Melnikov
 * Email: ka.melnikov@gmail.com
 * Date: 29.01.15
 * Time: 15:18
 */
'use strict';

var utils = _dereq_('./utils');

function postLikeRequest( method, data, ajaxSettings, done ){
  var resource = this;
  var identity = this.identity;
  var documentIdString;

  // Если data - есть функция, то это done
  if ( utils.isFunction( data ) ){
    done = data;
    data = undefined;
  }
  if ( utils.isFunction( ajaxSettings ) ){
    done = ajaxSettings;
    ajaxSettings = undefined;
  }

  ajaxSettings = ajaxSettings || {};

  // При сохранении документа нужно сохранять только изменённые поля
  // Иногда передают документ
  if ( resource.storage && data instanceof storage.Document ) {
    documentIdString = data._id.toString();
    data = data.$__delta();

  // Так можно понять, что мы сохраняем сущетвующий на сервере Document
  } else if ( resource.storage && storage.ObjectId.isValid( identity ) ) {
    documentIdString = identity;

  // При сохранении через метод save() у документа
  } else if ( resource.storage && data._id && storage.ObjectId.isValid( data._id ) ) {
    documentIdString = data._id.toString();
  }

  ajaxSettings.data = data;

  var dfd = $.Deferred();
  this._resourceRequest( method, ajaxSettings ).done(function( response, textStatus, jqXHR ){
    var doc;

    // Есть ответ надо сохранить в хранилище
    if ( resource.storage && !ajaxSettings.doNotStore ){
      // При сохранении нужно обновлять документ
      // Попробуем сначала найти документ по id и обновить его
      doc = storage[ resource.collectionName ].findById( documentIdString );

      if ( doc ){
        // Обновляем документ
        doc.set( response );

        // Создаём ссылку по новому id в коллекции
        storage[ resource.collectionName ].updateIdLink( doc );

        // Этот документ теперь сохранён на сервере, значит он уже не новый.
        doc.isNew = false;

        response = doc;

      } else {
        response = storage[ resource.collectionName ].add( response, undefined, true );
      }
    }

    done && done( response, textStatus, jqXHR );
    dfd.resolve( response, textStatus, jqXHR );

  }).fail(function( jqXHR, textStatus, errorThrown ){
    dfd.reject( jqXHR, textStatus, errorThrown );
  });

  // identity сохраняется для constructUrl, его нужно очистить для последующих запросов.
  utils.clearIdentity( resource );

  return dfd;
}

// Partial Application
function createPostLikeRequest( method ){
  return function(){
    var args = Array.prototype.slice.call( arguments );

    return postLikeRequest.apply( this, [ method ].concat( args ) );
  };
}

exports.postLikeRequest = postLikeRequest;
exports.createPostLikeRequest = createPostLikeRequest;
},{"./utils":6}],6:[function(_dereq_,module,exports){
/**
 * User: Constantine Melnikov
 * Email: ka.melnikov@gmail.com
 * Date: 27.01.15
 * Time: 16:16
 */
'use strict';

var utils = {};

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    numberTag = '[object Number]',
    objectTag = '[object Object]',
    regexpTag = '[object RegExp]',
    stringTag = '[object String]';

/** Used for native method references. */
var arrayProto = Array.prototype;
var objectProto = Object.prototype;

/**
 * Used to resolve the `toStringTag` of values.
 * See the [ES spec](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.prototype.tostring)
 * for more details.
 */
var objToString = objectProto.toString;

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return (value && typeof value === 'object') || false;
}

/**
 * Checks if `value` is classified as a `String` primitive or object.
 *
 * @static
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * utils.isString('abc');
 * // => true
 *
 * utils.isString(1);
 * // => false
 */
utils.isString = function isString( value ) {
  return typeof value === 'string' || (isObjectLike(value) && objToString.call(value) === stringTag) || false;
};

/**
 * Checks if `value` is classified as a boolean primitive or object.
 *
 * @static
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * utils.isBoolean(false);
 * // => true
 *
 * utils.isBoolean(null);
 * // => false
 */
utils.isBoolean = function isBoolean(value) {
  return (value === true || value === false || isObjectLike(value) && objToString.call(value) === boolTag) || false;
};

/**
 * Checks if `value` is the language type of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * **Note:** See the [ES5 spec](https://es5.github.io/#x8) for more details.
 *
 * @static
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * utils.isObject({});
 * // => true
 *
 * utils.isObject([1, 2, 3]);
 * // => true
 *
 * utils.isObject(1);
 * // => false
 *
 * utils.isObject(function(){});
 * // => false
 */
utils.isObject = function isObject( value ) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return (value && value !== null && type === 'object') || false;
};

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * utils.isFunction(function(){});
 * // => true
 *
 * utils.isFunction(/abc/);
 * // => false
 */
utils.isFunction = function isFunction(value) {
  // Avoid a Chakra JIT bug in compatibility modes of IE 11.
  // See https://github.com/jashkenas/underscore/issues/1621 for more details.
  return typeof value === 'function' || false;
};

// https://github.com/nrf110/deepmerge
/**
 * Merge two objects `x` and `y` deeply, returning a new merged object with the elements from both `x` and `y`.
 *
 * If an element at the same key is present for both `x` and `y`, the value from `y` will appear in the result.
 *
 * The merge is immutable, so neither `x` nor `y` will be modified.
 *
 * The merge will also merge arrays and array values.
 *
 * @param target
 * @param src
 * @returns {boolean|Array|{}}
 */
utils.deepMerge = function deepMerge( target, src ){
  var array = Array.isArray(src);
  var dst = array && [] || {};

  if (array) {
    target = target || [];
    dst = dst.concat(target);
    src.forEach(function(e, i) {
      if (typeof dst[i] === 'undefined') {
        dst[i] = e;
      } else if (typeof e === 'object') {
        dst[i] = deepMerge(target[i], e);
      } else {
        if (target.indexOf(e) === -1) {
          dst.push(e);
        }
      }
    });
  } else {
    if (target && typeof target === 'object') {
      Object.keys(target).forEach(function (key) {
        dst[key] = target[key];
      });
    }

    if ( src == null ){
      return dst;
    }

    Object.keys(src).forEach(function (key) {
      if (typeof src[key] !== 'object' || !src[key]) {
        dst[key] = src[key];
      }
      else {
        if (!target[key]) {
          dst[key] = src[key];
        } else {
          dst[key] = deepMerge(target[key], src[key]);
        }
      }
    });
  }

  return dst;
};

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
utils.select = function select( selection ){
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

  if ( utils.isObject( selection ) && !Array.isArray( selection )) {
    var keys = Object.keys( selection );
    for (var j = 0; j < keys.length; ++j) {
      fields[ keys[ j ] ] = selection[ keys[ j ] ];
    }
    return fields;
  }

  throw new TypeError('Invalid select() argument. Must be string or object.');
};

// Очистить identity у ресурса и его родительских ресурсов тоже
utils.clearIdentity = function clearIdentity( resource ){
  while ( resource.parentResource ) {
    resource.identity = '';
    resource = resource.parentResource;
  }
};

// Собрать url (без query string)
utils.constructUrl = function constructUrl( resource ){
  var identity = resource.identity ? '/' + resource.identity : '/';

  // Пробежаться по всем ресурсам, в том числе в корень апи, чтобы собрать url
  return resource.parentResource
    ? constructUrl( resource.parentResource ) + '/' + resource.url + identity
    : resource.url;
};

module.exports = utils;

},{}]},{},[3])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9tZWxuaWtvdi9zb3VyY2UvZ2l0aHViL3Jlc3QtYXBpLWNsaWVudC9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL21lbG5pa292L3NvdXJjZS9naXRodWIvcmVzdC1hcGktY2xpZW50L3NyYy9jYWNoZS5qcyIsIi9Vc2Vycy9tZWxuaWtvdi9zb3VyY2UvZ2l0aHViL3Jlc3QtYXBpLWNsaWVudC9zcmMvZGVsZXRlLmpzIiwiL1VzZXJzL21lbG5pa292L3NvdXJjZS9naXRodWIvcmVzdC1hcGktY2xpZW50L3NyYy9mYWtlX2Y5ZTYxMDZhLmpzIiwiL1VzZXJzL21lbG5pa292L3NvdXJjZS9naXRodWIvcmVzdC1hcGktY2xpZW50L3NyYy9nZXQuanMiLCIvVXNlcnMvbWVsbmlrb3Yvc291cmNlL2dpdGh1Yi9yZXN0LWFwaS1jbGllbnQvc3JjL3Bvc3QuanMiLCIvVXNlcnMvbWVsbmlrb3Yvc291cmNlL2dpdGh1Yi9yZXN0LWFwaS1jbGllbnQvc3JjL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4YUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogVXNlcjogQ29uc3RhbnRpbmUgTWVsbmlrb3ZcbiAqIEVtYWlsOiBrYS5tZWxuaWtvdkBnbWFpbC5jb21cbiAqIERhdGU6IDI5LjAxLjE1XG4gKiBUaW1lOiAxOTozN1xuICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuZnVuY3Rpb24gQ2FjaGUoKXtcbiAgdGhpcy5kYXRhID0ge307XG59XG5cbkNhY2hlLnByb3RvdHlwZS5nZXRLZXkgPSBmdW5jdGlvbiggYWpheFNldHRpbmdzICl7XG4gIHZhciBrZXkgPSAnJztcbiAgdmFyIF90aGlzID0gdGhpcztcblxuICBPYmplY3Qua2V5cyggYWpheFNldHRpbmdzICkuZm9yRWFjaChmdW5jdGlvbiggayApe1xuICAgIHZhciB2YWx1ZSA9IGFqYXhTZXR0aW5nc1sgayBdO1xuXG4gICAga2V5ICs9IGsgKyAnPScgKyAodXRpbHMuaXNPYmplY3QoIHZhbHVlICkgPyAneycgKyBfdGhpcy5nZXRLZXkoIHZhbHVlICkgKyAnfScgOiB2YWx1ZSkgKyAnfCc7XG4gIH0pO1xuXG4gIHJldHVybiBrZXk7XG59O1xuXG5DYWNoZS5wcm90b3R5cGUucHV0ID0gZnVuY3Rpb24oIGtleSwgZGF0YSApe1xuICB0aGlzLmRhdGFbIGtleSBdID0ge1xuICAgIGNyZWF0ZWQ6IG5ldyBEYXRlKCksXG4gICAgZGF0YTogZGF0YVxuICB9O1xufTtcblxuQ2FjaGUucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKCBrZXkgKXtcbiAgdmFyIHJlc3VsdDtcbiAgcmVzdWx0ID0gdGhpcy5kYXRhWyBrZXkgXTtcbiAgaWYgKCAhcmVzdWx0ICkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGNhY2hlZCBmbGFnXG4gIHJlc3VsdC5kYXRhLnJlc3BvbnNlLl9fY2FjaGVkID0gdHJ1ZTtcblxuICAvL2lmICggdGhpcy52YWxpZChyZXN1bHQuY3JlYXRlZCkgKXtcbiAgICByZXR1cm4gcmVzdWx0LmRhdGE7XG4gIC8vfVxufTtcblxuQ2FjaGUucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24oICApe1xuICB0aGlzLmRhdGEgPSB7fTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FjaGU7IiwiLyoqXG4gKiBVc2VyOiBDb25zdGFudGluZSBNZWxuaWtvdlxuICogRW1haWw6IGthLm1lbG5pa292QGdtYWlsLmNvbVxuICogRGF0ZTogMjkuMDEuMTVcbiAqIFRpbWU6IDE1OjIyXG4gKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5mdW5jdGlvbiBkZWxldGVSZXF1ZXN0KCBkYXRhLCBhamF4U2V0dGluZ3MsIGRvbmUgKXtcbiAgdmFyIHJlc291cmNlID0gdGhpcztcbiAgdmFyIG1ldGhvZCA9ICdERUxFVEUnO1xuXG4gIC8vINCV0YHQu9C4IGRhdGEgLSDQtdGB0YLRjCDRhNGD0L3QutGG0LjRjywg0YLQviDRjdGC0L4gZG9uZVxuICBpZiAoIHV0aWxzLmlzRnVuY3Rpb24oIGRhdGEgKSApe1xuICAgIGRvbmUgPSBkYXRhO1xuICAgIGRhdGEgPSB1bmRlZmluZWQ7XG4gIH1cbiAgaWYgKCB1dGlscy5pc0Z1bmN0aW9uKCBhamF4U2V0dGluZ3MgKSApe1xuICAgIGRvbmUgPSBhamF4U2V0dGluZ3M7XG4gICAgYWpheFNldHRpbmdzID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgYWpheFNldHRpbmdzID0gYWpheFNldHRpbmdzIHx8IHt9O1xuICBhamF4U2V0dGluZ3MuZGF0YSA9IGRhdGE7XG5cbiAgdmFyIGRmZCA9ICQuRGVmZXJyZWQoKTtcbiAgdGhpcy5fcmVzb3VyY2VSZXF1ZXN0KCBtZXRob2QsIGFqYXhTZXR0aW5ncyApLmRvbmUoZnVuY3Rpb24oIHJlc3BvbnNlLCB0ZXh0U3RhdHVzLCBqcVhIUiApe1xuICAgIGRvbmUgJiYgZG9uZSggcmVzcG9uc2UsIHRleHRTdGF0dXMsIGpxWEhSICk7XG4gICAgZGZkLnJlc29sdmUoIHJlc3BvbnNlLCB0ZXh0U3RhdHVzLCBqcVhIUiApO1xuXG4gIH0pLmZhaWwoZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApe1xuICAgIGRmZC5yZWplY3QoIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApO1xuICB9KTtcblxuICAvLyBpZGVudGl0eSDRgdC+0YXRgNCw0L3Rj9C10YLRgdGPINC00LvRjyBjb25zdHJ1Y3RVcmwsINC10LPQviDQvdGD0LbQvdC+INC+0YfQuNGB0YLQuNGC0Ywg0LTQu9GPINC/0L7RgdC70LXQtNGD0Y7RidC40YUg0LfQsNC/0YDQvtGB0L7Qsi5cbiAgdXRpbHMuY2xlYXJJZGVudGl0eSggcmVzb3VyY2UgKTtcblxuICByZXR1cm4gZGZkO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGRlbGV0ZVJlcXVlc3Q7IiwiLy8gQVBJIENsaWVudFxuLy8gLS0tLS0tLS0tLS0tLS0tXG5cbi8vIEV4YW1wbGVcbi8qXG4gdmFyIGdpdGh1YiA9IEFwaUNsaWVudCgnaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbScsIHtcbiAgIGhvb2tzOiB7XG4gICAgIGhlYWRlcnM6IHtcbiAgICAgICBBY2NlcHQ6ICdhcHBsaWNhdGlvbi92bmQuZ2l0aHViLnYzK2pzb24nLFxuICAgICAgIEF1dGhvcml6YXRpb246ICd0b2tlbiA4ZmJmYzU0MGYxZWQxNDE3MDgzYzcwYTk5MGI0ZGIzYzlhYTg2ZWZlJ1xuICAgICB9XG4gICB9XG4gfSk7XG5cbiBnaXRodWIuYWRkKCdzZWFyY2gnLCB7XG4gIHNlYXJjaE1ldGhvZDogZnVuY3Rpb24oKXtcbiAgICBjb25zb2xlLmxvZyggJ3NlYXJjaDo6c2VhcmNoTWV0aG9kJyApO1xuICB9XG4gfSk7XG4gZ2l0aHViLnNlYXJjaC5hZGQoJ3VzZXJzJywge1xuICB1c2Vyc01ldGhvZDogZnVuY3Rpb24oKXtcbiAgICB0aGlzLnBhcmVudC5zZWFyY2hNZXRob2QoKTtcbiAgfVxuIH0pO1xuXG4gLy8g0JTQvtCx0LDQstC70Y/QtdC8INGA0LXRgdGD0YDRgdGLXG4gZ2l0aHViLmFkZCgndXNlcicpO1xuIGdpdGh1Yi5hZGQoJ3VzZXJzJyk7XG4gZ2l0aHViLnVzZXJzLmFkZCgncmVwb3MnKTtcblxuIC8vINCf0YDQvtGH0LjRgtCw0YLRjCDRgNC10L/QvtC30LjRgtC+0YDQuNC4ICjQvtGC0L/RgNCw0LLQuNGC0Ywg0LPQtdGCINC30LDQv9GA0L7RgSDQvdCwIGh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vdXNlcnMvcmVwb3MvKVxuIGdpdGh1Yi51c2Vycy5yZXBvcy5yZWFkKCk7XG5cbiAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAvLyDQndC1INGB0L7QstGB0LXQvCBSRVNULCDQstGB0LUg0LfQsNC/0YDQvtGB0Ysg0LjQtNGD0YIg0L3QsCDQvtC00LjQvSDQsNC00YDQtdGBXG4gdmFyIHNpbXBsZUFwaSA9IEFwaUNsaWVudCgnYXBpLmV4YW1wbGUuY29tJywge30pO1xuXG4gc2ltcGxlQXBpKCkucmVhZCh7XG4gIGU6ICcvQmFzZS9EZXBhcnRtZW50J1xuIH0pO1xuXG4gc2ltcGxlQXBpLnBvc3QoeyBkYXRhIH0pO1xuIHNpbXBsZUFwaSgnaWRlbnRpdHknKS5wb3N0KHsgZGF0YSB9LCB7IGFqYXhTZXR0aW5ncyB9KTtcbiBzaW1wbGVBcGkoJ2lkZW50aXR5JykucG9zdCggbnVsbCwgeyBhamF4U2V0dGluZ3MgfSk7XG4gc2ltcGxlQXBpLnBvc3QoeyBkYXRhIH0sIHsgYWpheFNldHRpbmdzIH0pO1xuIHNpbXBsZUFwaS5wb3N0KCBudWxsLCB7IGFqYXhTZXR0aW5ncyB9KTtcblxuIHNpbXBsZUFwaS5yZWFkKCBkb25lICkuZG9uZSggZG9uZSApLmZhaWwoIGZhaWwgKTtcblxuINCg0LDQsdC+0YLQsCDRgSDQtNC+0LrRg9C80LXQvdGC0LDQvNC4IChzdG9yYWdlKSwg0L7QvSDRgdCw0Lwg0L/RgNC10L7QsdGA0LDQt9GD0LXRgtGB0Y8g0YfQtdGA0LXQtyDQvNC10YLQvtC0ICRfX2RlbHRhKClcbiBzaW1wbGVBcGkucG9zdCggRG9jdW1lbnQgKTtcbiBzaW1wbGVBcGkuc2F2ZSggRG9jdW1lbnQgKTtcblxuXG4gLy8g0KTQuNGH0LhcbiBhamF4U2V0dGluZ3Mg0LTQu9GPINC60LDQttC00L7Qs9C+INC30LDQv9GA0L7RgdCwXG4gSWRlbnRpdHkg0LTQu9GPINC60LDQttC00L7Qs9C+INC30LDQv9GA0L7RgdCwXG5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBnZXRSZXF1ZXN0ID0gcmVxdWlyZSgnLi9nZXQnKTtcbnZhciBjcmVhdGVQb3N0TGlrZVJlcXVlc3QgPSByZXF1aXJlKCcuL3Bvc3QnICkuY3JlYXRlUG9zdExpa2VSZXF1ZXN0O1xudmFyIGRlbGV0ZVJlcXVlc3QgPSByZXF1aXJlKCcuL2RlbGV0ZScpO1xudmFyIENhY2hlID0gcmVxdWlyZSgnLi9jYWNoZScpO1xuXG52YXIgcmVzb3VyY2VNaXhpbiA9IHtcbiAgcmVzb3VyY2VOYW1lOiAncmVzb3VyY2UnLFxuICB1cmw6ICcnLCAvLyA9IHJlc291cmNlTmFtZVxuXG4gIC8qKlxuICAgKiDQlNC+0LHQsNCy0LjRgtGMINC90L7QstGL0Lkg0YDQtdGB0YPRgNGBXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSByZXNvdXJjZU5hbWVcbiAgICogQHBhcmFtIHtvYmplY3R9IFtwYXJlbnRSZXNvdXJjZV0gLSDRgNC+0LTQuNGC0LXQu9GM0YHQutC40Lkg0YDQtdGB0YPRgNGBXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbdXNlcnNNaXhpbl0gLSDQv9C+0LvRjNC30L7QstCw0YLQtdC70YzRgdC60LDRjyDQv9GA0LjQvNC10YHRjFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGFkZDogZnVuY3Rpb24oIHJlc291cmNlTmFtZSwgcGFyZW50UmVzb3VyY2UsIHVzZXJzTWl4aW4gKXtcbiAgICBpZiAoICF1c2Vyc01peGluICkge1xuICAgICAgdXNlcnNNaXhpbiA9IHBhcmVudFJlc291cmNlIHx8IHt9O1xuICAgICAgcGFyZW50UmVzb3VyY2UgPSB0aGlzO1xuICAgIH1cblxuICAgIC8vINCR0YDQvtGB0LjRgtGMINC40YHQutC70Y7Rh9C10L3QuNC1LCDQtdGB0LvQuCDRgtCw0LrQvtC5INGA0LXRgdGD0YDRgSDRg9C20LUg0LXRgdGC0YxcbiAgICBpZiAoIHRoaXNbIHJlc291cmNlTmFtZSBdICl7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgcmVzb3VyY2UgbmFtZWQgJyArIHJlc291cmNlTmFtZSArICdhbHJlYWR5IGV4aXN0cy4nKTtcbiAgICB9XG5cbiAgICAvLyDQm9GO0LHQvtC5INC40Lcg0Y3RgtC40YUg0L/QsNGA0LDQvNC10YLRgNC+0LIg0YPQutCw0LfRi9Cy0LDQtdGCINC90LAg0L3QtdC+0LHRhdC+0LTQuNC80L7RgdGC0Ywg0LjRgdC/0L7Qu9GM0LfQvtCy0LDRgtGMINGF0YDQsNC90LjQu9C40YnQtVxuICAgIGlmICggdXNlcnNNaXhpbi5zY2hlbWFOYW1lIHx8IHVzZXJzTWl4aW4uY29sbGVjdGlvbk5hbWUgfHwgdXNlcnNNaXhpbi5zdG9yYWdlICkge1xuICAgICAgLy8g0J7Qv9GA0LXQtNC10LvQuNC8INC90LDQt9Cy0LDQvdC40LUg0YHQvtC30LTQsNCy0LDQtdC80L7QuSDQutC+0LvQu9C10LrRhtC40LhcbiAgICAgIHVzZXJzTWl4aW4uY29sbGVjdGlvbk5hbWUgPSB1c2Vyc01peGluLmNvbGxlY3Rpb25OYW1lIHx8IHJlc291cmNlTmFtZTtcbiAgICB9XG5cbiAgICAvLyDQn9C10YDQtdC0INGB0L7Qt9C00LDQvdC40LXQvCDQutC+0LvQu9C10LrRhtC40Lgg0L3Rg9C20L3QviDRgdC+0LfQtNCw0YLRjCDRgNC10YHRg9GA0YEsINGH0YLQvtCx0Ysg0YMg0LrQvtC70LvQtdC60YbQuNC4INCx0YvQu9CwINGB0YHRi9C70LrQsCDQvdCwINC90LXQs9C+XG4gICAgdGhpc1sgcmVzb3VyY2VOYW1lIF0gPSBuZXcgUmVzb3VyY2UoIHJlc291cmNlTmFtZSwgcGFyZW50UmVzb3VyY2UsIHVzZXJzTWl4aW4gKTtcblxuICAgIC8vINCh0L7Qt9C00LDRgtGMINC60L7Qu9C70LXQutGG0LjRjiwg0LXRgdC70Lgg0Y3RgtC+0LPQviDQtdGJ0LUg0L3QtSDRgdC00LXQu9Cw0LvQuFxuICAgIGlmICggdXNlcnNNaXhpbi5jb2xsZWN0aW9uTmFtZSAmJiAhc3RvcmFnZVsgdXNlcnNNaXhpbi5jb2xsZWN0aW9uTmFtZSBdICl7XG4gICAgICAvLyDQmNGJ0LXQvCDRgdGF0LXQvNGDLCDQtdGB0LvQuCDQvtC90LAg0YPQutCw0LfQsNC90LBcbiAgICAgIHZhciBzY2hlbWEgPSBzdG9yYWdlLnNjaGVtYXNbIHVzZXJzTWl4aW4uc2NoZW1hTmFtZSBdO1xuXG4gICAgICBpZiAoIHNjaGVtYSApe1xuICAgICAgICBzdG9yYWdlLmNyZWF0ZUNvbGxlY3Rpb24oIHVzZXJzTWl4aW4uY29sbGVjdGlvbk5hbWUsIHNjaGVtYSwgdGhpc1sgcmVzb3VyY2VOYW1lIF0gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Jlc291cmNlOjonICsgcmVzb3VyY2VOYW1lICsgJyBZb3UgY2Fubm90IHVzZSBzdG9yYWdlIChjcmVhdGUgY29sbGVjdGlvbiksIHdpdGhvdXQgc3BlY2lmeWluZyB0aGUgc2NoZW1hIG9mIHRoZSBkYXRhLicpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzWyByZXNvdXJjZU5hbWUgXTtcbiAgfSxcblxuICBfcmVzb3VyY2VSZXF1ZXN0OiBmdW5jdGlvbiggbWV0aG9kLCBhamF4U2V0dGluZ3MsIGRvbmUgKXtcbiAgICB2YXIgdXJsID0gdXRpbHMuY29uc3RydWN0VXJsKCB0aGlzICk7XG4gICAgdmFyIHVzZU5vdGlmaWNhdGlvbnMgPSB0aGlzLm5vdGlmaWNhdGlvbnM7XG5cbiAgICByZXR1cm4gdGhpcy5hcGlSb290Ll9yZXF1ZXN0KCBtZXRob2QsIHVybCwgYWpheFNldHRpbmdzLmRhdGEsIGFqYXhTZXR0aW5ncywgdXNlTm90aWZpY2F0aW9ucywgZG9uZSApO1xuICB9XG59O1xuXG4vLyBHRVRcbnJlc291cmNlTWl4aW4uZ2V0ID0gZ2V0UmVxdWVzdDtcbnJlc291cmNlTWl4aW4ucmVhZCA9IGdldFJlcXVlc3Q7XG5cbi8vIFBPU1RcbnJlc291cmNlTWl4aW4ucG9zdCA9IGNyZWF0ZVBvc3RMaWtlUmVxdWVzdCgnUE9TVCcpO1xucmVzb3VyY2VNaXhpbi5jcmVhdGUgPSByZXNvdXJjZU1peGluLnBvc3Q7XG5cbi8vIFBVVFxucmVzb3VyY2VNaXhpbi5wdXQgPSBjcmVhdGVQb3N0TGlrZVJlcXVlc3QoJ1BVVCcpO1xucmVzb3VyY2VNaXhpbi51cGRhdGUgPSByZXNvdXJjZU1peGluLnB1dDtcbnJlc291cmNlTWl4aW4uc2F2ZSA9IHJlc291cmNlTWl4aW4ucHV0O1xuXG4vLyBQQVRDSFxucmVzb3VyY2VNaXhpbi5wYXRjaCA9IGNyZWF0ZVBvc3RMaWtlUmVxdWVzdCgnUEFUQ0gnKTtcblxuLy8gREVMRVRFXG5yZXNvdXJjZU1peGluLmRlbGV0ZSA9IGRlbGV0ZVJlcXVlc3Q7XG5cbi8qKlxuICog0JrQvtC90YHRgtGA0YPQutGC0L7RgCDRgNC10YHRg9GA0YHQsCwg0L3QviDQstC+0LfQstGA0LDRidCw0LXRgiDRhNGD0L3QutGG0LjRjiDRgdC+INGB0LLQvtC50YHRgtCy0LDQvNC4XG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHJlc291cmNlTmFtZVxuICogQHBhcmFtIHtvYmplY3R9IHBhcmVudFJlc291cmNlXG4gKiBAcGFyYW0ge29iamVjdH0gdXNlcnNNaXhpblxuICogQHJldHVybnMge0Z1bmN0aW9ufSByZXNvdXJjZVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFJlc291cmNlKCByZXNvdXJjZU5hbWUsIHBhcmVudFJlc291cmNlLCB1c2Vyc01peGluICl7XG5cbiAgLyoqXG4gICAqINCt0YLRgyDRhNGD0L3QutGG0LjRjiDQvNGLINC+0YLQtNCw0ZHQvCDQv9C+0LvRjNC30L7QstCw0YLQtdC70Y4g0LIg0LrQsNGH0LXRgdGC0LLQtSDQtNC+0YHRgtGD0L/QsCDQuiDRgNC10YHRg9GA0YHRgy5cbiAgICog0J7QvdCwINC/0L7Qt9Cy0L7Qu9GP0LXRgiDQt9Cw0LTQsNGC0YwgaWRlbnRpdHkg0LTQu9GPINC30LDQv9GA0L7RgdCwLlxuICAgKlxuICAgKiBAcGFyYW0gW2lkZW50aXR5XVxuICAgKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gICAqL1xuICB2YXIgcmVzb3VyY2UgPSBmdW5jdGlvbiByZXNvdXJjZSggaWRlbnRpdHkgKXtcbiAgICBpZiAoIGlkZW50aXR5ID09IG51bGwgKXtcbiAgICAgIHJldHVybiByZXNvdXJjZTtcbiAgICB9XG5cbiAgICBpZiAoIGlkZW50aXR5ICYmICF1dGlscy5pc1N0cmluZyggaWRlbnRpdHkgKSApe1xuICAgICAgY29uc29sZS5lcnJvcignaWRlbnRpdHkg0LTQvtC70LbQtdC9INCx0YvRgtGMINGB0YLRgNC+0LrQvtC5LCDQsCDQvdC1JywgaWRlbnRpdHkgKTtcbiAgICB9XG5cbiAgICByZXNvdXJjZS5pZGVudGl0eSA9IGlkZW50aXR5IHx8ICcnO1xuXG4gICAgcmV0dXJuIHJlc291cmNlO1xuICB9O1xuXG4gICQuZXh0ZW5kKCByZXNvdXJjZSwgcmVzb3VyY2VNaXhpbiwge1xuICAgIHJlc291cmNlTmFtZTogcmVzb3VyY2VOYW1lLFxuICAgIHVybDogcmVzb3VyY2VOYW1lXG4gIH0sIHVzZXJzTWl4aW4gKTtcblxuICByZXNvdXJjZS5wYXJlbnRSZXNvdXJjZSA9IHBhcmVudFJlc291cmNlO1xuICByZXNvdXJjZS5hcGlSb290ID0gcGFyZW50UmVzb3VyY2UuYXBpUm9vdCB8fCBwYXJlbnRSZXNvdXJjZTtcblxuICByZXR1cm4gcmVzb3VyY2U7XG59XG5cbi8qKlxuICogQ3JlYXRlIG5ldyBhcGkgY2xpZW50XG4gKlxuICogQGV4YW1wbGVcbiAqIHZhciBhcGkgPSBuZXcgQXBpQ2xpZW50KCcvYXBpJywge1xuICogICBob29rczoge1xuICogICAgIGhlYWRlcnM6IHtcbiAqICAgICAgIHRva2VuOiAnWFhYWFhYJ1xuICogICAgIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogdmFyIGFwaSA9IG5ldyBBcGlDbGllbnQoJ2h0dHBzOi8vZG9tYWluLmNvbS9hcGknLCB7XG4gKiAgIGhvb2tzOiB7XG4gKiAgICAgaGVhZGVyczoge1xuICogICAgICAgdG9rZW46ICdYWFhYWFgnXG4gKiAgICAgfVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiB2YXIgYXBpID0gbmV3IEFwaUNsaWVudCh7XG4gKiAgIHVybDogJy9hcGknXG4gKiAgIGhvb2tzOiB7XG4gKiAgICAgaGVhZGVyczoge1xuICogICAgICAgdG9rZW46ICdYWFhYWFgnXG4gKiAgICAgfVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiBAcGFyYW0gdXJsIGFwaSByb290IHVybFxuICogQHBhcmFtIG9wdGlvbnMgYXBpIGNsaWVudCBvcHRpb25zXG4gKi9cbmZ1bmN0aW9uIEFwaUNsaWVudCggdXJsLCBvcHRpb25zICl7XG4gIGlmICggISh0aGlzIGluc3RhbmNlb2YgQXBpQ2xpZW50KSApIHtcbiAgICByZXR1cm4gbmV3IEFwaUNsaWVudCggdXJsLCBvcHRpb25zICk7XG4gIH1cblxuICB0aGlzLmRlZmF1bHRzID0ge1xuICAgIC8vIFN0cmlwIHNsYXNoZXMgYnkgZGVmYXVsdFxuICAgIHN0cmlwVHJhaWxpbmdTbGFzaGVzOiB0cnVlLFxuICAgIC8vIFVzZSBjYWNoZSBmb3IgR0VUIHJlcXVlc3RzXG4gICAgY2FjaGU6IHRydWVcbiAgfTtcblxuICAvLyBJZiBmaXJzdCBhcmcgaXMgb2JqZWN0XG4gIGlmICggdXRpbHMuaXNPYmplY3QoIHVybCApICl7XG4gICAgb3B0aW9ucyA9IHVybDtcbiAgICB1cmwgPSBsb2NhdGlvbi5vcmlnaW47XG4gIH1cblxuICBpZiAoIHVybCA9PSBudWxsICl7XG4gICAgdXJsID0gbG9jYXRpb24ub3JpZ2luO1xuICB9XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIG9wdGlvbnMudXJsID0gdXJsO1xuXG4gIC8vIERlZmF1bHRzLCBub3RpZmljYXRpb25zIGlzIG9mZlxuICB0aGlzLm5vdGlmaWNhdGlvbnMgPSBmYWxzZTtcblxuICAvKipcbiAgICogaG9va3MgZm9yIGFqYXggc2V0dGluZ3MgKGFzIGJhc2UgYWpheFNldHRpbmdzKVxuICAgKiBAc2VlIGh0dHA6Ly9hcGkuanF1ZXJ5LmNvbS9qUXVlcnkuYWpheC9cbiAgICpcbiAgICogQHR5cGUge09iamVjdH1cbiAgICovXG4gIHRoaXMuaG9va3MgPSB7XG4gICAgLy8g0LTQvtC/0L7Qu9C90LjRgtC10LvRjNC90YvQtSDQtNCw0L3QvdGL0LUg0LfQsNC/0YDQvtGB0LBcbiAgICBkYXRhOiB7fSxcbiAgICAvLyDQntCx0YrQtdC60YIg0LTQu9GPINC00L7QsdCw0LLQu9C10L3QuNGPINC/0YDQvtC40LfQstC+0LvRjNC90YvRhSDQt9Cw0LPQvtC70L7QstC60L7QsiDQutC+INCy0YHQtdC8INC30LDQv9GA0L7RgdCw0LxcbiAgICAvLyDRg9C00L7QsdC90L4g0LTQu9GPINCw0LLRgtC+0YDQuNC30LDRhtC40Lgg0L/QviDRgtC+0LrQtdC90LDQvFxuICAgIGhlYWRlcnM6IHt9XG4gIH07XG5cbiAgLy90b2RvOiB0byB1dGlscyAoZGVlcE1lcmdlKSDQtNC+0LHQsNCy0LjRgtGMINCy0L7Qt9C80L7QttC90L7RgdGC0Ywg0YDQsNGB0YjQuNGA0Y/RgtGMINC+0LHRitC10LrRgiwg0LAg0L3QtSDQstC+0LfQstGA0LDRidCw0YLRjCDQvdC+0LLRi9C5XG4gICQuZXh0ZW5kKCB0cnVlLCB0aGlzLCBvcHRpb25zICk7XG5cbiAgLy8gSW5pdCBjYWNoZVxuICBpZiAoIHRoaXMuZGVmYXVsdHMuY2FjaGUgKXtcbiAgICB0aGlzLmNhY2hlID0gbmV3IENhY2hlKCk7XG4gIH1cbn1cblxuQXBpQ2xpZW50LnByb3RvdHlwZSA9IHtcbiAgLyoqXG4gICAqINCU0L7QsdCw0LLQuNGC0Ywg0L3QvtCy0YvQuSDRgNC10YHRg9GA0YFcbiAgICogQHNlZSByZXNvdXJjZU1peGluLmFkZFxuICAgKi9cbiAgYWRkOiByZXNvdXJjZU1peGluLmFkZCxcblxuICBfbWV0aG9kczoge1xuICAgICdjcmVhdGUnOiAnUE9TVCcsXG4gICAgJ3JlYWQnOiAgICdHRVQnLFxuICAgICd1cGRhdGUnOiAnUFVUJyxcbiAgICAnZGVsZXRlJzogJ0RFTEVURScsXG4gICAgJ3BhdGNoJzogICdQQVRDSCcsXG5cbiAgICAncG9zdCc6ICAgJ1BPU1QnLFxuICAgICdnZXQnOiAgICAnR0VUJyxcbiAgICAnc2F2ZSc6ICAgJ1BVVCdcbiAgfSxcblxuICBfcHJlcGFyZUFqYXhTZXR0aW5nczogZnVuY3Rpb24oIG1ldGhvZCwgdXJsLCBkYXRhLCBhamF4U2V0dGluZ3MgKXtcbiAgICB2YXIgX2FqYXhTZXR0aW5ncyA9IHV0aWxzLmRlZXBNZXJnZSggdGhpcy5ob29rcywgYWpheFNldHRpbmdzICk7XG5cbiAgICBfYWpheFNldHRpbmdzLnR5cGUgPSBtZXRob2Q7XG5cbiAgICAvLyBzdHJpcCB0cmFpbGluZyBzbGFzaGVzIGFuZCBzZXQgdGhlIHVybCAodW5sZXNzIHRoaXMgYmVoYXZpb3IgaXMgc3BlY2lmaWNhbGx5IGRpc2FibGVkKVxuICAgIGlmICggdGhpcy5kZWZhdWx0cy5zdHJpcFRyYWlsaW5nU2xhc2hlcyApe1xuICAgICAgdXJsID0gdXJsLnJlcGxhY2UoL1xcLyskLywgJycpIHx8ICcvJztcbiAgICB9XG5cbiAgICBfYWpheFNldHRpbmdzLnVybCA9IHVybDtcblxuICAgIC8vINCU0L7QsdCw0LLQu9GP0LXQvCDQsNCy0YLQvtGA0LjQt9Cw0YbQuNGOINC/0L4g0YLQvtC60LXQvdGDXG4gICAgaWYgKCB0aGlzLnRva2VuICYmIGFqYXhTZXR0aW5ncy5oZWFkZXJzICYmIGFqYXhTZXR0aW5ncy5oZWFkZXJzLnRva2VuID09IG51bGwgKXtcbiAgICAgIF9hamF4U2V0dGluZ3MuaGVhZGVycy5BdXRob3JpemF0aW9uID0gJ3Rva2VuICcgKyB0aGlzLnRva2VuO1xuICAgIH1cblxuICAgIGlmICggbWV0aG9kID09PSAnR0VUJyApe1xuICAgICAgX2FqYXhTZXR0aW5ncy5kYXRhID0gdXRpbHMuZGVlcE1lcmdlKCBfYWpheFNldHRpbmdzLmRhdGEsIGRhdGEgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8g0JXRgdC70Lgg0YHQvtGF0YDQsNC90Y/QtdC8INC00L7QutGD0LzQtdC90YIsINC90YPQttC90L4g0YHQtNC10LvQsNGC0YwgdG9PYmplY3Qoe2RlcG9wdWxhdGU6IDF9KVxuICAgICAgaWYgKCBkYXRhICYmIGRhdGEuY29uc3RydWN0b3IgJiYgZGF0YS5jb25zdHJ1Y3Rvci5uYW1lICYmIGRhdGEuY29uc3RydWN0b3IubmFtZSA9PT0gJ0RvY3VtZW50JyApe1xuICAgICAgICBfYWpheFNldHRpbmdzLmRhdGEgPSB1dGlscy5kZWVwTWVyZ2UoIF9hamF4U2V0dGluZ3MuZGF0YSwgZGF0YS50b09iamVjdCh7ZGVwb3B1bGF0ZTogMX0pICk7XG5cbiAgICAgIH0gZWxzZSBpZiAoIGRhdGEgKSB7XG4gICAgICAgIF9hamF4U2V0dGluZ3MuZGF0YSA9IHV0aWxzLmRlZXBNZXJnZSggX2FqYXhTZXR0aW5ncy5kYXRhLCBkYXRhICk7XG4gICAgICB9XG5cbiAgICAgIGlmICggX2FqYXhTZXR0aW5ncy5kYXRhICYmIF9hamF4U2V0dGluZ3MuY29udGVudFR5cGUgPT09ICdhcHBsaWNhdGlvbi9qc29uJyApe1xuICAgICAgICBfYWpheFNldHRpbmdzLmRhdGEgPSBKU09OLnN0cmluZ2lmeSggX2FqYXhTZXR0aW5ncy5kYXRhICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gdG9kbyDQv9GA0L7QstC10YDRgtGMINC90LDQtNC+0LHQvdC+0YHRgtGMINC60L7QtNCwXG4gICAgLy8g0JjRgdC/0L7Qu9GM0LfRg9C10YLRgdGPINC00LvRjyDQsNC70LjQsNGB0L7Qsiwg0LIg0LrQvtGC0L7RgNGL0YUg0LLRgtC+0YDQvtC5INC/0LDRgNCw0LzQtdGC0YAgLSDQtdGB0YLRjCDQvtCx0YrQtdC60YIg0L3QsNGB0YLRgNC+0LXQulxuICAgIGlmICggdXRpbHMuaXNPYmplY3QoIHVybCApICl7XG4gICAgICBjb25zb2xlLmluZm8oJ9CQ0YVAKtGC0YwsINC90YPQttC90YvQuSDQutC+0LQhISEhJyk7XG4gICAgICBfYWpheFNldHRpbmdzID0gdXJsO1xuICAgICAgZGVidWdnZXI7XG4gICAgfVxuXG4gICAgcmV0dXJuIF9hamF4U2V0dGluZ3M7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNlbmQgcmVxdWVzdCBvbiBzZXJ2ZXJcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IG1ldGhvZCDQndCw0LfQstCw0L3QuNC1INC80LXRgtC+0LTQsCAoUE9TVCwgR0VULCBQVVQsIERFTEVURSwgUEFUQ0gpXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwg0J/QvtC70L3Ri9C5INGD0YDQuyDRgNC10YHRg9GA0YHQsFxuICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSDQntCx0YrQtdC60YIg0YEg0LTQsNC90L3Ri9C80Lgg0LTQu9GPINC30LDQv9GA0L7RgdCwXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBhamF4U2V0dGluZ3Mg0J7QsdGK0LXQutGCINGBINC90LDRgdGC0YDQvtC50LrQsNC80LhcbiAgICogQHBhcmFtIHtib29sZWFufSB1c2VOb3RpZmljYXRpb25zINCk0LvQsNCzLCDQuNGB0L/QvtC70YzQt9C+0LLQsNGC0Ywg0LvQuCDRg9Cy0LXQtNC+0LzQu9C10L3QuNGPXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGRvbmUg0KTRg9C90LrRhtC40Y8g0YPRgdC/0LXRiNC90L7Qs9C+INC+0LHRgNCw0YLQvdC+0LPQviDQstGL0LfQvtCy0LBcbiAgICogQHJldHVybnMgeyQuRGVmZXJyZWR9INCy0L7Qt9Cy0YDQsNGJ0LDQtdGCIGpxdWVyeSBhamF4INC+0LHRitC10LrRglxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3JlcXVlc3Q6IGZ1bmN0aW9uKCBtZXRob2QsIHVybCwgZGF0YSwgYWpheFNldHRpbmdzLCB1c2VOb3RpZmljYXRpb25zLCBkb25lICl7XG4gICAgaWYgKCAhdXRpbHMuaXNTdHJpbmcoIG1ldGhvZCApICl7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ9Cf0LDRgNCw0LzQtdGC0YAgYG1ldGhvZGAg0LTQvtC70LbQtdC9INCx0YvRgtGMINGB0YLRgNC+0LrQvtC5LCDQsCDQvdC1ICcsIG1ldGhvZCApO1xuICAgIH1cblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbm90aWZpY2F0aW9uVHlwZSA9IG1ldGhvZCA9PT0gJ0dFVCcgPyAnbG9hZCcgOiAoIG1ldGhvZCA9PT0gJ1BPU1QnIHx8IG1ldGhvZCA9PT0gJ1BVVCcgfHwgbWV0aG9kID09PSAnUEFUQ0gnICkgPyAnc2F2ZScgOiAnZGVsZXRlJztcbiAgICB2YXIgX2FqYXhTZXR0aW5ncyA9IHRoaXMuX3ByZXBhcmVBamF4U2V0dGluZ3MoIG1ldGhvZCwgdXJsLCBkYXRhLCBhamF4U2V0dGluZ3MgKTtcblxuICAgIC8vINCY0YHQv9C+0LvRjNC30L7QstCw0YLRjCDQt9C90LDRh9C10L3QuNC1INC/0L4g0YPQvNC+0LvRh9Cw0L3QuNGOLCDQtdGB0LvQuCB1c2VOb3RpZmljYXRpb25zINC90LUg0LfQsNC00LDQvVxuICAgIC8vINGC0YPRgiDQttC1INC/0L7RgNCy0LXRgNGP0LXQvCwg0L/QvtC00LrQu9GO0YfQtdC90Ysg0LvQuCDRg9Cy0LXQtNC+0LzQu9C10L3QuNGPXG4gICAgaWYgKCB1dGlscy5pc0Jvb2xlYW4oIHVzZU5vdGlmaWNhdGlvbnMgKSApe1xuICAgICAgdXNlTm90aWZpY2F0aW9ucyA9IHVzZU5vdGlmaWNhdGlvbnMgJiYgY2Yubm90aWZpY2F0aW9uO1xuICAgIH0gZWxzZSB7XG4gICAgICB1c2VOb3RpZmljYXRpb25zID0gdGhpcy5ub3RpZmljYXRpb25zICYmIGNmLm5vdGlmaWNhdGlvbjtcbiAgICB9XG5cbiAgICBpZiAoIHVzZU5vdGlmaWNhdGlvbnMgKXtcbiAgICAgIGNmLm5vdGlmaWNhdGlvblsgbm90aWZpY2F0aW9uVHlwZSBdLnNob3coKTtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyggbWV0aG9kICsgJyAnICsgX2FqYXhTZXR0aW5ncy51cmwgKTtcblxuICAgIHJldHVybiAkLmFqYXgoIF9hamF4U2V0dGluZ3MgKS5mYWlsKGZ1bmN0aW9uKCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKXtcbiAgICAgIGNvbnNvbGUud2FybigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICk7XG5cbiAgICAgIC8vIFVuYXV0aG9yaXplZCBDYWxsYmFja1xuICAgICAgaWYgKCBqcVhIUi5zdGF0dXMgPT09IDQwMSAmJiBzZWxmLnVuYXV0aG9yaXplZENhbGxiYWNrICl7XG4gICAgICAgIHNlbGYudW5hdXRob3JpemVkQ2FsbGJhY2soIGpxWEhSLCBtZXRob2QsIHVybCwgZGF0YSwgYWpheFNldHRpbmdzLCBkb25lICk7XG5cbiAgICAgICAgLy8g0J3QtSDQv9C+0LrQsNC30YvQstCw0YLRjCDRgdC+0L7QsdGJ0LXQvdC40LUg0YEg0L7RiNC40LHQutC+0Lkg0L/RgNC4IDQwMSwg0LXRgdC70Lgg0LLRgdGRINC/0LvQvtGF0L4sINGC0L4g0YDQvtGD0YLQtdGAINGB0LDQvCDQv9C10YDQtdC60LjQvdC10YIg0L3QsCDRhNC+0YDQvNGDINCy0YXQvtC00LBcbiAgICAgICAgaWYgKCB1c2VOb3RpZmljYXRpb25zICl7XG4gICAgICAgICAgY2Yubm90aWZpY2F0aW9uWyBub3RpZmljYXRpb25UeXBlIF0uaGlkZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoIHVzZU5vdGlmaWNhdGlvbnMgKXtcbiAgICAgICAgY2Yubm90aWZpY2F0aW9uWyBub3RpZmljYXRpb25UeXBlIF0uZmFpbCgpO1xuICAgICAgfVxuXG4gICAgfSkuZG9uZShmdW5jdGlvbigpe1xuICAgICAgaWYgKCB1c2VOb3RpZmljYXRpb25zICl7XG4gICAgICAgIGNmLm5vdGlmaWNhdGlvblsgbm90aWZpY2F0aW9uVHlwZSBdLmhpZGUoKTtcbiAgICAgIH1cbiAgICB9KS5kb25lKCBkb25lICk7XG4gIH1cbn07XG5cbi8qKlxuICogTWV0aG9kIGZvciBnZXQgcmVxdWVzdCB0byBhcGkgcm9vdFxuICpcbiAqIEBwYXJhbSBhamF4U2V0dGluZ3NcbiAqIEBwYXJhbSBkb25lXG4gKiBAcmV0dXJucyB7JC5EZWZlcnJlZH1cbiAqL1xuQXBpQ2xpZW50LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiggYWpheFNldHRpbmdzLCBkb25lICl7XG4gIGNvbnNvbGUubG9nKCAnYXBpOjpnZXQnICk7XG4gIGlmICggdXRpbHMuaXNGdW5jdGlvbiggYWpheFNldHRpbmdzICkgKXtcbiAgICBkb25lID0gYWpheFNldHRpbmdzO1xuICAgIGFqYXhTZXR0aW5ncyA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGFqYXhTZXR0aW5ncyA9IGFqYXhTZXR0aW5ncyB8fCB7fTtcblxuICByZXR1cm4gdGhpcy5fcmVxdWVzdCgnR0VUJywgdGhpcy51cmwsIHVuZGVmaW5lZCwgYWpheFNldHRpbmdzLCBmYWxzZSwgZG9uZSApO1xufTtcbi8qKlxuICogQGFsaWFzIEFwaUNsaWVudC5wcm90b3R5cGUuZ2V0XG4gKiBAdHlwZSB7RnVuY3Rpb259XG4gKi9cbkFwaUNsaWVudC5wcm90b3R5cGUucmVhZCA9IEFwaUNsaWVudC5wcm90b3R5cGUuZ2V0O1xuXG5BcGlDbGllbnQudmVyc2lvbiA9ICcwLjMuMCc7XG5cbkFwaUNsaWVudC51dGlscyA9IHV0aWxzO1xuXG4vLyBleHBvcnRzXG5tb2R1bGUuZXhwb3J0cyA9IEFwaUNsaWVudDsiLCIvKipcbiAqIFVzZXI6IENvbnN0YW50aW5lIE1lbG5pa292XG4gKiBFbWFpbDoga2EubWVsbmlrb3ZAZ21haWwuY29tXG4gKiBEYXRlOiAyOS4wMS4xNVxuICogVGltZTogMTU6MTJcbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbi8qKlxuICogR0VUIHJlcXVlc3RcbiAqXG4gKiDQkiBhamF4U2V0dGluZ3Mg0LzQvtC20L3QviDRg9C60LDQt9Cw0YLRjCDQv9C+0LvQtSBkb05vdFN0b3JlIC0g0YfRgtC+0LHRiyDQvdC1INGB0L7RhdGA0LDQvdGP0YLRjCDQv9C+0LvRg9GH0LXQvdC90YvQuSDQvtCx0YrQtdC60YIg0LIgc3RvcmFnZVxuICpcbiAqIEBwYXJhbSBbZGF0YV1cbiAqIEBwYXJhbSBbYWpheFNldHRpbmdzXVxuICogQHBhcmFtIFtkb25lXVxuICogQHJldHVybnMgeyp9XG4gKi9cbmZ1bmN0aW9uIGdldFJlcXVlc3QoIGRhdGEsIGFqYXhTZXR0aW5ncywgZG9uZSApe1xuICB2YXIgcmVzb3VyY2UgPSB0aGlzO1xuICB2YXIgbWV0aG9kID0gJ0dFVCc7XG4gIHZhciBrZXk7XG5cbiAgLy8g0JXRgdC70LggZGF0YSAtINC10YHRgtGMINGE0YPQvdC60YbQuNGPLCDRgtC+INGN0YLQviBkb25lXG4gIGlmICggdXRpbHMuaXNGdW5jdGlvbiggZGF0YSApICl7XG4gICAgZG9uZSA9IGRhdGE7XG4gICAgZGF0YSA9IHVuZGVmaW5lZDtcbiAgfVxuICBpZiAoIHV0aWxzLmlzRnVuY3Rpb24oIGFqYXhTZXR0aW5ncyApICl7XG4gICAgZG9uZSA9IGFqYXhTZXR0aW5ncztcbiAgICBhamF4U2V0dGluZ3MgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBhamF4U2V0dGluZ3MgPSBhamF4U2V0dGluZ3MgfHwge307XG4gIGFqYXhTZXR0aW5ncy5kYXRhID0gZGF0YTtcblxuICBpZiAoIHJlc291cmNlLmFwaVJvb3QuZGVmYXVsdHMuY2FjaGUgKXtcbiAgICBhamF4U2V0dGluZ3MudXJsID0gdXRpbHMuY29uc3RydWN0VXJsKCByZXNvdXJjZSApO1xuXG4gICAga2V5ID0gcmVzb3VyY2UuYXBpUm9vdC5jYWNoZS5nZXRLZXkoIGFqYXhTZXR0aW5ncyApO1xuICAgIHZhciByZXEgPSByZXNvdXJjZS5hcGlSb290LmNhY2hlLmdldCgga2V5ICk7XG5cbiAgICBpZiAoIHJlcSApe1xuICAgICAgZG9uZSAmJiBkb25lKCByZXEucmVzcG9uc2UsIHJlcS50ZXh0U3RhdHVzLCByZXEuanFYSFIgKTtcbiAgICAgIHV0aWxzLmNsZWFySWRlbnRpdHkoIHJlc291cmNlICk7XG4gICAgICByZXR1cm4gJC5EZWZlcnJlZCgpLnJlc29sdmUoIHJlcS5yZXNwb25zZSwgcmVxLnRleHRTdGF0dXMsIHJlcS5qcVhIUiApO1xuICAgIH1cbiAgfVxuXG4gIHZhciBkZmQgPSAkLkRlZmVycmVkKCk7XG4gIHRoaXMuX3Jlc291cmNlUmVxdWVzdCggbWV0aG9kLCBhamF4U2V0dGluZ3MgKS5kb25lKGZ1bmN0aW9uKCByZXNwb25zZSwgdGV4dFN0YXR1cywganFYSFIgKXtcbiAgICB2YXIgZmllbGRzO1xuXG4gICAgLy8gI2V4YW1wbGVcbiAgICAvLyBhcGkucGxhY2VzKHsgZmllbGRzOiAnbmFtZScsIHNraXA6IDEwMCB9KTtcbiAgICAvLyDQldGB0LvQuCDQsdGL0LvQsCDQstGL0LHQvtGA0LrQsCDQv9C+INC/0L7Qu9GP0LwsINC90YPQttC90L4g0L/RgNCw0LLQuNC70YzQvdC+INC+0LHRgNCw0LHQvtGC0LDRgtGMINC10ZEg0Lgg0L/QtdGA0LXQtNCw0YLRjCDQsiDQtNC+0LrRg9C80LXQvdGCXG4gICAgaWYgKCBkYXRhICYmIGRhdGEuZmllbGRzICl7XG4gICAgICBmaWVsZHMgPSB1dGlscy5zZWxlY3QoIGRhdGEuZmllbGRzICk7XG4gICAgfVxuXG4gICAgLy8g0JXRgdGC0Ywg0L7RgtCy0LXRgiDQvdCw0LTQviDRgdC+0YXRgNCw0L3QuNGC0Ywg0LIg0YXRgNCw0L3QuNC70LjRidC1XG4gICAgaWYgKCByZXNvdXJjZS5zdG9yYWdlICYmICFhamF4U2V0dGluZ3MuZG9Ob3RTdG9yZSApe1xuICAgICAgcmVzcG9uc2UgPSBzdG9yYWdlWyByZXNvdXJjZS5jb2xsZWN0aW9uTmFtZSBdLmFkZCggcmVzcG9uc2UsIGZpZWxkcywgdHJ1ZSApO1xuICAgIH1cblxuICAgIGlmICggcmVzb3VyY2UuYXBpUm9vdC5kZWZhdWx0cy5jYWNoZSApe1xuICAgICAgcmVzb3VyY2UuYXBpUm9vdC5jYWNoZS5wdXQoIGtleSwge1xuICAgICAgICByZXNwb25zZTogcmVzcG9uc2UsXG4gICAgICAgIHRleHRTdGF0dXM6IHRleHRTdGF0dXMsXG4gICAgICAgIGpxWEhSOiBqcVhIUlxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZG9uZSAmJiBkb25lKCByZXNwb25zZSwgdGV4dFN0YXR1cywganFYSFIgKTtcbiAgICBkZmQucmVzb2x2ZSggcmVzcG9uc2UsIHRleHRTdGF0dXMsIGpxWEhSICk7XG5cbiAgfSkuZmFpbChmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICl7XG4gICAgZGZkLnJlamVjdCgganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICk7XG4gIH0pO1xuXG4gIC8vVE9ETzog0JjRgdC/0L7Qu9GM0LfQvtCy0LDRgtGMINC40LTQtdC+0LvQvtCz0Y4gcXVlcnk/IHF1ZXJ5INC+0LHRitC10LrRgiDQtNC70Y8g0L/QvtGB0YLRgNC+0LXQvdC40Y8g0LfQsNC/0YDQvtGB0L7QslxuXG4gIC8vIGlkZW50aXR5INGB0L7RhdGA0LDQvdGP0LXRgtGB0Y8g0LTQu9GPIGNvbnN0cnVjdFVybCwg0LXQs9C+INC90YPQttC90L4g0L7Rh9C40YHRgtC40YLRjCDQtNC70Y8g0L/QvtGB0LvQtdC00YPRjtGJ0LjRhSDQt9Cw0L/RgNC+0YHQvtCyLlxuICB1dGlscy5jbGVhcklkZW50aXR5KCByZXNvdXJjZSApO1xuXG4gIHJldHVybiBkZmQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0UmVxdWVzdDsiLCIvKipcbiAqIFVzZXI6IENvbnN0YW50aW5lIE1lbG5pa292XG4gKiBFbWFpbDoga2EubWVsbmlrb3ZAZ21haWwuY29tXG4gKiBEYXRlOiAyOS4wMS4xNVxuICogVGltZTogMTU6MThcbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbmZ1bmN0aW9uIHBvc3RMaWtlUmVxdWVzdCggbWV0aG9kLCBkYXRhLCBhamF4U2V0dGluZ3MsIGRvbmUgKXtcbiAgdmFyIHJlc291cmNlID0gdGhpcztcbiAgdmFyIGlkZW50aXR5ID0gdGhpcy5pZGVudGl0eTtcbiAgdmFyIGRvY3VtZW50SWRTdHJpbmc7XG5cbiAgLy8g0JXRgdC70LggZGF0YSAtINC10YHRgtGMINGE0YPQvdC60YbQuNGPLCDRgtC+INGN0YLQviBkb25lXG4gIGlmICggdXRpbHMuaXNGdW5jdGlvbiggZGF0YSApICl7XG4gICAgZG9uZSA9IGRhdGE7XG4gICAgZGF0YSA9IHVuZGVmaW5lZDtcbiAgfVxuICBpZiAoIHV0aWxzLmlzRnVuY3Rpb24oIGFqYXhTZXR0aW5ncyApICl7XG4gICAgZG9uZSA9IGFqYXhTZXR0aW5ncztcbiAgICBhamF4U2V0dGluZ3MgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBhamF4U2V0dGluZ3MgPSBhamF4U2V0dGluZ3MgfHwge307XG5cbiAgLy8g0J/RgNC4INGB0L7RhdGA0LDQvdC10L3QuNC4INC00L7QutGD0LzQtdC90YLQsCDQvdGD0LbQvdC+INGB0L7RhdGA0LDQvdGP0YLRjCDRgtC+0LvRjNC60L4g0LjQt9C80LXQvdGR0L3QvdGL0LUg0L/QvtC70Y9cbiAgLy8g0JjQvdC+0LPQtNCwINC/0LXRgNC10LTQsNGO0YIg0LTQvtC60YPQvNC10L3RglxuICBpZiAoIHJlc291cmNlLnN0b3JhZ2UgJiYgZGF0YSBpbnN0YW5jZW9mIHN0b3JhZ2UuRG9jdW1lbnQgKSB7XG4gICAgZG9jdW1lbnRJZFN0cmluZyA9IGRhdGEuX2lkLnRvU3RyaW5nKCk7XG4gICAgZGF0YSA9IGRhdGEuJF9fZGVsdGEoKTtcblxuICAvLyDQotCw0Log0LzQvtC20L3QviDQv9C+0L3Rj9GC0YwsINGH0YLQviDQvNGLINGB0L7RhdGA0LDQvdGP0LXQvCDRgdGD0YnQtdGC0LLRg9GO0YnQuNC5INC90LAg0YHQtdGA0LLQtdGA0LUgRG9jdW1lbnRcbiAgfSBlbHNlIGlmICggcmVzb3VyY2Uuc3RvcmFnZSAmJiBzdG9yYWdlLk9iamVjdElkLmlzVmFsaWQoIGlkZW50aXR5ICkgKSB7XG4gICAgZG9jdW1lbnRJZFN0cmluZyA9IGlkZW50aXR5O1xuXG4gIC8vINCf0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuCDRh9C10YDQtdC3INC80LXRgtC+0LQgc2F2ZSgpINGDINC00L7QutGD0LzQtdC90YLQsFxuICB9IGVsc2UgaWYgKCByZXNvdXJjZS5zdG9yYWdlICYmIGRhdGEuX2lkICYmIHN0b3JhZ2UuT2JqZWN0SWQuaXNWYWxpZCggZGF0YS5faWQgKSApIHtcbiAgICBkb2N1bWVudElkU3RyaW5nID0gZGF0YS5faWQudG9TdHJpbmcoKTtcbiAgfVxuXG4gIGFqYXhTZXR0aW5ncy5kYXRhID0gZGF0YTtcblxuICB2YXIgZGZkID0gJC5EZWZlcnJlZCgpO1xuICB0aGlzLl9yZXNvdXJjZVJlcXVlc3QoIG1ldGhvZCwgYWpheFNldHRpbmdzICkuZG9uZShmdW5jdGlvbiggcmVzcG9uc2UsIHRleHRTdGF0dXMsIGpxWEhSICl7XG4gICAgdmFyIGRvYztcblxuICAgIC8vINCV0YHRgtGMINC+0YLQstC10YIg0L3QsNC00L4g0YHQvtGF0YDQsNC90LjRgtGMINCyINGF0YDQsNC90LjQu9C40YnQtVxuICAgIGlmICggcmVzb3VyY2Uuc3RvcmFnZSAmJiAhYWpheFNldHRpbmdzLmRvTm90U3RvcmUgKXtcbiAgICAgIC8vINCf0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuCDQvdGD0LbQvdC+INC+0LHQvdC+0LLQu9GP0YLRjCDQtNC+0LrRg9C80LXQvdGCXG4gICAgICAvLyDQn9C+0L/RgNC+0LHRg9C10Lwg0YHQvdCw0YfQsNC70LAg0L3QsNC50YLQuCDQtNC+0LrRg9C80LXQvdGCINC/0L4gaWQg0Lgg0L7QsdC90L7QstC40YLRjCDQtdCz0L5cbiAgICAgIGRvYyA9IHN0b3JhZ2VbIHJlc291cmNlLmNvbGxlY3Rpb25OYW1lIF0uZmluZEJ5SWQoIGRvY3VtZW50SWRTdHJpbmcgKTtcblxuICAgICAgaWYgKCBkb2MgKXtcbiAgICAgICAgLy8g0J7QsdC90L7QstC70Y/QtdC8INC00L7QutGD0LzQtdC90YJcbiAgICAgICAgZG9jLnNldCggcmVzcG9uc2UgKTtcblxuICAgICAgICAvLyDQodC+0LfQtNCw0ZHQvCDRgdGB0YvQu9C60YMg0L/QviDQvdC+0LLQvtC80YMgaWQg0LIg0LrQvtC70LvQtdC60YbQuNC4XG4gICAgICAgIHN0b3JhZ2VbIHJlc291cmNlLmNvbGxlY3Rpb25OYW1lIF0udXBkYXRlSWRMaW5rKCBkb2MgKTtcblxuICAgICAgICAvLyDQrdGC0L7RgiDQtNC+0LrRg9C80LXQvdGCINGC0LXQv9C10YDRjCDRgdC+0YXRgNCw0L3RkdC9INC90LAg0YHQtdGA0LLQtdGA0LUsINC30L3QsNGH0LjRgiDQvtC9INGD0LbQtSDQvdC1INC90L7QstGL0LkuXG4gICAgICAgIGRvYy5pc05ldyA9IGZhbHNlO1xuXG4gICAgICAgIHJlc3BvbnNlID0gZG9jO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNwb25zZSA9IHN0b3JhZ2VbIHJlc291cmNlLmNvbGxlY3Rpb25OYW1lIF0uYWRkKCByZXNwb25zZSwgdW5kZWZpbmVkLCB0cnVlICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZG9uZSAmJiBkb25lKCByZXNwb25zZSwgdGV4dFN0YXR1cywganFYSFIgKTtcbiAgICBkZmQucmVzb2x2ZSggcmVzcG9uc2UsIHRleHRTdGF0dXMsIGpxWEhSICk7XG5cbiAgfSkuZmFpbChmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICl7XG4gICAgZGZkLnJlamVjdCgganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICk7XG4gIH0pO1xuXG4gIC8vIGlkZW50aXR5INGB0L7RhdGA0LDQvdGP0LXRgtGB0Y8g0LTQu9GPIGNvbnN0cnVjdFVybCwg0LXQs9C+INC90YPQttC90L4g0L7Rh9C40YHRgtC40YLRjCDQtNC70Y8g0L/QvtGB0LvQtdC00YPRjtGJ0LjRhSDQt9Cw0L/RgNC+0YHQvtCyLlxuICB1dGlscy5jbGVhcklkZW50aXR5KCByZXNvdXJjZSApO1xuXG4gIHJldHVybiBkZmQ7XG59XG5cbi8vIFBhcnRpYWwgQXBwbGljYXRpb25cbmZ1bmN0aW9uIGNyZWF0ZVBvc3RMaWtlUmVxdWVzdCggbWV0aG9kICl7XG4gIHJldHVybiBmdW5jdGlvbigpe1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoIGFyZ3VtZW50cyApO1xuXG4gICAgcmV0dXJuIHBvc3RMaWtlUmVxdWVzdC5hcHBseSggdGhpcywgWyBtZXRob2QgXS5jb25jYXQoIGFyZ3MgKSApO1xuICB9O1xufVxuXG5leHBvcnRzLnBvc3RMaWtlUmVxdWVzdCA9IHBvc3RMaWtlUmVxdWVzdDtcbmV4cG9ydHMuY3JlYXRlUG9zdExpa2VSZXF1ZXN0ID0gY3JlYXRlUG9zdExpa2VSZXF1ZXN0OyIsIi8qKlxuICogVXNlcjogQ29uc3RhbnRpbmUgTWVsbmlrb3ZcbiAqIEVtYWlsOiBrYS5tZWxuaWtvdkBnbWFpbC5jb21cbiAqIERhdGU6IDI3LjAxLjE1XG4gKiBUaW1lOiAxNjoxNlxuICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHt9O1xuXG4vKiogYE9iamVjdCN0b1N0cmluZ2AgcmVzdWx0IHJlZmVyZW5jZXMuICovXG52YXIgYXJnc1RhZyA9ICdbb2JqZWN0IEFyZ3VtZW50c10nLFxuICAgIGFycmF5VGFnID0gJ1tvYmplY3QgQXJyYXldJyxcbiAgICBib29sVGFnID0gJ1tvYmplY3QgQm9vbGVhbl0nLFxuICAgIGRhdGVUYWcgPSAnW29iamVjdCBEYXRlXScsXG4gICAgZXJyb3JUYWcgPSAnW29iamVjdCBFcnJvcl0nLFxuICAgIGZ1bmNUYWcgPSAnW29iamVjdCBGdW5jdGlvbl0nLFxuICAgIG51bWJlclRhZyA9ICdbb2JqZWN0IE51bWJlcl0nLFxuICAgIG9iamVjdFRhZyA9ICdbb2JqZWN0IE9iamVjdF0nLFxuICAgIHJlZ2V4cFRhZyA9ICdbb2JqZWN0IFJlZ0V4cF0nLFxuICAgIHN0cmluZ1RhZyA9ICdbb2JqZWN0IFN0cmluZ10nO1xuXG4vKiogVXNlZCBmb3IgbmF0aXZlIG1ldGhvZCByZWZlcmVuY2VzLiAqL1xudmFyIGFycmF5UHJvdG8gPSBBcnJheS5wcm90b3R5cGU7XG52YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKipcbiAqIFVzZWQgdG8gcmVzb2x2ZSB0aGUgYHRvU3RyaW5nVGFnYCBvZiB2YWx1ZXMuXG4gKiBTZWUgdGhlIFtFUyBzcGVjXShodHRwczovL3Blb3BsZS5tb3ppbGxhLm9yZy9+am9yZW5kb3JmZi9lczYtZHJhZnQuaHRtbCNzZWMtb2JqZWN0LnByb3RvdHlwZS50b3N0cmluZylcbiAqIGZvciBtb3JlIGRldGFpbHMuXG4gKi9cbnZhciBvYmpUb1N0cmluZyA9IG9iamVjdFByb3RvLnRvU3RyaW5nO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0TGlrZSh2YWx1ZSkge1xuICByZXR1cm4gKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHx8IGZhbHNlO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGNsYXNzaWZpZWQgYXMgYSBgU3RyaW5nYCBwcmltaXRpdmUgb3Igb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgY29ycmVjdGx5IGNsYXNzaWZpZWQsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogdXRpbHMuaXNTdHJpbmcoJ2FiYycpO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIHV0aWxzLmlzU3RyaW5nKDEpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xudXRpbHMuaXNTdHJpbmcgPSBmdW5jdGlvbiBpc1N0cmluZyggdmFsdWUgKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnIHx8IChpc09iamVjdExpa2UodmFsdWUpICYmIG9ialRvU3RyaW5nLmNhbGwodmFsdWUpID09PSBzdHJpbmdUYWcpIHx8IGZhbHNlO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBjbGFzc2lmaWVkIGFzIGEgYm9vbGVhbiBwcmltaXRpdmUgb3Igb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgY29ycmVjdGx5IGNsYXNzaWZpZWQsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogdXRpbHMuaXNCb29sZWFuKGZhbHNlKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiB1dGlscy5pc0Jvb2xlYW4obnVsbCk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG51dGlscy5pc0Jvb2xlYW4gPSBmdW5jdGlvbiBpc0Jvb2xlYW4odmFsdWUpIHtcbiAgcmV0dXJuICh2YWx1ZSA9PT0gdHJ1ZSB8fCB2YWx1ZSA9PT0gZmFsc2UgfHwgaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBvYmpUb1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gYm9vbFRhZykgfHwgZmFsc2U7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIHRoZSBsYW5ndWFnZSB0eXBlIG9mIGBPYmplY3RgLlxuICogKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXG4gKlxuICogKipOb3RlOioqIFNlZSB0aGUgW0VTNSBzcGVjXShodHRwczovL2VzNS5naXRodWIuaW8vI3g4KSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gb2JqZWN0LCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIHV0aWxzLmlzT2JqZWN0KHt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiB1dGlscy5pc09iamVjdChbMSwgMiwgM10pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIHV0aWxzLmlzT2JqZWN0KDEpO1xuICogLy8gPT4gZmFsc2VcbiAqXG4gKiB1dGlscy5pc09iamVjdChmdW5jdGlvbigpe30pO1xuICogLy8gPT4gZmFsc2VcbiAqL1xudXRpbHMuaXNPYmplY3QgPSBmdW5jdGlvbiBpc09iamVjdCggdmFsdWUgKSB7XG4gIC8vIEF2b2lkIGEgVjggSklUIGJ1ZyBpbiBDaHJvbWUgMTktMjAuXG4gIC8vIFNlZSBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MjI5MSBmb3IgbW9yZSBkZXRhaWxzLlxuICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcbiAgcmV0dXJuICh2YWx1ZSAmJiB2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlID09PSAnb2JqZWN0JykgfHwgZmFsc2U7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGNsYXNzaWZpZWQgYXMgYSBgRnVuY3Rpb25gIG9iamVjdC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGNvcnJlY3RseSBjbGFzc2lmaWVkLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIHV0aWxzLmlzRnVuY3Rpb24oZnVuY3Rpb24oKXt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiB1dGlscy5pc0Z1bmN0aW9uKC9hYmMvKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbnV0aWxzLmlzRnVuY3Rpb24gPSBmdW5jdGlvbiBpc0Z1bmN0aW9uKHZhbHVlKSB7XG4gIC8vIEF2b2lkIGEgQ2hha3JhIEpJVCBidWcgaW4gY29tcGF0aWJpbGl0eSBtb2RlcyBvZiBJRSAxMS5cbiAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9qYXNoa2VuYXMvdW5kZXJzY29yZS9pc3N1ZXMvMTYyMSBmb3IgbW9yZSBkZXRhaWxzLlxuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nIHx8IGZhbHNlO1xufTtcblxuLy8gaHR0cHM6Ly9naXRodWIuY29tL25yZjExMC9kZWVwbWVyZ2Vcbi8qKlxuICogTWVyZ2UgdHdvIG9iamVjdHMgYHhgIGFuZCBgeWAgZGVlcGx5LCByZXR1cm5pbmcgYSBuZXcgbWVyZ2VkIG9iamVjdCB3aXRoIHRoZSBlbGVtZW50cyBmcm9tIGJvdGggYHhgIGFuZCBgeWAuXG4gKlxuICogSWYgYW4gZWxlbWVudCBhdCB0aGUgc2FtZSBrZXkgaXMgcHJlc2VudCBmb3IgYm90aCBgeGAgYW5kIGB5YCwgdGhlIHZhbHVlIGZyb20gYHlgIHdpbGwgYXBwZWFyIGluIHRoZSByZXN1bHQuXG4gKlxuICogVGhlIG1lcmdlIGlzIGltbXV0YWJsZSwgc28gbmVpdGhlciBgeGAgbm9yIGB5YCB3aWxsIGJlIG1vZGlmaWVkLlxuICpcbiAqIFRoZSBtZXJnZSB3aWxsIGFsc28gbWVyZ2UgYXJyYXlzIGFuZCBhcnJheSB2YWx1ZXMuXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogQHBhcmFtIHNyY1xuICogQHJldHVybnMge2Jvb2xlYW58QXJyYXl8e319XG4gKi9cbnV0aWxzLmRlZXBNZXJnZSA9IGZ1bmN0aW9uIGRlZXBNZXJnZSggdGFyZ2V0LCBzcmMgKXtcbiAgdmFyIGFycmF5ID0gQXJyYXkuaXNBcnJheShzcmMpO1xuICB2YXIgZHN0ID0gYXJyYXkgJiYgW10gfHwge307XG5cbiAgaWYgKGFycmF5KSB7XG4gICAgdGFyZ2V0ID0gdGFyZ2V0IHx8IFtdO1xuICAgIGRzdCA9IGRzdC5jb25jYXQodGFyZ2V0KTtcbiAgICBzcmMuZm9yRWFjaChmdW5jdGlvbihlLCBpKSB7XG4gICAgICBpZiAodHlwZW9mIGRzdFtpXSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgZHN0W2ldID0gZTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGRzdFtpXSA9IGRlZXBNZXJnZSh0YXJnZXRbaV0sIGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRhcmdldC5pbmRleE9mKGUpID09PSAtMSkge1xuICAgICAgICAgIGRzdC5wdXNoKGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKHRhcmdldCAmJiB0eXBlb2YgdGFyZ2V0ID09PSAnb2JqZWN0Jykge1xuICAgICAgT2JqZWN0LmtleXModGFyZ2V0KS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgZHN0W2tleV0gPSB0YXJnZXRba2V5XTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICggc3JjID09IG51bGwgKXtcbiAgICAgIHJldHVybiBkc3Q7XG4gICAgfVxuXG4gICAgT2JqZWN0LmtleXMoc3JjKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgIGlmICh0eXBlb2Ygc3JjW2tleV0gIT09ICdvYmplY3QnIHx8ICFzcmNba2V5XSkge1xuICAgICAgICBkc3Rba2V5XSA9IHNyY1trZXldO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGlmICghdGFyZ2V0W2tleV0pIHtcbiAgICAgICAgICBkc3Rba2V5XSA9IHNyY1trZXldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRzdFtrZXldID0gZGVlcE1lcmdlKHRhcmdldFtrZXldLCBzcmNba2V5XSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBkc3Q7XG59O1xuXG4vKipcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9haGVja21hbm4vbXF1ZXJ5L2Jsb2IvbWFzdGVyL2xpYi9tcXVlcnkuanNcbiAqIG1xdWVyeS5zZWxlY3RcbiAqXG4gKiBTcGVjaWZpZXMgd2hpY2ggZG9jdW1lbnQgZmllbGRzIHRvIGluY2x1ZGUgb3IgZXhjbHVkZVxuICpcbiAqICMjIyNTdHJpbmcgc3ludGF4XG4gKlxuICogV2hlbiBwYXNzaW5nIGEgc3RyaW5nLCBwcmVmaXhpbmcgYSBwYXRoIHdpdGggYC1gIHdpbGwgZmxhZyB0aGF0IHBhdGggYXMgZXhjbHVkZWQuXG4gKiBXaGVuIGEgcGF0aCBkb2VzIG5vdCBoYXZlIHRoZSBgLWAgcHJlZml4LCBpdCBpcyBpbmNsdWRlZC5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICAvLyBpbmNsdWRlIGEgYW5kIGIsIGV4Y2x1ZGUgY1xuICogICAgIHV0aWxzLnNlbGVjdCgnYSBiIC1jJyk7XG4gKlxuICogICAgIC8vIG9yIHlvdSBtYXkgdXNlIG9iamVjdCBub3RhdGlvbiwgdXNlZnVsIHdoZW5cbiAqICAgICAvLyB5b3UgaGF2ZSBrZXlzIGFscmVhZHkgcHJlZml4ZWQgd2l0aCBhIFwiLVwiXG4gKiAgICAgdXRpbHMuc2VsZWN0KHthOiAxLCBiOiAxLCBjOiAwfSk7XG4gKlxuICogQHBhcmFtIHtPYmplY3R8U3RyaW5nfSBzZWxlY3Rpb25cbiAqIEByZXR1cm4ge09iamVjdHx1bmRlZmluZWR9XG4gKiBAYXBpIHB1YmxpY1xuICovXG51dGlscy5zZWxlY3QgPSBmdW5jdGlvbiBzZWxlY3QoIHNlbGVjdGlvbiApe1xuICBpZiAoIXNlbGVjdGlvbikgcmV0dXJuO1xuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHNlbGVjdDogc2VsZWN0IG9ubHkgdGFrZXMgMSBhcmd1bWVudCcpO1xuICB9XG5cbiAgdmFyIGZpZWxkcyA9IHt9O1xuICB2YXIgdHlwZSA9IHR5cGVvZiBzZWxlY3Rpb247XG5cbiAgaWYgKCdzdHJpbmcnID09PSB0eXBlIHx8ICdvYmplY3QnID09PSB0eXBlICYmICdudW1iZXInID09PSB0eXBlb2Ygc2VsZWN0aW9uLmxlbmd0aCAmJiAhQXJyYXkuaXNBcnJheSggc2VsZWN0aW9uICkpIHtcbiAgICBpZiAoJ3N0cmluZycgPT09IHR5cGUpe1xuICAgICAgc2VsZWN0aW9uID0gc2VsZWN0aW9uLnNwbGl0KC9cXHMrLyk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHNlbGVjdGlvbi5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgdmFyIGZpZWxkID0gc2VsZWN0aW9uWyBpIF07XG4gICAgICBpZiAoICFmaWVsZCApIGNvbnRpbnVlO1xuICAgICAgdmFyIGluY2x1ZGUgPSAnLScgPT09IGZpZWxkWyAwIF0gPyAwIDogMTtcbiAgICAgIGlmIChpbmNsdWRlID09PSAwKSBmaWVsZCA9IGZpZWxkLnN1YnN0cmluZyggMSApO1xuICAgICAgZmllbGRzWyBmaWVsZCBdID0gaW5jbHVkZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmllbGRzO1xuICB9XG5cbiAgaWYgKCB1dGlscy5pc09iamVjdCggc2VsZWN0aW9uICkgJiYgIUFycmF5LmlzQXJyYXkoIHNlbGVjdGlvbiApKSB7XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyggc2VsZWN0aW9uICk7XG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBrZXlzLmxlbmd0aDsgKytqKSB7XG4gICAgICBmaWVsZHNbIGtleXNbIGogXSBdID0gc2VsZWN0aW9uWyBrZXlzWyBqIF0gXTtcbiAgICB9XG4gICAgcmV0dXJuIGZpZWxkcztcbiAgfVxuXG4gIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgc2VsZWN0KCkgYXJndW1lbnQuIE11c3QgYmUgc3RyaW5nIG9yIG9iamVjdC4nKTtcbn07XG5cbi8vINCe0YfQuNGB0YLQuNGC0YwgaWRlbnRpdHkg0YMg0YDQtdGB0YPRgNGB0LAg0Lgg0LXQs9C+INGA0L7QtNC40YLQtdC70YzRgdC60LjRhSDRgNC10YHRg9GA0YHQvtCyINGC0L7QttC1XG51dGlscy5jbGVhcklkZW50aXR5ID0gZnVuY3Rpb24gY2xlYXJJZGVudGl0eSggcmVzb3VyY2UgKXtcbiAgd2hpbGUgKCByZXNvdXJjZS5wYXJlbnRSZXNvdXJjZSApIHtcbiAgICByZXNvdXJjZS5pZGVudGl0eSA9ICcnO1xuICAgIHJlc291cmNlID0gcmVzb3VyY2UucGFyZW50UmVzb3VyY2U7XG4gIH1cbn07XG5cbi8vINCh0L7QsdGA0LDRgtGMIHVybCAo0LHQtdC3IHF1ZXJ5IHN0cmluZylcbnV0aWxzLmNvbnN0cnVjdFVybCA9IGZ1bmN0aW9uIGNvbnN0cnVjdFVybCggcmVzb3VyY2UgKXtcbiAgdmFyIGlkZW50aXR5ID0gcmVzb3VyY2UuaWRlbnRpdHkgPyAnLycgKyByZXNvdXJjZS5pZGVudGl0eSA6ICcvJztcblxuICAvLyDQn9GA0L7QsdC10LbQsNGC0YzRgdGPINC/0L4g0LLRgdC10Lwg0YDQtdGB0YPRgNGB0LDQvCwg0LIg0YLQvtC8INGH0LjRgdC70LUg0LIg0LrQvtGA0LXQvdGMINCw0L/QuCwg0YfRgtC+0LHRiyDRgdC+0LHRgNCw0YLRjCB1cmxcbiAgcmV0dXJuIHJlc291cmNlLnBhcmVudFJlc291cmNlXG4gICAgPyBjb25zdHJ1Y3RVcmwoIHJlc291cmNlLnBhcmVudFJlc291cmNlICkgKyAnLycgKyByZXNvdXJjZS51cmwgKyBpZGVudGl0eVxuICAgIDogcmVzb3VyY2UudXJsO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB1dGlscztcbiJdfQ==
(3)
});
