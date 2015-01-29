!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.ApiClient=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
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

  // Пробежаться по всем родительским ресурсам и собрать url (без query string)
  constructUrl: function constructUrl( trailingSlash ){
    // todo: проверить надобность закомментированного кода
    // trailingSlash - он иногда нужен, сделать конфиг
    // условие с recursionCall добавляет слэш в урл перед знаком вопроса
    //var identity = this.identity ? '/' + this.identity : trailingSlash ? '' : '/';
    var identity = this.identity ? '/' + this.identity : '';

    // Пробежаться по всем ресурсам и заглянуть в корень апи, чтобы собрать url
    return this.parentResource
      ? constructUrl.call( this.parentResource, true ) + '/' + this.url + identity
      : this.url;
  },

  _resourceRequest: function( method, ajaxSettings, done ){
    var url = this.constructUrl()
      , useNotifications = this.notifications;

    console.log( this.resourceName + '::' + method + ' ' + url );
    return this.instance._request( method, url, ajaxSettings.data, ajaxSettings, useNotifications, done );
  }
};

var requestsTable = [];

var methodsMap = {
  'create': 'POST',
  'read':   'GET',
  'update': 'PUT',
  'delete': 'DELETE',
  'patch':  'PATCH',

  'post':   'POST',
  'get':    'GET',
  'save':   'PUT'
};

/**
 * Запросы create read update delete patch get post
 *
 * В ajaxSettings можно указать поле doNotStore - чтобы не сохранять полученный объект в storage
 *
 * @param [data]
 * @param [ajaxSettings]
 * @param [done]
 * @returns {*}
 */
resourceMixin.get = function( data, ajaxSettings, done ){
  var resource = this;
  var identity = this.identity;
  var method = 'GET';

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

  var reqInfo = {
    method: method,
    url: this.constructUrl(),
    ajaxSettings: ajaxSettings,
    result: null,
    meta: null
  };

  //TODO: доделать кэширование
  // Кэширование на чтение
  if ( method === 'GET' ){
    var inCache = _.find( requestsTable, reqInfo );

    if ( resource.storage && identity && inCache ){
      // Если данное есть - вернуть его
      if ( inCache.result ){
        done && done( inCache.result, inCache.meta );
        clearIdentity( resource );
        return;
      }
    }
  }

  var dfd = $.Deferred();
  this._resourceRequest( method, ajaxSettings ).done(function( response, textStatus, jqXHR ){
    var result, fields;

    // #example
    // api.places({ fields: 'name', skip: 100 });
    // Если была выборка по полям, нужно правильно обработать её и передать в документ
    if ( data && data.fields ){
      fields = utils.select( data.fields );
    }

    // Есть ответ надо сохранить в хранилище
    if ( resource.storage && !ajaxSettings.doNotStore ){
      // Не добавлять в хранилище результат запросов с выборкой полей
      if ( fields ){
        result = response.result;
      } else {
        result = storage[ resource.collectionName ].add( response.result || response, fields, true );
      }
    } else {
      result = response.result || response;
    }

    // Сохранить параметры запроса и ответ для кэширования
    reqInfo.result = result;
    reqInfo.meta = response.meta;
    requestsTable.push( reqInfo );

    done && done( result, response.meta );
    dfd.resolve( result, response.meta, textStatus, jqXHR );

  }).fail(function( jqXHR, textStatus, errorThrown ){
    dfd.reject( jqXHR, textStatus, errorThrown );
  });

  //TODO: Использовать идеологю query? query объект для построения запросов

  // identity сохраняется для constructUrl, его нужно очистить для последующих запросов.
  clearIdentity( resource );

  return dfd;
};
resourceMixin.read = resourceMixin.get;

resourceMixin.post = function( data, ajaxSettings, done ){
  var resource = this;
  var identity = this.identity;
  var method = 'POST';
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
    var result;

    // Есть ответ надо сохранить в хранилище
    if ( resource.storage && !ajaxSettings.doNotStore ){
      // При сохранении нужно обновлять документ
      // Попробуем сначала найти документ по id и обновить его
      result = storage[ resource.collectionName ].findById( documentIdString );

      if ( result ){
        // Обновляем документ
        result.set( response.result );

        // Создаём ссылку по новому id в коллекции
        storage[ resource.collectionName ].updateIdLink( result );

        // Этот документ теперь сохранён на сервере, значит он уже не новый.
        result.isNew = false;

      } else {
        result = storage[ resource.collectionName ].add( response.result || response, undefined, true );
      }
    } else {
      result = response.result || response;
    }

    done && done( result, response.meta );
    dfd.resolve( result, response.meta, textStatus, jqXHR );

  }).fail(function( jqXHR, textStatus, errorThrown ){
    dfd.reject( jqXHR, textStatus, errorThrown );
  });

  // identity сохраняется для constructUrl, его нужно очистить для последующих запросов.
  clearIdentity( resource );

  return dfd;
};
resourceMixin.create = resourceMixin.post;

resourceMixin.put = function( data, ajaxSettings, done ){
  var resource = this;
  var identity = this.identity;
  var method = 'PUT';
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
    var result;

    // Есть ответ надо сохранить в хранилище
    if ( resource.storage && !ajaxSettings.doNotStore ){
      // При сохранении нужно обновлять документ
      // Попробуем сначала найти документ по id и обновить его
      result = storage[ resource.collectionName ].findById( documentIdString );

      if ( result ){
        // Обновляем документ
        result.set( response.result );

        // Создаём ссылку по новому id в коллекции
        storage[ resource.collectionName ].updateIdLink( result );

        // Этот документ теперь сохранён на сервере, значит он уже не новый.
        result.isNew = false;

      } else {
        result = storage[ resource.collectionName ].add( response.result || response, undefined, true );
      }
    } else {
      result = response.result || response;
    }

    done && done( result, response.meta );
    dfd.resolve( result, response.meta, textStatus, jqXHR );

  }).fail(function( jqXHR, textStatus, errorThrown ){
    dfd.reject( jqXHR, textStatus, errorThrown );
  });

  // identity сохраняется для constructUrl, его нужно очистить для последующих запросов.
  clearIdentity( resource );

  return dfd;
};
resourceMixin.update = resourceMixin.put;
resourceMixin.save = resourceMixin.put;

resourceMixin.patch = function( data, ajaxSettings, done ){
  var resource = this;
  var identity = this.identity;
  var method = 'PATCH';
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
    var result;

    // Есть ответ надо сохранить в хранилище
    if ( resource.storage && !ajaxSettings.doNotStore ){
      // При PATCH нужно обновлять документ
      // Попробуем сначала найти документ по id и обновить его
      result = storage[ resource.collectionName ].findById( documentIdString );

      if ( result ){
        // Обновляем документ
        result.set( response.result );

        // Создаём ссылку по новому id в коллекции
        storage[ resource.collectionName ].updateIdLink( result );

        // Этот документ теперь сохранён на сервере, значит он уже не новый.
        result.isNew = false;

      } else {
        result = storage[ resource.collectionName ].add( response.result || response, undefined, true );
      }
    } else {
      result = response.result || response;
    }

    //todo: можно добавить кэш на последующие GET и HEAD запросы (http://tools.ietf.org/html/rfc5789)

    done && done( result, response.meta );
    dfd.resolve( result, response.meta, textStatus, jqXHR );

  }).fail(function( jqXHR, textStatus, errorThrown ){
    dfd.reject( jqXHR, textStatus, errorThrown );
  });

  // identity сохраняется для constructUrl, его нужно очистить для последующих запросов.
  clearIdentity( resource );

  return dfd;
};

resourceMixin.delete = function( data, ajaxSettings, done ){
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
    var result;

    result = response.result || response;

    done && done( result, response.meta );
    dfd.resolve( result, response.meta, textStatus, jqXHR );

  }).fail(function( jqXHR, textStatus, errorThrown ){
    dfd.reject( jqXHR, textStatus, errorThrown );
  });

  // identity сохраняется для constructUrl, его нужно очистить для последующих запросов.
  clearIdentity( resource );

  return dfd;
};

// Очистить identity у ресурса и его родительских ресурсов тоже
function clearIdentity( resource ){
  while ( resource.parentResource ) {
    resource.identity = '';
    resource = resource.parentResource;
  }
}

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
  resource.instance = parentResource.instance || parentResource;

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
}

ApiClient.prototype = {
  /**
   * Добавить новый ресурс
   * @see resourceMixin.add
   */
  add: resourceMixin.add,

  methodsMap: methodsMap,

  _prepareAjaxSettings: function( method, url, data, ajaxSettings ){
    var _ajaxSettings = utils.deepMerge( this.hooks, ajaxSettings );

    _ajaxSettings.type = method;
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

  return this._request('read', this.url, undefined, ajaxSettings, false, done );
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
},{"./utils":2}],2:[function(_dereq_,module,exports){
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

module.exports = utils;

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9yZXN0LWFwaS1jbGllbnQvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3Jlc3QtYXBpLWNsaWVudC9zcmMvZmFrZV8yZGY5Y2QzZC5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9yZXN0LWFwaS1jbGllbnQvc3JjL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqd0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIEFQSSBDbGllbnRcbi8vIC0tLS0tLS0tLS0tLS0tLVxuXG4vLyBFeGFtcGxlXG4vKlxuIHZhciBnaXRodWIgPSBBcGlDbGllbnQoJ2h0dHBzOi8vYXBpLmdpdGh1Yi5jb20nLCB7XG4gICBob29rczoge1xuICAgICBoZWFkZXJzOiB7XG4gICAgICAgQWNjZXB0OiAnYXBwbGljYXRpb24vdm5kLmdpdGh1Yi52Mytqc29uJyxcbiAgICAgICBBdXRob3JpemF0aW9uOiAndG9rZW4gOGZiZmM1NDBmMWVkMTQxNzA4M2M3MGE5OTBiNGRiM2M5YWE4NmVmZSdcbiAgICAgfVxuICAgfVxuIH0pO1xuXG4gZ2l0aHViLmFkZCgnc2VhcmNoJywge1xuICBzZWFyY2hNZXRob2Q6IGZ1bmN0aW9uKCl7XG4gICAgY29uc29sZS5sb2coICdzZWFyY2g6OnNlYXJjaE1ldGhvZCcgKTtcbiAgfVxuIH0pO1xuIGdpdGh1Yi5zZWFyY2guYWRkKCd1c2VycycsIHtcbiAgdXNlcnNNZXRob2Q6IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5wYXJlbnQuc2VhcmNoTWV0aG9kKCk7XG4gIH1cbiB9KTtcblxuIC8vINCU0L7QsdCw0LLQu9GP0LXQvCDRgNC10YHRg9GA0YHRi1xuIGdpdGh1Yi5hZGQoJ3VzZXInKTtcbiBnaXRodWIuYWRkKCd1c2VycycpO1xuIGdpdGh1Yi51c2Vycy5hZGQoJ3JlcG9zJyk7XG5cbiAvLyDQn9GA0L7Rh9C40YLQsNGC0Ywg0YDQtdC/0L7Qt9C40YLQvtGA0LjQuCAo0L7RgtC/0YDQsNCy0LjRgtGMINCz0LXRgiDQt9Cw0L/RgNC+0YEg0L3QsCBodHRwczovL2FwaS5naXRodWIuY29tL3VzZXJzL3JlcG9zLylcbiBnaXRodWIudXNlcnMucmVwb3MucmVhZCgpO1xuXG4gLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gLy8g0J3QtSDRgdC+0LLRgdC10LwgUkVTVCwg0LLRgdC1INC30LDQv9GA0L7RgdGLINC40LTRg9GCINC90LAg0L7QtNC40L0g0LDQtNGA0LXRgVxuIHZhciBzaW1wbGVBcGkgPSBBcGlDbGllbnQoJ2FwaS5leGFtcGxlLmNvbScsIHt9KTtcblxuIHNpbXBsZUFwaSgpLnJlYWQoe1xuICBlOiAnL0Jhc2UvRGVwYXJ0bWVudCdcbiB9KTtcblxuIHNpbXBsZUFwaS5wb3N0KHsgZGF0YSB9KTtcbiBzaW1wbGVBcGkoJ2lkZW50aXR5JykucG9zdCh7IGRhdGEgfSwgeyBhamF4U2V0dGluZ3MgfSk7XG4gc2ltcGxlQXBpKCdpZGVudGl0eScpLnBvc3QoIG51bGwsIHsgYWpheFNldHRpbmdzIH0pO1xuIHNpbXBsZUFwaS5wb3N0KHsgZGF0YSB9LCB7IGFqYXhTZXR0aW5ncyB9KTtcbiBzaW1wbGVBcGkucG9zdCggbnVsbCwgeyBhamF4U2V0dGluZ3MgfSk7XG5cbiBzaW1wbGVBcGkucmVhZCggZG9uZSApLmRvbmUoIGRvbmUgKS5mYWlsKCBmYWlsICk7XG5cbiDQoNCw0LHQvtGC0LAg0YEg0LTQvtC60YPQvNC10L3RgtCw0LzQuCAoc3RvcmFnZSksINC+0L0g0YHQsNC8INC/0YDQtdC+0LHRgNCw0LfRg9C10YLRgdGPINGH0LXRgNC10Lcg0LzQtdGC0L7QtCAkX19kZWx0YSgpXG4gc2ltcGxlQXBpLnBvc3QoIERvY3VtZW50ICk7XG4gc2ltcGxlQXBpLnNhdmUoIERvY3VtZW50ICk7XG5cblxuIC8vINCk0LjRh9C4XG4gYWpheFNldHRpbmdzINC00LvRjyDQutCw0LbQtNC+0LPQviDQt9Cw0L/RgNC+0YHQsFxuIElkZW50aXR5INC00LvRjyDQutCw0LbQtNC+0LPQviDQt9Cw0L/RgNC+0YHQsFxuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciByZXNvdXJjZU1peGluID0ge1xuICByZXNvdXJjZU5hbWU6ICdyZXNvdXJjZScsXG4gIHVybDogJycsIC8vID0gcmVzb3VyY2VOYW1lXG5cbiAgLyoqXG4gICAqINCU0L7QsdCw0LLQuNGC0Ywg0L3QvtCy0YvQuSDRgNC10YHRg9GA0YFcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHJlc291cmNlTmFtZVxuICAgKiBAcGFyYW0ge29iamVjdH0gW3BhcmVudFJlc291cmNlXSAtINGA0L7QtNC40YLQtdC70YzRgdC60LjQuSDRgNC10YHRg9GA0YFcbiAgICogQHBhcmFtIHtvYmplY3R9IFt1c2Vyc01peGluXSAtINC/0L7Qu9GM0LfQvtCy0LDRgtC10LvRjNGB0LrQsNGPINC/0YDQuNC80LXRgdGMXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgYWRkOiBmdW5jdGlvbiggcmVzb3VyY2VOYW1lLCBwYXJlbnRSZXNvdXJjZSwgdXNlcnNNaXhpbiApe1xuICAgIGlmICggIXVzZXJzTWl4aW4gKSB7XG4gICAgICB1c2Vyc01peGluID0gcGFyZW50UmVzb3VyY2UgfHwge307XG4gICAgICBwYXJlbnRSZXNvdXJjZSA9IHRoaXM7XG4gICAgfVxuXG4gICAgLy8g0JHRgNC+0YHQuNGC0Ywg0LjRgdC60LvRjtGH0LXQvdC40LUsINC10YHQu9C4INGC0LDQutC+0Lkg0YDQtdGB0YPRgNGBINGD0LbQtSDQtdGB0YLRjFxuICAgIGlmICggdGhpc1sgcmVzb3VyY2VOYW1lIF0gKXtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSByZXNvdXJjZSBuYW1lZCAnICsgcmVzb3VyY2VOYW1lICsgJ2FscmVhZHkgZXhpc3RzLicpO1xuICAgIH1cblxuICAgIC8vINCb0Y7QsdC+0Lkg0LjQtyDRjdGC0LjRhSDQv9Cw0YDQsNC80LXRgtGA0L7QsiDRg9C60LDQt9GL0LLQsNC10YIg0L3QsCDQvdC10L7QsdGF0L7QtNC40LzQvtGB0YLRjCDQuNGB0L/QvtC70YzQt9C+0LLQsNGC0Ywg0YXRgNCw0L3QuNC70LjRidC1XG4gICAgaWYgKCB1c2Vyc01peGluLnNjaGVtYU5hbWUgfHwgdXNlcnNNaXhpbi5jb2xsZWN0aW9uTmFtZSB8fCB1c2Vyc01peGluLnN0b3JhZ2UgKSB7XG4gICAgICAvLyDQntC/0YDQtdC00LXQu9C40Lwg0L3QsNC30LLQsNC90LjQtSDRgdC+0LfQtNCw0LLQsNC10LzQvtC5INC60L7Qu9C70LXQutGG0LjQuFxuICAgICAgdXNlcnNNaXhpbi5jb2xsZWN0aW9uTmFtZSA9IHVzZXJzTWl4aW4uY29sbGVjdGlvbk5hbWUgfHwgcmVzb3VyY2VOYW1lO1xuICAgIH1cblxuICAgIC8vINCf0LXRgNC10LQg0YHQvtC30LTQsNC90LjQtdC8INC60L7Qu9C70LXQutGG0LjQuCDQvdGD0LbQvdC+INGB0L7Qt9C00LDRgtGMINGA0LXRgdGD0YDRgSwg0YfRgtC+0LHRiyDRgyDQutC+0LvQu9C10LrRhtC40Lgg0LHRi9C70LAg0YHRgdGL0LvQutCwINC90LAg0L3QtdCz0L5cbiAgICB0aGlzWyByZXNvdXJjZU5hbWUgXSA9IG5ldyBSZXNvdXJjZSggcmVzb3VyY2VOYW1lLCBwYXJlbnRSZXNvdXJjZSwgdXNlcnNNaXhpbiApO1xuXG4gICAgLy8g0KHQvtC30LTQsNGC0Ywg0LrQvtC70LvQtdC60YbQuNGOLCDQtdGB0LvQuCDRjdGC0L7Qs9C+INC10YnQtSDQvdC1INGB0LTQtdC70LDQu9C4XG4gICAgaWYgKCB1c2Vyc01peGluLmNvbGxlY3Rpb25OYW1lICYmICFzdG9yYWdlWyB1c2Vyc01peGluLmNvbGxlY3Rpb25OYW1lIF0gKXtcbiAgICAgIC8vINCY0YnQtdC8INGB0YXQtdC80YMsINC10YHQu9C4INC+0L3QsCDRg9C60LDQt9Cw0L3QsFxuICAgICAgdmFyIHNjaGVtYSA9IHN0b3JhZ2Uuc2NoZW1hc1sgdXNlcnNNaXhpbi5zY2hlbWFOYW1lIF07XG5cbiAgICAgIGlmICggc2NoZW1hICl7XG4gICAgICAgIHN0b3JhZ2UuY3JlYXRlQ29sbGVjdGlvbiggdXNlcnNNaXhpbi5jb2xsZWN0aW9uTmFtZSwgc2NoZW1hLCB0aGlzWyByZXNvdXJjZU5hbWUgXSApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignUmVzb3VyY2U6OicgKyByZXNvdXJjZU5hbWUgKyAnIFlvdSBjYW5ub3QgdXNlIHN0b3JhZ2UgKGNyZWF0ZSBjb2xsZWN0aW9uKSwgd2l0aG91dCBzcGVjaWZ5aW5nIHRoZSBzY2hlbWEgb2YgdGhlIGRhdGEuJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXNbIHJlc291cmNlTmFtZSBdO1xuICB9LFxuXG4gIC8vINCf0YDQvtCx0LXQttCw0YLRjNGB0Y8g0L/QviDQstGB0LXQvCDRgNC+0LTQuNGC0LXQu9GM0YHQutC40Lwg0YDQtdGB0YPRgNGB0LDQvCDQuCDRgdC+0LHRgNCw0YLRjCB1cmwgKNCx0LXQtyBxdWVyeSBzdHJpbmcpXG4gIGNvbnN0cnVjdFVybDogZnVuY3Rpb24gY29uc3RydWN0VXJsKCB0cmFpbGluZ1NsYXNoICl7XG4gICAgLy8gdG9kbzog0L/RgNC+0LLQtdGA0LjRgtGMINC90LDQtNC+0LHQvdC+0YHRgtGMINC30LDQutC+0LzQvNC10L3RgtC40YDQvtCy0LDQvdC90L7Qs9C+INC60L7QtNCwXG4gICAgLy8gdHJhaWxpbmdTbGFzaCAtINC+0L0g0LjQvdC+0LPQtNCwINC90YPQttC10L0sINGB0LTQtdC70LDRgtGMINC60L7QvdGE0LjQs1xuICAgIC8vINGD0YHQu9C+0LLQuNC1INGBIHJlY3Vyc2lvbkNhbGwg0LTQvtCx0LDQstC70Y/QtdGCINGB0LvRjdGIINCyINGD0YDQuyDQv9C10YDQtdC0INC30L3QsNC60L7QvCDQstC+0L/RgNC+0YHQsFxuICAgIC8vdmFyIGlkZW50aXR5ID0gdGhpcy5pZGVudGl0eSA/ICcvJyArIHRoaXMuaWRlbnRpdHkgOiB0cmFpbGluZ1NsYXNoID8gJycgOiAnLyc7XG4gICAgdmFyIGlkZW50aXR5ID0gdGhpcy5pZGVudGl0eSA/ICcvJyArIHRoaXMuaWRlbnRpdHkgOiAnJztcblxuICAgIC8vINCf0YDQvtCx0LXQttCw0YLRjNGB0Y8g0L/QviDQstGB0LXQvCDRgNC10YHRg9GA0YHQsNC8INC4INC30LDQs9C70Y/QvdGD0YLRjCDQsiDQutC+0YDQtdC90Ywg0LDQv9C4LCDRh9GC0L7QsdGLINGB0L7QsdGA0LDRgtGMIHVybFxuICAgIHJldHVybiB0aGlzLnBhcmVudFJlc291cmNlXG4gICAgICA/IGNvbnN0cnVjdFVybC5jYWxsKCB0aGlzLnBhcmVudFJlc291cmNlLCB0cnVlICkgKyAnLycgKyB0aGlzLnVybCArIGlkZW50aXR5XG4gICAgICA6IHRoaXMudXJsO1xuICB9LFxuXG4gIF9yZXNvdXJjZVJlcXVlc3Q6IGZ1bmN0aW9uKCBtZXRob2QsIGFqYXhTZXR0aW5ncywgZG9uZSApe1xuICAgIHZhciB1cmwgPSB0aGlzLmNvbnN0cnVjdFVybCgpXG4gICAgICAsIHVzZU5vdGlmaWNhdGlvbnMgPSB0aGlzLm5vdGlmaWNhdGlvbnM7XG5cbiAgICBjb25zb2xlLmxvZyggdGhpcy5yZXNvdXJjZU5hbWUgKyAnOjonICsgbWV0aG9kICsgJyAnICsgdXJsICk7XG4gICAgcmV0dXJuIHRoaXMuaW5zdGFuY2UuX3JlcXVlc3QoIG1ldGhvZCwgdXJsLCBhamF4U2V0dGluZ3MuZGF0YSwgYWpheFNldHRpbmdzLCB1c2VOb3RpZmljYXRpb25zLCBkb25lICk7XG4gIH1cbn07XG5cbnZhciByZXF1ZXN0c1RhYmxlID0gW107XG5cbnZhciBtZXRob2RzTWFwID0ge1xuICAnY3JlYXRlJzogJ1BPU1QnLFxuICAncmVhZCc6ICAgJ0dFVCcsXG4gICd1cGRhdGUnOiAnUFVUJyxcbiAgJ2RlbGV0ZSc6ICdERUxFVEUnLFxuICAncGF0Y2gnOiAgJ1BBVENIJyxcblxuICAncG9zdCc6ICAgJ1BPU1QnLFxuICAnZ2V0JzogICAgJ0dFVCcsXG4gICdzYXZlJzogICAnUFVUJ1xufTtcblxuLyoqXG4gKiDQl9Cw0L/RgNC+0YHRiyBjcmVhdGUgcmVhZCB1cGRhdGUgZGVsZXRlIHBhdGNoIGdldCBwb3N0XG4gKlxuICog0JIgYWpheFNldHRpbmdzINC80L7QttC90L4g0YPQutCw0LfQsNGC0Ywg0L/QvtC70LUgZG9Ob3RTdG9yZSAtINGH0YLQvtCx0Ysg0L3QtSDRgdC+0YXRgNCw0L3Rj9GC0Ywg0L/QvtC70YPRh9C10L3QvdGL0Lkg0L7QsdGK0LXQutGCINCyIHN0b3JhZ2VcbiAqXG4gKiBAcGFyYW0gW2RhdGFdXG4gKiBAcGFyYW0gW2FqYXhTZXR0aW5nc11cbiAqIEBwYXJhbSBbZG9uZV1cbiAqIEByZXR1cm5zIHsqfVxuICovXG5yZXNvdXJjZU1peGluLmdldCA9IGZ1bmN0aW9uKCBkYXRhLCBhamF4U2V0dGluZ3MsIGRvbmUgKXtcbiAgdmFyIHJlc291cmNlID0gdGhpcztcbiAgdmFyIGlkZW50aXR5ID0gdGhpcy5pZGVudGl0eTtcbiAgdmFyIG1ldGhvZCA9ICdHRVQnO1xuXG4gIC8vINCV0YHQu9C4IGRhdGEgLSDQtdGB0YLRjCDRhNGD0L3QutGG0LjRjywg0YLQviDRjdGC0L4gZG9uZVxuICBpZiAoIHV0aWxzLmlzRnVuY3Rpb24oIGRhdGEgKSApe1xuICAgIGRvbmUgPSBkYXRhO1xuICAgIGRhdGEgPSB1bmRlZmluZWQ7XG4gIH1cbiAgaWYgKCB1dGlscy5pc0Z1bmN0aW9uKCBhamF4U2V0dGluZ3MgKSApe1xuICAgIGRvbmUgPSBhamF4U2V0dGluZ3M7XG4gICAgYWpheFNldHRpbmdzID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgYWpheFNldHRpbmdzID0gYWpheFNldHRpbmdzIHx8IHt9O1xuICBhamF4U2V0dGluZ3MuZGF0YSA9IGRhdGE7XG5cbiAgdmFyIHJlcUluZm8gPSB7XG4gICAgbWV0aG9kOiBtZXRob2QsXG4gICAgdXJsOiB0aGlzLmNvbnN0cnVjdFVybCgpLFxuICAgIGFqYXhTZXR0aW5nczogYWpheFNldHRpbmdzLFxuICAgIHJlc3VsdDogbnVsbCxcbiAgICBtZXRhOiBudWxsXG4gIH07XG5cbiAgLy9UT0RPOiDQtNC+0LTQtdC70LDRgtGMINC60Y3RiNC40YDQvtCy0LDQvdC40LVcbiAgLy8g0JrRjdGI0LjRgNC+0LLQsNC90LjQtSDQvdCwINGH0YLQtdC90LjQtVxuICBpZiAoIG1ldGhvZCA9PT0gJ0dFVCcgKXtcbiAgICB2YXIgaW5DYWNoZSA9IF8uZmluZCggcmVxdWVzdHNUYWJsZSwgcmVxSW5mbyApO1xuXG4gICAgaWYgKCByZXNvdXJjZS5zdG9yYWdlICYmIGlkZW50aXR5ICYmIGluQ2FjaGUgKXtcbiAgICAgIC8vINCV0YHQu9C4INC00LDQvdC90L7QtSDQtdGB0YLRjCAtINCy0LXRgNC90YPRgtGMINC10LPQvlxuICAgICAgaWYgKCBpbkNhY2hlLnJlc3VsdCApe1xuICAgICAgICBkb25lICYmIGRvbmUoIGluQ2FjaGUucmVzdWx0LCBpbkNhY2hlLm1ldGEgKTtcbiAgICAgICAgY2xlYXJJZGVudGl0eSggcmVzb3VyY2UgKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHZhciBkZmQgPSAkLkRlZmVycmVkKCk7XG4gIHRoaXMuX3Jlc291cmNlUmVxdWVzdCggbWV0aG9kLCBhamF4U2V0dGluZ3MgKS5kb25lKGZ1bmN0aW9uKCByZXNwb25zZSwgdGV4dFN0YXR1cywganFYSFIgKXtcbiAgICB2YXIgcmVzdWx0LCBmaWVsZHM7XG5cbiAgICAvLyAjZXhhbXBsZVxuICAgIC8vIGFwaS5wbGFjZXMoeyBmaWVsZHM6ICduYW1lJywgc2tpcDogMTAwIH0pO1xuICAgIC8vINCV0YHQu9C4INCx0YvQu9CwINCy0YvQsdC+0YDQutCwINC/0L4g0L/QvtC70Y/QvCwg0L3Rg9C20L3QviDQv9GA0LDQstC40LvRjNC90L4g0L7QsdGA0LDQsdC+0YLQsNGC0Ywg0LXRkSDQuCDQv9C10YDQtdC00LDRgtGMINCyINC00L7QutGD0LzQtdC90YJcbiAgICBpZiAoIGRhdGEgJiYgZGF0YS5maWVsZHMgKXtcbiAgICAgIGZpZWxkcyA9IHV0aWxzLnNlbGVjdCggZGF0YS5maWVsZHMgKTtcbiAgICB9XG5cbiAgICAvLyDQldGB0YLRjCDQvtGC0LLQtdGCINC90LDQtNC+INGB0L7RhdGA0LDQvdC40YLRjCDQsiDRhdGA0LDQvdC40LvQuNGJ0LVcbiAgICBpZiAoIHJlc291cmNlLnN0b3JhZ2UgJiYgIWFqYXhTZXR0aW5ncy5kb05vdFN0b3JlICl7XG4gICAgICAvLyDQndC1INC00L7QsdCw0LLQu9GP0YLRjCDQsiDRhdGA0LDQvdC40LvQuNGJ0LUg0YDQtdC30YPQu9GM0YLQsNGCINC30LDQv9GA0L7RgdC+0LIg0YEg0LLRi9Cx0L7RgNC60L7QuSDQv9C+0LvQtdC5XG4gICAgICBpZiAoIGZpZWxkcyApe1xuICAgICAgICByZXN1bHQgPSByZXNwb25zZS5yZXN1bHQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHQgPSBzdG9yYWdlWyByZXNvdXJjZS5jb2xsZWN0aW9uTmFtZSBdLmFkZCggcmVzcG9uc2UucmVzdWx0IHx8IHJlc3BvbnNlLCBmaWVsZHMsIHRydWUgKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0ID0gcmVzcG9uc2UucmVzdWx0IHx8IHJlc3BvbnNlO1xuICAgIH1cblxuICAgIC8vINCh0L7RhdGA0LDQvdC40YLRjCDQv9Cw0YDQsNC80LXRgtGA0Ysg0LfQsNC/0YDQvtGB0LAg0Lgg0L7RgtCy0LXRgiDQtNC70Y8g0LrRjdGI0LjRgNC+0LLQsNC90LjRj1xuICAgIHJlcUluZm8ucmVzdWx0ID0gcmVzdWx0O1xuICAgIHJlcUluZm8ubWV0YSA9IHJlc3BvbnNlLm1ldGE7XG4gICAgcmVxdWVzdHNUYWJsZS5wdXNoKCByZXFJbmZvICk7XG5cbiAgICBkb25lICYmIGRvbmUoIHJlc3VsdCwgcmVzcG9uc2UubWV0YSApO1xuICAgIGRmZC5yZXNvbHZlKCByZXN1bHQsIHJlc3BvbnNlLm1ldGEsIHRleHRTdGF0dXMsIGpxWEhSICk7XG5cbiAgfSkuZmFpbChmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICl7XG4gICAgZGZkLnJlamVjdCgganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICk7XG4gIH0pO1xuXG4gIC8vVE9ETzog0JjRgdC/0L7Qu9GM0LfQvtCy0LDRgtGMINC40LTQtdC+0LvQvtCz0Y4gcXVlcnk/IHF1ZXJ5INC+0LHRitC10LrRgiDQtNC70Y8g0L/QvtGB0YLRgNC+0LXQvdC40Y8g0LfQsNC/0YDQvtGB0L7QslxuXG4gIC8vIGlkZW50aXR5INGB0L7RhdGA0LDQvdGP0LXRgtGB0Y8g0LTQu9GPIGNvbnN0cnVjdFVybCwg0LXQs9C+INC90YPQttC90L4g0L7Rh9C40YHRgtC40YLRjCDQtNC70Y8g0L/QvtGB0LvQtdC00YPRjtGJ0LjRhSDQt9Cw0L/RgNC+0YHQvtCyLlxuICBjbGVhcklkZW50aXR5KCByZXNvdXJjZSApO1xuXG4gIHJldHVybiBkZmQ7XG59O1xucmVzb3VyY2VNaXhpbi5yZWFkID0gcmVzb3VyY2VNaXhpbi5nZXQ7XG5cbnJlc291cmNlTWl4aW4ucG9zdCA9IGZ1bmN0aW9uKCBkYXRhLCBhamF4U2V0dGluZ3MsIGRvbmUgKXtcbiAgdmFyIHJlc291cmNlID0gdGhpcztcbiAgdmFyIGlkZW50aXR5ID0gdGhpcy5pZGVudGl0eTtcbiAgdmFyIG1ldGhvZCA9ICdQT1NUJztcbiAgdmFyIGRvY3VtZW50SWRTdHJpbmc7XG5cbiAgLy8g0JXRgdC70LggZGF0YSAtINC10YHRgtGMINGE0YPQvdC60YbQuNGPLCDRgtC+INGN0YLQviBkb25lXG4gIGlmICggdXRpbHMuaXNGdW5jdGlvbiggZGF0YSApICl7XG4gICAgZG9uZSA9IGRhdGE7XG4gICAgZGF0YSA9IHVuZGVmaW5lZDtcbiAgfVxuICBpZiAoIHV0aWxzLmlzRnVuY3Rpb24oIGFqYXhTZXR0aW5ncyApICl7XG4gICAgZG9uZSA9IGFqYXhTZXR0aW5ncztcbiAgICBhamF4U2V0dGluZ3MgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBhamF4U2V0dGluZ3MgPSBhamF4U2V0dGluZ3MgfHwge307XG5cbiAgLy8g0J/RgNC4INGB0L7RhdGA0LDQvdC10L3QuNC4INC00L7QutGD0LzQtdC90YLQsCDQvdGD0LbQvdC+INGB0L7RhdGA0LDQvdGP0YLRjCDRgtC+0LvRjNC60L4g0LjQt9C80LXQvdGR0L3QvdGL0LUg0L/QvtC70Y9cbiAgLy8g0JjQvdC+0LPQtNCwINC/0LXRgNC10LTQsNGO0YIg0LTQvtC60YPQvNC10L3RglxuICBpZiAoIHJlc291cmNlLnN0b3JhZ2UgJiYgZGF0YSBpbnN0YW5jZW9mIHN0b3JhZ2UuRG9jdW1lbnQgKSB7XG4gICAgZG9jdW1lbnRJZFN0cmluZyA9IGRhdGEuX2lkLnRvU3RyaW5nKCk7XG4gICAgZGF0YSA9IGRhdGEuJF9fZGVsdGEoKTtcblxuICAvLyDQotCw0Log0LzQvtC20L3QviDQv9C+0L3Rj9GC0YwsINGH0YLQviDQvNGLINGB0L7RhdGA0LDQvdGP0LXQvCDRgdGD0YnQtdGC0LLRg9GO0YnQuNC5INC90LAg0YHQtdGA0LLQtdGA0LUgRG9jdW1lbnRcbiAgfSBlbHNlIGlmICggcmVzb3VyY2Uuc3RvcmFnZSAmJiBzdG9yYWdlLk9iamVjdElkLmlzVmFsaWQoIGlkZW50aXR5ICkgKSB7XG4gICAgZG9jdW1lbnRJZFN0cmluZyA9IGlkZW50aXR5O1xuXG4gIC8vINCf0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuCDRh9C10YDQtdC3INC80LXRgtC+0LQgc2F2ZSgpINGDINC00L7QutGD0LzQtdC90YLQsFxuICB9IGVsc2UgaWYgKCByZXNvdXJjZS5zdG9yYWdlICYmIGRhdGEuX2lkICYmIHN0b3JhZ2UuT2JqZWN0SWQuaXNWYWxpZCggZGF0YS5faWQgKSApIHtcbiAgICBkb2N1bWVudElkU3RyaW5nID0gZGF0YS5faWQudG9TdHJpbmcoKTtcbiAgfVxuXG4gIGFqYXhTZXR0aW5ncy5kYXRhID0gZGF0YTtcblxuICB2YXIgZGZkID0gJC5EZWZlcnJlZCgpO1xuICB0aGlzLl9yZXNvdXJjZVJlcXVlc3QoIG1ldGhvZCwgYWpheFNldHRpbmdzICkuZG9uZShmdW5jdGlvbiggcmVzcG9uc2UsIHRleHRTdGF0dXMsIGpxWEhSICl7XG4gICAgdmFyIHJlc3VsdDtcblxuICAgIC8vINCV0YHRgtGMINC+0YLQstC10YIg0L3QsNC00L4g0YHQvtGF0YDQsNC90LjRgtGMINCyINGF0YDQsNC90LjQu9C40YnQtVxuICAgIGlmICggcmVzb3VyY2Uuc3RvcmFnZSAmJiAhYWpheFNldHRpbmdzLmRvTm90U3RvcmUgKXtcbiAgICAgIC8vINCf0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuCDQvdGD0LbQvdC+INC+0LHQvdC+0LLQu9GP0YLRjCDQtNC+0LrRg9C80LXQvdGCXG4gICAgICAvLyDQn9C+0L/RgNC+0LHRg9C10Lwg0YHQvdCw0YfQsNC70LAg0L3QsNC50YLQuCDQtNC+0LrRg9C80LXQvdGCINC/0L4gaWQg0Lgg0L7QsdC90L7QstC40YLRjCDQtdCz0L5cbiAgICAgIHJlc3VsdCA9IHN0b3JhZ2VbIHJlc291cmNlLmNvbGxlY3Rpb25OYW1lIF0uZmluZEJ5SWQoIGRvY3VtZW50SWRTdHJpbmcgKTtcblxuICAgICAgaWYgKCByZXN1bHQgKXtcbiAgICAgICAgLy8g0J7QsdC90L7QstC70Y/QtdC8INC00L7QutGD0LzQtdC90YJcbiAgICAgICAgcmVzdWx0LnNldCggcmVzcG9uc2UucmVzdWx0ICk7XG5cbiAgICAgICAgLy8g0KHQvtC30LTQsNGR0Lwg0YHRgdGL0LvQutGDINC/0L4g0L3QvtCy0L7QvNGDIGlkINCyINC60L7Qu9C70LXQutGG0LjQuFxuICAgICAgICBzdG9yYWdlWyByZXNvdXJjZS5jb2xsZWN0aW9uTmFtZSBdLnVwZGF0ZUlkTGluayggcmVzdWx0ICk7XG5cbiAgICAgICAgLy8g0K3RgtC+0YIg0LTQvtC60YPQvNC10L3RgiDRgtC10L/QtdGA0Ywg0YHQvtGF0YDQsNC90ZHQvSDQvdCwINGB0LXRgNCy0LXRgNC1LCDQt9C90LDRh9C40YIg0L7QvSDRg9C20LUg0L3QtSDQvdC+0LLRi9C5LlxuICAgICAgICByZXN1bHQuaXNOZXcgPSBmYWxzZTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0ID0gc3RvcmFnZVsgcmVzb3VyY2UuY29sbGVjdGlvbk5hbWUgXS5hZGQoIHJlc3BvbnNlLnJlc3VsdCB8fCByZXNwb25zZSwgdW5kZWZpbmVkLCB0cnVlICk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdCA9IHJlc3BvbnNlLnJlc3VsdCB8fCByZXNwb25zZTtcbiAgICB9XG5cbiAgICBkb25lICYmIGRvbmUoIHJlc3VsdCwgcmVzcG9uc2UubWV0YSApO1xuICAgIGRmZC5yZXNvbHZlKCByZXN1bHQsIHJlc3BvbnNlLm1ldGEsIHRleHRTdGF0dXMsIGpxWEhSICk7XG5cbiAgfSkuZmFpbChmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICl7XG4gICAgZGZkLnJlamVjdCgganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICk7XG4gIH0pO1xuXG4gIC8vIGlkZW50aXR5INGB0L7RhdGA0LDQvdGP0LXRgtGB0Y8g0LTQu9GPIGNvbnN0cnVjdFVybCwg0LXQs9C+INC90YPQttC90L4g0L7Rh9C40YHRgtC40YLRjCDQtNC70Y8g0L/QvtGB0LvQtdC00YPRjtGJ0LjRhSDQt9Cw0L/RgNC+0YHQvtCyLlxuICBjbGVhcklkZW50aXR5KCByZXNvdXJjZSApO1xuXG4gIHJldHVybiBkZmQ7XG59O1xucmVzb3VyY2VNaXhpbi5jcmVhdGUgPSByZXNvdXJjZU1peGluLnBvc3Q7XG5cbnJlc291cmNlTWl4aW4ucHV0ID0gZnVuY3Rpb24oIGRhdGEsIGFqYXhTZXR0aW5ncywgZG9uZSApe1xuICB2YXIgcmVzb3VyY2UgPSB0aGlzO1xuICB2YXIgaWRlbnRpdHkgPSB0aGlzLmlkZW50aXR5O1xuICB2YXIgbWV0aG9kID0gJ1BVVCc7XG4gIHZhciBkb2N1bWVudElkU3RyaW5nO1xuXG4gIC8vINCV0YHQu9C4IGRhdGEgLSDQtdGB0YLRjCDRhNGD0L3QutGG0LjRjywg0YLQviDRjdGC0L4gZG9uZVxuICBpZiAoIHV0aWxzLmlzRnVuY3Rpb24oIGRhdGEgKSApe1xuICAgIGRvbmUgPSBkYXRhO1xuICAgIGRhdGEgPSB1bmRlZmluZWQ7XG4gIH1cbiAgaWYgKCB1dGlscy5pc0Z1bmN0aW9uKCBhamF4U2V0dGluZ3MgKSApe1xuICAgIGRvbmUgPSBhamF4U2V0dGluZ3M7XG4gICAgYWpheFNldHRpbmdzID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgYWpheFNldHRpbmdzID0gYWpheFNldHRpbmdzIHx8IHt9O1xuXG4gIC8vINCf0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuCDQtNC+0LrRg9C80LXQvdGC0LAg0L3Rg9C20L3QviDRgdC+0YXRgNCw0L3Rj9GC0Ywg0YLQvtC70YzQutC+INC40LfQvNC10L3RkdC90L3Ri9C1INC/0L7Qu9GPXG4gIC8vINCY0L3QvtCz0LTQsCDQv9C10YDQtdC00LDRjtGCINC00L7QutGD0LzQtdC90YJcbiAgaWYgKCByZXNvdXJjZS5zdG9yYWdlICYmIGRhdGEgaW5zdGFuY2VvZiBzdG9yYWdlLkRvY3VtZW50ICkge1xuICAgIGRvY3VtZW50SWRTdHJpbmcgPSBkYXRhLl9pZC50b1N0cmluZygpO1xuICAgIGRhdGEgPSBkYXRhLiRfX2RlbHRhKCk7XG5cbiAgICAvLyDQotCw0Log0LzQvtC20L3QviDQv9C+0L3Rj9GC0YwsINGH0YLQviDQvNGLINGB0L7RhdGA0LDQvdGP0LXQvCDRgdGD0YnQtdGC0LLRg9GO0YnQuNC5INC90LAg0YHQtdGA0LLQtdGA0LUgRG9jdW1lbnRcbiAgfSBlbHNlIGlmICggcmVzb3VyY2Uuc3RvcmFnZSAmJiBzdG9yYWdlLk9iamVjdElkLmlzVmFsaWQoIGlkZW50aXR5ICkgKSB7XG4gICAgZG9jdW1lbnRJZFN0cmluZyA9IGlkZW50aXR5O1xuXG4gICAgLy8g0J/RgNC4INGB0L7RhdGA0LDQvdC10L3QuNC4INGH0LXRgNC10Lcg0LzQtdGC0L7QtCBzYXZlKCkg0YMg0LTQvtC60YPQvNC10L3RgtCwXG4gIH0gZWxzZSBpZiAoIHJlc291cmNlLnN0b3JhZ2UgJiYgZGF0YS5faWQgJiYgc3RvcmFnZS5PYmplY3RJZC5pc1ZhbGlkKCBkYXRhLl9pZCApICkge1xuICAgIGRvY3VtZW50SWRTdHJpbmcgPSBkYXRhLl9pZC50b1N0cmluZygpO1xuICB9XG5cbiAgYWpheFNldHRpbmdzLmRhdGEgPSBkYXRhO1xuXG4gIHZhciBkZmQgPSAkLkRlZmVycmVkKCk7XG4gIHRoaXMuX3Jlc291cmNlUmVxdWVzdCggbWV0aG9kLCBhamF4U2V0dGluZ3MgKS5kb25lKGZ1bmN0aW9uKCByZXNwb25zZSwgdGV4dFN0YXR1cywganFYSFIgKXtcbiAgICB2YXIgcmVzdWx0O1xuXG4gICAgLy8g0JXRgdGC0Ywg0L7RgtCy0LXRgiDQvdCw0LTQviDRgdC+0YXRgNCw0L3QuNGC0Ywg0LIg0YXRgNCw0L3QuNC70LjRidC1XG4gICAgaWYgKCByZXNvdXJjZS5zdG9yYWdlICYmICFhamF4U2V0dGluZ3MuZG9Ob3RTdG9yZSApe1xuICAgICAgLy8g0J/RgNC4INGB0L7RhdGA0LDQvdC10L3QuNC4INC90YPQttC90L4g0L7QsdC90L7QstC70Y/RgtGMINC00L7QutGD0LzQtdC90YJcbiAgICAgIC8vINCf0L7Qv9GA0L7QsdGD0LXQvCDRgdC90LDRh9Cw0LvQsCDQvdCw0LnRgtC4INC00L7QutGD0LzQtdC90YIg0L/QviBpZCDQuCDQvtCx0L3QvtCy0LjRgtGMINC10LPQvlxuICAgICAgcmVzdWx0ID0gc3RvcmFnZVsgcmVzb3VyY2UuY29sbGVjdGlvbk5hbWUgXS5maW5kQnlJZCggZG9jdW1lbnRJZFN0cmluZyApO1xuXG4gICAgICBpZiAoIHJlc3VsdCApe1xuICAgICAgICAvLyDQntCx0L3QvtCy0LvRj9C10Lwg0LTQvtC60YPQvNC10L3RglxuICAgICAgICByZXN1bHQuc2V0KCByZXNwb25zZS5yZXN1bHQgKTtcblxuICAgICAgICAvLyDQodC+0LfQtNCw0ZHQvCDRgdGB0YvQu9C60YMg0L/QviDQvdC+0LLQvtC80YMgaWQg0LIg0LrQvtC70LvQtdC60YbQuNC4XG4gICAgICAgIHN0b3JhZ2VbIHJlc291cmNlLmNvbGxlY3Rpb25OYW1lIF0udXBkYXRlSWRMaW5rKCByZXN1bHQgKTtcblxuICAgICAgICAvLyDQrdGC0L7RgiDQtNC+0LrRg9C80LXQvdGCINGC0LXQv9C10YDRjCDRgdC+0YXRgNCw0L3RkdC9INC90LAg0YHQtdGA0LLQtdGA0LUsINC30L3QsNGH0LjRgiDQvtC9INGD0LbQtSDQvdC1INC90L7QstGL0LkuXG4gICAgICAgIHJlc3VsdC5pc05ldyA9IGZhbHNlO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHQgPSBzdG9yYWdlWyByZXNvdXJjZS5jb2xsZWN0aW9uTmFtZSBdLmFkZCggcmVzcG9uc2UucmVzdWx0IHx8IHJlc3BvbnNlLCB1bmRlZmluZWQsIHRydWUgKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0ID0gcmVzcG9uc2UucmVzdWx0IHx8IHJlc3BvbnNlO1xuICAgIH1cblxuICAgIGRvbmUgJiYgZG9uZSggcmVzdWx0LCByZXNwb25zZS5tZXRhICk7XG4gICAgZGZkLnJlc29sdmUoIHJlc3VsdCwgcmVzcG9uc2UubWV0YSwgdGV4dFN0YXR1cywganFYSFIgKTtcblxuICB9KS5mYWlsKGZ1bmN0aW9uKCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKXtcbiAgICBkZmQucmVqZWN0KCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKTtcbiAgfSk7XG5cbiAgLy8gaWRlbnRpdHkg0YHQvtGF0YDQsNC90Y/QtdGC0YHRjyDQtNC70Y8gY29uc3RydWN0VXJsLCDQtdCz0L4g0L3Rg9C20L3QviDQvtGH0LjRgdGC0LjRgtGMINC00LvRjyDQv9C+0YHQu9C10LTRg9GO0YnQuNGFINC30LDQv9GA0L7RgdC+0LIuXG4gIGNsZWFySWRlbnRpdHkoIHJlc291cmNlICk7XG5cbiAgcmV0dXJuIGRmZDtcbn07XG5yZXNvdXJjZU1peGluLnVwZGF0ZSA9IHJlc291cmNlTWl4aW4ucHV0O1xucmVzb3VyY2VNaXhpbi5zYXZlID0gcmVzb3VyY2VNaXhpbi5wdXQ7XG5cbnJlc291cmNlTWl4aW4ucGF0Y2ggPSBmdW5jdGlvbiggZGF0YSwgYWpheFNldHRpbmdzLCBkb25lICl7XG4gIHZhciByZXNvdXJjZSA9IHRoaXM7XG4gIHZhciBpZGVudGl0eSA9IHRoaXMuaWRlbnRpdHk7XG4gIHZhciBtZXRob2QgPSAnUEFUQ0gnO1xuICB2YXIgZG9jdW1lbnRJZFN0cmluZztcblxuICAvLyDQldGB0LvQuCBkYXRhIC0g0LXRgdGC0Ywg0YTRg9C90LrRhtC40Y8sINGC0L4g0Y3RgtC+IGRvbmVcbiAgaWYgKCB1dGlscy5pc0Z1bmN0aW9uKCBkYXRhICkgKXtcbiAgICBkb25lID0gZGF0YTtcbiAgICBkYXRhID0gdW5kZWZpbmVkO1xuICB9XG4gIGlmICggdXRpbHMuaXNGdW5jdGlvbiggYWpheFNldHRpbmdzICkgKXtcbiAgICBkb25lID0gYWpheFNldHRpbmdzO1xuICAgIGFqYXhTZXR0aW5ncyA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGFqYXhTZXR0aW5ncyA9IGFqYXhTZXR0aW5ncyB8fCB7fTtcblxuICAvLyDQn9GA0Lgg0YHQvtGF0YDQsNC90LXQvdC40Lgg0LTQvtC60YPQvNC10L3RgtCwINC90YPQttC90L4g0YHQvtGF0YDQsNC90Y/RgtGMINGC0L7Qu9GM0LrQviDQuNC30LzQtdC90ZHQvdC90YvQtSDQv9C+0LvRj1xuICAvLyDQmNC90L7Qs9C00LAg0L/QtdGA0LXQtNCw0Y7RgiDQtNC+0LrRg9C80LXQvdGCXG4gIGlmICggcmVzb3VyY2Uuc3RvcmFnZSAmJiBkYXRhIGluc3RhbmNlb2Ygc3RvcmFnZS5Eb2N1bWVudCApIHtcbiAgICBkb2N1bWVudElkU3RyaW5nID0gZGF0YS5faWQudG9TdHJpbmcoKTtcbiAgICBkYXRhID0gZGF0YS4kX19kZWx0YSgpO1xuXG4gICAgLy8g0KLQsNC6INC80L7QttC90L4g0L/QvtC90Y/RgtGMLCDRh9GC0L4g0LzRiyDRgdC+0YXRgNCw0L3Rj9C10Lwg0YHRg9GJ0LXRgtCy0YPRjtGJ0LjQuSDQvdCwINGB0LXRgNCy0LXRgNC1IERvY3VtZW50XG4gIH0gZWxzZSBpZiAoIHJlc291cmNlLnN0b3JhZ2UgJiYgc3RvcmFnZS5PYmplY3RJZC5pc1ZhbGlkKCBpZGVudGl0eSApICkge1xuICAgIGRvY3VtZW50SWRTdHJpbmcgPSBpZGVudGl0eTtcblxuICAgIC8vINCf0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuCDRh9C10YDQtdC3INC80LXRgtC+0LQgc2F2ZSgpINGDINC00L7QutGD0LzQtdC90YLQsFxuICB9IGVsc2UgaWYgKCByZXNvdXJjZS5zdG9yYWdlICYmIGRhdGEuX2lkICYmIHN0b3JhZ2UuT2JqZWN0SWQuaXNWYWxpZCggZGF0YS5faWQgKSApIHtcbiAgICBkb2N1bWVudElkU3RyaW5nID0gZGF0YS5faWQudG9TdHJpbmcoKTtcbiAgfVxuXG4gIGFqYXhTZXR0aW5ncy5kYXRhID0gZGF0YTtcblxuICB2YXIgZGZkID0gJC5EZWZlcnJlZCgpO1xuICB0aGlzLl9yZXNvdXJjZVJlcXVlc3QoIG1ldGhvZCwgYWpheFNldHRpbmdzICkuZG9uZShmdW5jdGlvbiggcmVzcG9uc2UsIHRleHRTdGF0dXMsIGpxWEhSICl7XG4gICAgdmFyIHJlc3VsdDtcblxuICAgIC8vINCV0YHRgtGMINC+0YLQstC10YIg0L3QsNC00L4g0YHQvtGF0YDQsNC90LjRgtGMINCyINGF0YDQsNC90LjQu9C40YnQtVxuICAgIGlmICggcmVzb3VyY2Uuc3RvcmFnZSAmJiAhYWpheFNldHRpbmdzLmRvTm90U3RvcmUgKXtcbiAgICAgIC8vINCf0YDQuCBQQVRDSCDQvdGD0LbQvdC+INC+0LHQvdC+0LLQu9GP0YLRjCDQtNC+0LrRg9C80LXQvdGCXG4gICAgICAvLyDQn9C+0L/RgNC+0LHRg9C10Lwg0YHQvdCw0YfQsNC70LAg0L3QsNC50YLQuCDQtNC+0LrRg9C80LXQvdGCINC/0L4gaWQg0Lgg0L7QsdC90L7QstC40YLRjCDQtdCz0L5cbiAgICAgIHJlc3VsdCA9IHN0b3JhZ2VbIHJlc291cmNlLmNvbGxlY3Rpb25OYW1lIF0uZmluZEJ5SWQoIGRvY3VtZW50SWRTdHJpbmcgKTtcblxuICAgICAgaWYgKCByZXN1bHQgKXtcbiAgICAgICAgLy8g0J7QsdC90L7QstC70Y/QtdC8INC00L7QutGD0LzQtdC90YJcbiAgICAgICAgcmVzdWx0LnNldCggcmVzcG9uc2UucmVzdWx0ICk7XG5cbiAgICAgICAgLy8g0KHQvtC30LTQsNGR0Lwg0YHRgdGL0LvQutGDINC/0L4g0L3QvtCy0L7QvNGDIGlkINCyINC60L7Qu9C70LXQutGG0LjQuFxuICAgICAgICBzdG9yYWdlWyByZXNvdXJjZS5jb2xsZWN0aW9uTmFtZSBdLnVwZGF0ZUlkTGluayggcmVzdWx0ICk7XG5cbiAgICAgICAgLy8g0K3RgtC+0YIg0LTQvtC60YPQvNC10L3RgiDRgtC10L/QtdGA0Ywg0YHQvtGF0YDQsNC90ZHQvSDQvdCwINGB0LXRgNCy0LXRgNC1LCDQt9C90LDRh9C40YIg0L7QvSDRg9C20LUg0L3QtSDQvdC+0LLRi9C5LlxuICAgICAgICByZXN1bHQuaXNOZXcgPSBmYWxzZTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0ID0gc3RvcmFnZVsgcmVzb3VyY2UuY29sbGVjdGlvbk5hbWUgXS5hZGQoIHJlc3BvbnNlLnJlc3VsdCB8fCByZXNwb25zZSwgdW5kZWZpbmVkLCB0cnVlICk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdCA9IHJlc3BvbnNlLnJlc3VsdCB8fCByZXNwb25zZTtcbiAgICB9XG5cbiAgICAvL3RvZG86INC80L7QttC90L4g0LTQvtCx0LDQstC40YLRjCDQutGN0Ygg0L3QsCDQv9C+0YHQu9C10LTRg9GO0YnQuNC1IEdFVCDQuCBIRUFEINC30LDQv9GA0L7RgdGLIChodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM1Nzg5KVxuXG4gICAgZG9uZSAmJiBkb25lKCByZXN1bHQsIHJlc3BvbnNlLm1ldGEgKTtcbiAgICBkZmQucmVzb2x2ZSggcmVzdWx0LCByZXNwb25zZS5tZXRhLCB0ZXh0U3RhdHVzLCBqcVhIUiApO1xuXG4gIH0pLmZhaWwoZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApe1xuICAgIGRmZC5yZWplY3QoIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApO1xuICB9KTtcblxuICAvLyBpZGVudGl0eSDRgdC+0YXRgNCw0L3Rj9C10YLRgdGPINC00LvRjyBjb25zdHJ1Y3RVcmwsINC10LPQviDQvdGD0LbQvdC+INC+0YfQuNGB0YLQuNGC0Ywg0LTQu9GPINC/0L7RgdC70LXQtNGD0Y7RidC40YUg0LfQsNC/0YDQvtGB0L7Qsi5cbiAgY2xlYXJJZGVudGl0eSggcmVzb3VyY2UgKTtcblxuICByZXR1cm4gZGZkO1xufTtcblxucmVzb3VyY2VNaXhpbi5kZWxldGUgPSBmdW5jdGlvbiggZGF0YSwgYWpheFNldHRpbmdzLCBkb25lICl7XG4gIHZhciByZXNvdXJjZSA9IHRoaXM7XG4gIHZhciBtZXRob2QgPSAnREVMRVRFJztcblxuICAvLyDQldGB0LvQuCBkYXRhIC0g0LXRgdGC0Ywg0YTRg9C90LrRhtC40Y8sINGC0L4g0Y3RgtC+IGRvbmVcbiAgaWYgKCB1dGlscy5pc0Z1bmN0aW9uKCBkYXRhICkgKXtcbiAgICBkb25lID0gZGF0YTtcbiAgICBkYXRhID0gdW5kZWZpbmVkO1xuICB9XG4gIGlmICggdXRpbHMuaXNGdW5jdGlvbiggYWpheFNldHRpbmdzICkgKXtcbiAgICBkb25lID0gYWpheFNldHRpbmdzO1xuICAgIGFqYXhTZXR0aW5ncyA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGFqYXhTZXR0aW5ncyA9IGFqYXhTZXR0aW5ncyB8fCB7fTtcbiAgYWpheFNldHRpbmdzLmRhdGEgPSBkYXRhO1xuXG4gIHZhciBkZmQgPSAkLkRlZmVycmVkKCk7XG4gIHRoaXMuX3Jlc291cmNlUmVxdWVzdCggbWV0aG9kLCBhamF4U2V0dGluZ3MgKS5kb25lKGZ1bmN0aW9uKCByZXNwb25zZSwgdGV4dFN0YXR1cywganFYSFIgKXtcbiAgICB2YXIgcmVzdWx0O1xuXG4gICAgcmVzdWx0ID0gcmVzcG9uc2UucmVzdWx0IHx8IHJlc3BvbnNlO1xuXG4gICAgZG9uZSAmJiBkb25lKCByZXN1bHQsIHJlc3BvbnNlLm1ldGEgKTtcbiAgICBkZmQucmVzb2x2ZSggcmVzdWx0LCByZXNwb25zZS5tZXRhLCB0ZXh0U3RhdHVzLCBqcVhIUiApO1xuXG4gIH0pLmZhaWwoZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApe1xuICAgIGRmZC5yZWplY3QoIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApO1xuICB9KTtcblxuICAvLyBpZGVudGl0eSDRgdC+0YXRgNCw0L3Rj9C10YLRgdGPINC00LvRjyBjb25zdHJ1Y3RVcmwsINC10LPQviDQvdGD0LbQvdC+INC+0YfQuNGB0YLQuNGC0Ywg0LTQu9GPINC/0L7RgdC70LXQtNGD0Y7RidC40YUg0LfQsNC/0YDQvtGB0L7Qsi5cbiAgY2xlYXJJZGVudGl0eSggcmVzb3VyY2UgKTtcblxuICByZXR1cm4gZGZkO1xufTtcblxuLy8g0J7Rh9C40YHRgtC40YLRjCBpZGVudGl0eSDRgyDRgNC10YHRg9GA0YHQsCDQuCDQtdCz0L4g0YDQvtC00LjRgtC10LvRjNGB0LrQuNGFINGA0LXRgdGD0YDRgdC+0LIg0YLQvtC20LVcbmZ1bmN0aW9uIGNsZWFySWRlbnRpdHkoIHJlc291cmNlICl7XG4gIHdoaWxlICggcmVzb3VyY2UucGFyZW50UmVzb3VyY2UgKSB7XG4gICAgcmVzb3VyY2UuaWRlbnRpdHkgPSAnJztcbiAgICByZXNvdXJjZSA9IHJlc291cmNlLnBhcmVudFJlc291cmNlO1xuICB9XG59XG5cbi8qKlxuICog0JrQvtC90YHRgtGA0YPQutGC0L7RgCDRgNC10YHRg9GA0YHQsCwg0L3QviDQstC+0LfQstGA0LDRidCw0LXRgiDRhNGD0L3QutGG0LjRjiDRgdC+INGB0LLQvtC50YHRgtCy0LDQvNC4XG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHJlc291cmNlTmFtZVxuICogQHBhcmFtIHtvYmplY3R9IHBhcmVudFJlc291cmNlXG4gKiBAcGFyYW0ge29iamVjdH0gdXNlcnNNaXhpblxuICogQHJldHVybnMge0Z1bmN0aW9ufSByZXNvdXJjZVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFJlc291cmNlKCByZXNvdXJjZU5hbWUsIHBhcmVudFJlc291cmNlLCB1c2Vyc01peGluICl7XG5cbiAgLyoqXG4gICAqINCt0YLRgyDRhNGD0L3QutGG0LjRjiDQvNGLINC+0YLQtNCw0ZHQvCDQv9C+0LvRjNC30L7QstCw0YLQtdC70Y4g0LIg0LrQsNGH0LXRgdGC0LLQtSDQtNC+0YHRgtGD0L/QsCDQuiDRgNC10YHRg9GA0YHRgy5cbiAgICog0J7QvdCwINC/0L7Qt9Cy0L7Qu9GP0LXRgiDQt9Cw0LTQsNGC0YwgaWRlbnRpdHkg0LTQu9GPINC30LDQv9GA0L7RgdCwLlxuICAgKlxuICAgKiBAcGFyYW0gW2lkZW50aXR5XVxuICAgKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gICAqL1xuICB2YXIgcmVzb3VyY2UgPSBmdW5jdGlvbiByZXNvdXJjZSggaWRlbnRpdHkgKXtcbiAgICBpZiAoIGlkZW50aXR5ID09IG51bGwgKXtcbiAgICAgIHJldHVybiByZXNvdXJjZTtcbiAgICB9XG5cbiAgICBpZiAoIGlkZW50aXR5ICYmICF1dGlscy5pc1N0cmluZyggaWRlbnRpdHkgKSApe1xuICAgICAgY29uc29sZS5lcnJvcignaWRlbnRpdHkg0LTQvtC70LbQtdC9INCx0YvRgtGMINGB0YLRgNC+0LrQvtC5LCDQsCDQvdC1JywgaWRlbnRpdHkgKTtcbiAgICB9XG5cbiAgICByZXNvdXJjZS5pZGVudGl0eSA9IGlkZW50aXR5IHx8ICcnO1xuXG4gICAgcmV0dXJuIHJlc291cmNlO1xuICB9O1xuXG4gICQuZXh0ZW5kKCByZXNvdXJjZSwgcmVzb3VyY2VNaXhpbiwge1xuICAgIHJlc291cmNlTmFtZTogcmVzb3VyY2VOYW1lLFxuICAgIHVybDogcmVzb3VyY2VOYW1lXG4gIH0sIHVzZXJzTWl4aW4gKTtcblxuICByZXNvdXJjZS5wYXJlbnRSZXNvdXJjZSA9IHBhcmVudFJlc291cmNlO1xuICByZXNvdXJjZS5pbnN0YW5jZSA9IHBhcmVudFJlc291cmNlLmluc3RhbmNlIHx8IHBhcmVudFJlc291cmNlO1xuXG4gIHJldHVybiByZXNvdXJjZTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgbmV3IGFwaSBjbGllbnRcbiAqXG4gKiBAZXhhbXBsZVxuICogdmFyIGFwaSA9IG5ldyBBcGlDbGllbnQoJy9hcGknLCB7XG4gKiAgIGhvb2tzOiB7XG4gKiAgICAgaGVhZGVyczoge1xuICogICAgICAgdG9rZW46ICdYWFhYWFgnXG4gKiAgICAgfVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiB2YXIgYXBpID0gbmV3IEFwaUNsaWVudCgnaHR0cHM6Ly9kb21haW4uY29tL2FwaScsIHtcbiAqICAgaG9va3M6IHtcbiAqICAgICBoZWFkZXJzOiB7XG4gKiAgICAgICB0b2tlbjogJ1hYWFhYWCdcbiAqICAgICB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIHZhciBhcGkgPSBuZXcgQXBpQ2xpZW50KHtcbiAqICAgdXJsOiAnL2FwaSdcbiAqICAgaG9va3M6IHtcbiAqICAgICBoZWFkZXJzOiB7XG4gKiAgICAgICB0b2tlbjogJ1hYWFhYWCdcbiAqICAgICB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIEBwYXJhbSB1cmwgYXBpIHJvb3QgdXJsXG4gKiBAcGFyYW0gb3B0aW9ucyBhcGkgY2xpZW50IG9wdGlvbnNcbiAqL1xuZnVuY3Rpb24gQXBpQ2xpZW50KCB1cmwsIG9wdGlvbnMgKXtcbiAgaWYgKCAhKHRoaXMgaW5zdGFuY2VvZiBBcGlDbGllbnQpICkge1xuICAgIHJldHVybiBuZXcgQXBpQ2xpZW50KCB1cmwsIG9wdGlvbnMgKTtcbiAgfVxuXG4gIC8vIElmIGZpcnN0IGFyZyBpcyBvYmplY3RcbiAgaWYgKCB1dGlscy5pc09iamVjdCggdXJsICkgKXtcbiAgICBvcHRpb25zID0gdXJsO1xuICAgIHVybCA9IGxvY2F0aW9uLm9yaWdpbjtcbiAgfVxuXG4gIGlmICggdXJsID09IG51bGwgKXtcbiAgICB1cmwgPSBsb2NhdGlvbi5vcmlnaW47XG4gIH1cblxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgb3B0aW9ucy51cmwgPSB1cmw7XG5cbiAgLy8gRGVmYXVsdHMsIG5vdGlmaWNhdGlvbnMgaXMgb2ZmXG4gIHRoaXMubm90aWZpY2F0aW9ucyA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBob29rcyBmb3IgYWpheCBzZXR0aW5ncyAoYXMgYmFzZSBhamF4U2V0dGluZ3MpXG4gICAqIEBzZWUgaHR0cDovL2FwaS5qcXVlcnkuY29tL2pRdWVyeS5hamF4L1xuICAgKlxuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKi9cbiAgdGhpcy5ob29rcyA9IHtcbiAgICAvLyDQtNC+0L/QvtC70L3QuNGC0LXQu9GM0L3Ri9C1INC00LDQvdC90YvQtSDQt9Cw0L/RgNC+0YHQsFxuICAgIGRhdGE6IHt9LFxuICAgIC8vINCe0LHRitC10LrRgiDQtNC70Y8g0LTQvtCx0LDQstC70LXQvdC40Y8g0L/RgNC+0LjQt9Cy0L7Qu9GM0L3Ri9GFINC30LDQs9C+0LvQvtCy0LrQvtCyINC60L4g0LLRgdC10Lwg0LfQsNC/0YDQvtGB0LDQvFxuICAgIC8vINGD0LTQvtCx0L3QviDQtNC70Y8g0LDQstGC0L7RgNC40LfQsNGG0LjQuCDQv9C+INGC0L7QutC10L3QsNC8XG4gICAgaGVhZGVyczoge31cbiAgfTtcblxuICAvL3RvZG86IHRvIHV0aWxzIChkZWVwTWVyZ2UpINC00L7QsdCw0LLQuNGC0Ywg0LLQvtC30LzQvtC20L3QvtGB0YLRjCDRgNCw0YHRiNC40YDRj9GC0Ywg0L7QsdGK0LXQutGCLCDQsCDQvdC1INCy0L7Qt9Cy0YDQsNGJ0LDRgtGMINC90L7QstGL0LlcbiAgJC5leHRlbmQoIHRydWUsIHRoaXMsIG9wdGlvbnMgKTtcbn1cblxuQXBpQ2xpZW50LnByb3RvdHlwZSA9IHtcbiAgLyoqXG4gICAqINCU0L7QsdCw0LLQuNGC0Ywg0L3QvtCy0YvQuSDRgNC10YHRg9GA0YFcbiAgICogQHNlZSByZXNvdXJjZU1peGluLmFkZFxuICAgKi9cbiAgYWRkOiByZXNvdXJjZU1peGluLmFkZCxcblxuICBtZXRob2RzTWFwOiBtZXRob2RzTWFwLFxuXG4gIF9wcmVwYXJlQWpheFNldHRpbmdzOiBmdW5jdGlvbiggbWV0aG9kLCB1cmwsIGRhdGEsIGFqYXhTZXR0aW5ncyApe1xuICAgIHZhciBfYWpheFNldHRpbmdzID0gdXRpbHMuZGVlcE1lcmdlKCB0aGlzLmhvb2tzLCBhamF4U2V0dGluZ3MgKTtcblxuICAgIF9hamF4U2V0dGluZ3MudHlwZSA9IG1ldGhvZDtcbiAgICBfYWpheFNldHRpbmdzLnVybCA9IHVybDtcblxuICAgIC8vINCU0L7QsdCw0LLQu9GP0LXQvCDQsNCy0YLQvtGA0LjQt9Cw0YbQuNGOINC/0L4g0YLQvtC60LXQvdGDXG4gICAgaWYgKCB0aGlzLnRva2VuICYmIGFqYXhTZXR0aW5ncy5oZWFkZXJzICYmIGFqYXhTZXR0aW5ncy5oZWFkZXJzLnRva2VuID09IG51bGwgKXtcbiAgICAgIF9hamF4U2V0dGluZ3MuaGVhZGVycy5BdXRob3JpemF0aW9uID0gJ3Rva2VuICcgKyB0aGlzLnRva2VuO1xuICAgIH1cblxuICAgIGlmICggbWV0aG9kID09PSAnR0VUJyApe1xuICAgICAgX2FqYXhTZXR0aW5ncy5kYXRhID0gdXRpbHMuZGVlcE1lcmdlKCBfYWpheFNldHRpbmdzLmRhdGEsIGRhdGEgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8g0JXRgdC70Lgg0YHQvtGF0YDQsNC90Y/QtdC8INC00L7QutGD0LzQtdC90YIsINC90YPQttC90L4g0YHQtNC10LvQsNGC0YwgdG9PYmplY3Qoe2RlcG9wdWxhdGU6IDF9KVxuICAgICAgaWYgKCBkYXRhICYmIGRhdGEuY29uc3RydWN0b3IgJiYgZGF0YS5jb25zdHJ1Y3Rvci5uYW1lICYmIGRhdGEuY29uc3RydWN0b3IubmFtZSA9PT0gJ0RvY3VtZW50JyApe1xuICAgICAgICBfYWpheFNldHRpbmdzLmRhdGEgPSB1dGlscy5kZWVwTWVyZ2UoIF9hamF4U2V0dGluZ3MuZGF0YSwgZGF0YS50b09iamVjdCh7ZGVwb3B1bGF0ZTogMX0pICk7XG5cbiAgICAgIH0gZWxzZSBpZiAoIGRhdGEgKSB7XG4gICAgICAgIF9hamF4U2V0dGluZ3MuZGF0YSA9IHV0aWxzLmRlZXBNZXJnZSggX2FqYXhTZXR0aW5ncy5kYXRhLCBkYXRhICk7XG4gICAgICB9XG5cbiAgICAgIGlmICggX2FqYXhTZXR0aW5ncy5kYXRhICYmIF9hamF4U2V0dGluZ3MuY29udGVudFR5cGUgPT09ICdhcHBsaWNhdGlvbi9qc29uJyApe1xuICAgICAgICBfYWpheFNldHRpbmdzLmRhdGEgPSBKU09OLnN0cmluZ2lmeSggX2FqYXhTZXR0aW5ncy5kYXRhICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gdG9kbyDQv9GA0L7QstC10YDRgtGMINC90LDQtNC+0LHQvdC+0YHRgtGMINC60L7QtNCwXG4gICAgLy8g0JjRgdC/0L7Qu9GM0LfRg9C10YLRgdGPINC00LvRjyDQsNC70LjQsNGB0L7Qsiwg0LIg0LrQvtGC0L7RgNGL0YUg0LLRgtC+0YDQvtC5INC/0LDRgNCw0LzQtdGC0YAgLSDQtdGB0YLRjCDQvtCx0YrQtdC60YIg0L3QsNGB0YLRgNC+0LXQulxuICAgIGlmICggdXRpbHMuaXNPYmplY3QoIHVybCApICl7XG4gICAgICBjb25zb2xlLmluZm8oJ9CQ0YVAKtGC0YwsINC90YPQttC90YvQuSDQutC+0LQhISEhJyk7XG4gICAgICBfYWpheFNldHRpbmdzID0gdXJsO1xuICAgICAgZGVidWdnZXI7XG4gICAgfVxuXG4gICAgcmV0dXJuIF9hamF4U2V0dGluZ3M7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNlbmQgcmVxdWVzdCBvbiBzZXJ2ZXJcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IG1ldGhvZCDQndCw0LfQstCw0L3QuNC1INC80LXRgtC+0LTQsCAoUE9TVCwgR0VULCBQVVQsIERFTEVURSwgUEFUQ0gpXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwg0J/QvtC70L3Ri9C5INGD0YDQuyDRgNC10YHRg9GA0YHQsFxuICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSDQntCx0YrQtdC60YIg0YEg0LTQsNC90L3Ri9C80Lgg0LTQu9GPINC30LDQv9GA0L7RgdCwXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBhamF4U2V0dGluZ3Mg0J7QsdGK0LXQutGCINGBINC90LDRgdGC0YDQvtC50LrQsNC80LhcbiAgICogQHBhcmFtIHtib29sZWFufSB1c2VOb3RpZmljYXRpb25zINCk0LvQsNCzLCDQuNGB0L/QvtC70YzQt9C+0LLQsNGC0Ywg0LvQuCDRg9Cy0LXQtNC+0LzQu9C10L3QuNGPXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGRvbmUg0KTRg9C90LrRhtC40Y8g0YPRgdC/0LXRiNC90L7Qs9C+INC+0LHRgNCw0YLQvdC+0LPQviDQstGL0LfQvtCy0LBcbiAgICogQHJldHVybnMgeyQuRGVmZXJyZWR9INCy0L7Qt9Cy0YDQsNGJ0LDQtdGCIGpxdWVyeSBhamF4INC+0LHRitC10LrRglxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3JlcXVlc3Q6IGZ1bmN0aW9uKCBtZXRob2QsIHVybCwgZGF0YSwgYWpheFNldHRpbmdzLCB1c2VOb3RpZmljYXRpb25zLCBkb25lICl7XG4gICAgaWYgKCAhdXRpbHMuaXNTdHJpbmcoIG1ldGhvZCApICl7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ9Cf0LDRgNCw0LzQtdGC0YAgYG1ldGhvZGAg0LTQvtC70LbQtdC9INCx0YvRgtGMINGB0YLRgNC+0LrQvtC5LCDQsCDQvdC1ICcsIG1ldGhvZCApO1xuICAgIH1cblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbm90aWZpY2F0aW9uVHlwZSA9IG1ldGhvZCA9PT0gJ0dFVCcgPyAnbG9hZCcgOiAoIG1ldGhvZCA9PT0gJ1BPU1QnIHx8IG1ldGhvZCA9PT0gJ1BVVCcgfHwgbWV0aG9kID09PSAnUEFUQ0gnICkgPyAnc2F2ZScgOiAnZGVsZXRlJztcbiAgICB2YXIgX2FqYXhTZXR0aW5ncyA9IHRoaXMuX3ByZXBhcmVBamF4U2V0dGluZ3MoIG1ldGhvZCwgdXJsLCBkYXRhLCBhamF4U2V0dGluZ3MgKTtcblxuICAgIC8vINCY0YHQv9C+0LvRjNC30L7QstCw0YLRjCDQt9C90LDRh9C10L3QuNC1INC/0L4g0YPQvNC+0LvRh9Cw0L3QuNGOLCDQtdGB0LvQuCB1c2VOb3RpZmljYXRpb25zINC90LUg0LfQsNC00LDQvVxuICAgIC8vINGC0YPRgiDQttC1INC/0L7RgNCy0LXRgNGP0LXQvCwg0L/QvtC00LrQu9GO0YfQtdC90Ysg0LvQuCDRg9Cy0LXQtNC+0LzQu9C10L3QuNGPXG4gICAgaWYgKCB1dGlscy5pc0Jvb2xlYW4oIHVzZU5vdGlmaWNhdGlvbnMgKSApe1xuICAgICAgdXNlTm90aWZpY2F0aW9ucyA9IHVzZU5vdGlmaWNhdGlvbnMgJiYgY2Yubm90aWZpY2F0aW9uO1xuICAgIH0gZWxzZSB7XG4gICAgICB1c2VOb3RpZmljYXRpb25zID0gdGhpcy5ub3RpZmljYXRpb25zICYmIGNmLm5vdGlmaWNhdGlvbjtcbiAgICB9XG5cbiAgICBpZiAoIHVzZU5vdGlmaWNhdGlvbnMgKXtcbiAgICAgIGNmLm5vdGlmaWNhdGlvblsgbm90aWZpY2F0aW9uVHlwZSBdLnNob3coKTtcbiAgICB9XG5cbiAgICByZXR1cm4gJC5hamF4KCBfYWpheFNldHRpbmdzICkuZmFpbChmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICl7XG4gICAgICBjb25zb2xlLndhcm4oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApO1xuXG4gICAgICAvLyBVbmF1dGhvcml6ZWQgQ2FsbGJhY2tcbiAgICAgIGlmICgganFYSFIuc3RhdHVzID09PSA0MDEgJiYgc2VsZi51bmF1dGhvcml6ZWRDYWxsYmFjayApe1xuICAgICAgICBzZWxmLnVuYXV0aG9yaXplZENhbGxiYWNrKCBqcVhIUiwgbWV0aG9kLCB1cmwsIGRhdGEsIGFqYXhTZXR0aW5ncywgZG9uZSApO1xuXG4gICAgICAgIC8vINCd0LUg0L/QvtC60LDQt9GL0LLQsNGC0Ywg0YHQvtC+0LHRidC10L3QuNC1INGBINC+0YjQuNCx0LrQvtC5INC/0YDQuCA0MDEsINC10YHQu9C4INCy0YHRkSDQv9C70L7RhdC+LCDRgtC+INGA0L7Rg9GC0LXRgCDRgdCw0Lwg0L/QtdGA0LXQutC40L3QtdGCINC90LAg0YTQvtGA0LzRgyDQstGF0L7QtNCwXG4gICAgICAgIGlmICggdXNlTm90aWZpY2F0aW9ucyApe1xuICAgICAgICAgIGNmLm5vdGlmaWNhdGlvblsgbm90aWZpY2F0aW9uVHlwZSBdLmhpZGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKCB1c2VOb3RpZmljYXRpb25zICl7XG4gICAgICAgIGNmLm5vdGlmaWNhdGlvblsgbm90aWZpY2F0aW9uVHlwZSBdLmZhaWwoKTtcbiAgICAgIH1cblxuICAgIH0pLmRvbmUoZnVuY3Rpb24oKXtcbiAgICAgIGlmICggdXNlTm90aWZpY2F0aW9ucyApe1xuICAgICAgICBjZi5ub3RpZmljYXRpb25bIG5vdGlmaWNhdGlvblR5cGUgXS5oaWRlKCk7XG4gICAgICB9XG4gICAgfSkuZG9uZSggZG9uZSApO1xuICB9XG59O1xuXG4vKipcbiAqIE1ldGhvZCBmb3IgZ2V0IHJlcXVlc3QgdG8gYXBpIHJvb3RcbiAqXG4gKiBAcGFyYW0gYWpheFNldHRpbmdzXG4gKiBAcGFyYW0gZG9uZVxuICogQHJldHVybnMgeyQuRGVmZXJyZWR9XG4gKi9cbkFwaUNsaWVudC5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24oIGFqYXhTZXR0aW5ncywgZG9uZSApe1xuICBjb25zb2xlLmxvZyggJ2FwaTo6Z2V0JyApO1xuICBpZiAoIHV0aWxzLmlzRnVuY3Rpb24oIGFqYXhTZXR0aW5ncyApICl7XG4gICAgZG9uZSA9IGFqYXhTZXR0aW5ncztcbiAgICBhamF4U2V0dGluZ3MgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBhamF4U2V0dGluZ3MgPSBhamF4U2V0dGluZ3MgfHwge307XG5cbiAgcmV0dXJuIHRoaXMuX3JlcXVlc3QoJ3JlYWQnLCB0aGlzLnVybCwgdW5kZWZpbmVkLCBhamF4U2V0dGluZ3MsIGZhbHNlLCBkb25lICk7XG59O1xuLyoqXG4gKiBAYWxpYXMgQXBpQ2xpZW50LnByb3RvdHlwZS5nZXRcbiAqIEB0eXBlIHtGdW5jdGlvbn1cbiAqL1xuQXBpQ2xpZW50LnByb3RvdHlwZS5yZWFkID0gQXBpQ2xpZW50LnByb3RvdHlwZS5nZXQ7XG5cbkFwaUNsaWVudC52ZXJzaW9uID0gJzAuMy4wJztcblxuQXBpQ2xpZW50LnV0aWxzID0gdXRpbHM7XG5cbi8vIGV4cG9ydHNcbm1vZHVsZS5leHBvcnRzID0gQXBpQ2xpZW50OyIsIi8qKlxuICogVXNlcjogQ29uc3RhbnRpbmUgTWVsbmlrb3ZcbiAqIEVtYWlsOiBrYS5tZWxuaWtvdkBnbWFpbC5jb21cbiAqIERhdGU6IDI3LjAxLjE1XG4gKiBUaW1lOiAxNjoxNlxuICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHt9O1xuXG4vKiogYE9iamVjdCN0b1N0cmluZ2AgcmVzdWx0IHJlZmVyZW5jZXMuICovXG52YXIgYXJnc1RhZyA9ICdbb2JqZWN0IEFyZ3VtZW50c10nLFxuICAgIGFycmF5VGFnID0gJ1tvYmplY3QgQXJyYXldJyxcbiAgICBib29sVGFnID0gJ1tvYmplY3QgQm9vbGVhbl0nLFxuICAgIGRhdGVUYWcgPSAnW29iamVjdCBEYXRlXScsXG4gICAgZXJyb3JUYWcgPSAnW29iamVjdCBFcnJvcl0nLFxuICAgIGZ1bmNUYWcgPSAnW29iamVjdCBGdW5jdGlvbl0nLFxuICAgIG51bWJlclRhZyA9ICdbb2JqZWN0IE51bWJlcl0nLFxuICAgIG9iamVjdFRhZyA9ICdbb2JqZWN0IE9iamVjdF0nLFxuICAgIHJlZ2V4cFRhZyA9ICdbb2JqZWN0IFJlZ0V4cF0nLFxuICAgIHN0cmluZ1RhZyA9ICdbb2JqZWN0IFN0cmluZ10nO1xuXG4vKiogVXNlZCBmb3IgbmF0aXZlIG1ldGhvZCByZWZlcmVuY2VzLiAqL1xudmFyIGFycmF5UHJvdG8gPSBBcnJheS5wcm90b3R5cGU7XG52YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKipcbiAqIFVzZWQgdG8gcmVzb2x2ZSB0aGUgYHRvU3RyaW5nVGFnYCBvZiB2YWx1ZXMuXG4gKiBTZWUgdGhlIFtFUyBzcGVjXShodHRwczovL3Blb3BsZS5tb3ppbGxhLm9yZy9+am9yZW5kb3JmZi9lczYtZHJhZnQuaHRtbCNzZWMtb2JqZWN0LnByb3RvdHlwZS50b3N0cmluZylcbiAqIGZvciBtb3JlIGRldGFpbHMuXG4gKi9cbnZhciBvYmpUb1N0cmluZyA9IG9iamVjdFByb3RvLnRvU3RyaW5nO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0TGlrZSh2YWx1ZSkge1xuICByZXR1cm4gKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHx8IGZhbHNlO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGNsYXNzaWZpZWQgYXMgYSBgU3RyaW5nYCBwcmltaXRpdmUgb3Igb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgY29ycmVjdGx5IGNsYXNzaWZpZWQsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogdXRpbHMuaXNTdHJpbmcoJ2FiYycpO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIHV0aWxzLmlzU3RyaW5nKDEpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xudXRpbHMuaXNTdHJpbmcgPSBmdW5jdGlvbiBpc1N0cmluZyggdmFsdWUgKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnIHx8IChpc09iamVjdExpa2UodmFsdWUpICYmIG9ialRvU3RyaW5nLmNhbGwodmFsdWUpID09PSBzdHJpbmdUYWcpIHx8IGZhbHNlO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBjbGFzc2lmaWVkIGFzIGEgYm9vbGVhbiBwcmltaXRpdmUgb3Igb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgY29ycmVjdGx5IGNsYXNzaWZpZWQsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogdXRpbHMuaXNCb29sZWFuKGZhbHNlKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiB1dGlscy5pc0Jvb2xlYW4obnVsbCk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG51dGlscy5pc0Jvb2xlYW4gPSBmdW5jdGlvbiBpc0Jvb2xlYW4odmFsdWUpIHtcbiAgcmV0dXJuICh2YWx1ZSA9PT0gdHJ1ZSB8fCB2YWx1ZSA9PT0gZmFsc2UgfHwgaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBvYmpUb1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gYm9vbFRhZykgfHwgZmFsc2U7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIHRoZSBsYW5ndWFnZSB0eXBlIG9mIGBPYmplY3RgLlxuICogKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXG4gKlxuICogKipOb3RlOioqIFNlZSB0aGUgW0VTNSBzcGVjXShodHRwczovL2VzNS5naXRodWIuaW8vI3g4KSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gb2JqZWN0LCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIHV0aWxzLmlzT2JqZWN0KHt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiB1dGlscy5pc09iamVjdChbMSwgMiwgM10pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIHV0aWxzLmlzT2JqZWN0KDEpO1xuICogLy8gPT4gZmFsc2VcbiAqXG4gKiB1dGlscy5pc09iamVjdChmdW5jdGlvbigpe30pO1xuICogLy8gPT4gZmFsc2VcbiAqL1xudXRpbHMuaXNPYmplY3QgPSBmdW5jdGlvbiBpc09iamVjdCggdmFsdWUgKSB7XG4gIC8vIEF2b2lkIGEgVjggSklUIGJ1ZyBpbiBDaHJvbWUgMTktMjAuXG4gIC8vIFNlZSBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MjI5MSBmb3IgbW9yZSBkZXRhaWxzLlxuICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcbiAgcmV0dXJuICh2YWx1ZSAmJiB2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlID09PSAnb2JqZWN0JykgfHwgZmFsc2U7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGNsYXNzaWZpZWQgYXMgYSBgRnVuY3Rpb25gIG9iamVjdC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGNvcnJlY3RseSBjbGFzc2lmaWVkLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIHV0aWxzLmlzRnVuY3Rpb24oZnVuY3Rpb24oKXt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiB1dGlscy5pc0Z1bmN0aW9uKC9hYmMvKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbnV0aWxzLmlzRnVuY3Rpb24gPSBmdW5jdGlvbiBpc0Z1bmN0aW9uKHZhbHVlKSB7XG4gIC8vIEF2b2lkIGEgQ2hha3JhIEpJVCBidWcgaW4gY29tcGF0aWJpbGl0eSBtb2RlcyBvZiBJRSAxMS5cbiAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9qYXNoa2VuYXMvdW5kZXJzY29yZS9pc3N1ZXMvMTYyMSBmb3IgbW9yZSBkZXRhaWxzLlxuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nIHx8IGZhbHNlO1xufTtcblxuLy8gaHR0cHM6Ly9naXRodWIuY29tL25yZjExMC9kZWVwbWVyZ2Vcbi8qKlxuICogTWVyZ2UgdHdvIG9iamVjdHMgYHhgIGFuZCBgeWAgZGVlcGx5LCByZXR1cm5pbmcgYSBuZXcgbWVyZ2VkIG9iamVjdCB3aXRoIHRoZSBlbGVtZW50cyBmcm9tIGJvdGggYHhgIGFuZCBgeWAuXG4gKlxuICogSWYgYW4gZWxlbWVudCBhdCB0aGUgc2FtZSBrZXkgaXMgcHJlc2VudCBmb3IgYm90aCBgeGAgYW5kIGB5YCwgdGhlIHZhbHVlIGZyb20gYHlgIHdpbGwgYXBwZWFyIGluIHRoZSByZXN1bHQuXG4gKlxuICogVGhlIG1lcmdlIGlzIGltbXV0YWJsZSwgc28gbmVpdGhlciBgeGAgbm9yIGB5YCB3aWxsIGJlIG1vZGlmaWVkLlxuICpcbiAqIFRoZSBtZXJnZSB3aWxsIGFsc28gbWVyZ2UgYXJyYXlzIGFuZCBhcnJheSB2YWx1ZXMuXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogQHBhcmFtIHNyY1xuICogQHJldHVybnMge2Jvb2xlYW58QXJyYXl8e319XG4gKi9cbnV0aWxzLmRlZXBNZXJnZSA9IGZ1bmN0aW9uIGRlZXBNZXJnZSggdGFyZ2V0LCBzcmMgKXtcbiAgdmFyIGFycmF5ID0gQXJyYXkuaXNBcnJheShzcmMpO1xuICB2YXIgZHN0ID0gYXJyYXkgJiYgW10gfHwge307XG5cbiAgaWYgKGFycmF5KSB7XG4gICAgdGFyZ2V0ID0gdGFyZ2V0IHx8IFtdO1xuICAgIGRzdCA9IGRzdC5jb25jYXQodGFyZ2V0KTtcbiAgICBzcmMuZm9yRWFjaChmdW5jdGlvbihlLCBpKSB7XG4gICAgICBpZiAodHlwZW9mIGRzdFtpXSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgZHN0W2ldID0gZTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGRzdFtpXSA9IGRlZXBNZXJnZSh0YXJnZXRbaV0sIGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRhcmdldC5pbmRleE9mKGUpID09PSAtMSkge1xuICAgICAgICAgIGRzdC5wdXNoKGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKHRhcmdldCAmJiB0eXBlb2YgdGFyZ2V0ID09PSAnb2JqZWN0Jykge1xuICAgICAgT2JqZWN0LmtleXModGFyZ2V0KS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgZHN0W2tleV0gPSB0YXJnZXRba2V5XTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICggc3JjID09IG51bGwgKXtcbiAgICAgIHJldHVybiBkc3Q7XG4gICAgfVxuXG4gICAgT2JqZWN0LmtleXMoc3JjKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgIGlmICh0eXBlb2Ygc3JjW2tleV0gIT09ICdvYmplY3QnIHx8ICFzcmNba2V5XSkge1xuICAgICAgICBkc3Rba2V5XSA9IHNyY1trZXldO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGlmICghdGFyZ2V0W2tleV0pIHtcbiAgICAgICAgICBkc3Rba2V5XSA9IHNyY1trZXldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRzdFtrZXldID0gZGVlcE1lcmdlKHRhcmdldFtrZXldLCBzcmNba2V5XSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBkc3Q7XG59O1xuXG4vKipcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9haGVja21hbm4vbXF1ZXJ5L2Jsb2IvbWFzdGVyL2xpYi9tcXVlcnkuanNcbiAqIG1xdWVyeS5zZWxlY3RcbiAqXG4gKiBTcGVjaWZpZXMgd2hpY2ggZG9jdW1lbnQgZmllbGRzIHRvIGluY2x1ZGUgb3IgZXhjbHVkZVxuICpcbiAqICMjIyNTdHJpbmcgc3ludGF4XG4gKlxuICogV2hlbiBwYXNzaW5nIGEgc3RyaW5nLCBwcmVmaXhpbmcgYSBwYXRoIHdpdGggYC1gIHdpbGwgZmxhZyB0aGF0IHBhdGggYXMgZXhjbHVkZWQuXG4gKiBXaGVuIGEgcGF0aCBkb2VzIG5vdCBoYXZlIHRoZSBgLWAgcHJlZml4LCBpdCBpcyBpbmNsdWRlZC5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICAvLyBpbmNsdWRlIGEgYW5kIGIsIGV4Y2x1ZGUgY1xuICogICAgIHV0aWxzLnNlbGVjdCgnYSBiIC1jJyk7XG4gKlxuICogICAgIC8vIG9yIHlvdSBtYXkgdXNlIG9iamVjdCBub3RhdGlvbiwgdXNlZnVsIHdoZW5cbiAqICAgICAvLyB5b3UgaGF2ZSBrZXlzIGFscmVhZHkgcHJlZml4ZWQgd2l0aCBhIFwiLVwiXG4gKiAgICAgdXRpbHMuc2VsZWN0KHthOiAxLCBiOiAxLCBjOiAwfSk7XG4gKlxuICogQHBhcmFtIHtPYmplY3R8U3RyaW5nfSBzZWxlY3Rpb25cbiAqIEByZXR1cm4ge09iamVjdHx1bmRlZmluZWR9XG4gKiBAYXBpIHB1YmxpY1xuICovXG51dGlscy5zZWxlY3QgPSBmdW5jdGlvbiBzZWxlY3QoIHNlbGVjdGlvbiApe1xuICBpZiAoIXNlbGVjdGlvbikgcmV0dXJuO1xuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHNlbGVjdDogc2VsZWN0IG9ubHkgdGFrZXMgMSBhcmd1bWVudCcpO1xuICB9XG5cbiAgdmFyIGZpZWxkcyA9IHt9O1xuICB2YXIgdHlwZSA9IHR5cGVvZiBzZWxlY3Rpb247XG5cbiAgaWYgKCdzdHJpbmcnID09PSB0eXBlIHx8ICdvYmplY3QnID09PSB0eXBlICYmICdudW1iZXInID09PSB0eXBlb2Ygc2VsZWN0aW9uLmxlbmd0aCAmJiAhQXJyYXkuaXNBcnJheSggc2VsZWN0aW9uICkpIHtcbiAgICBpZiAoJ3N0cmluZycgPT09IHR5cGUpe1xuICAgICAgc2VsZWN0aW9uID0gc2VsZWN0aW9uLnNwbGl0KC9cXHMrLyk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHNlbGVjdGlvbi5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgdmFyIGZpZWxkID0gc2VsZWN0aW9uWyBpIF07XG4gICAgICBpZiAoICFmaWVsZCApIGNvbnRpbnVlO1xuICAgICAgdmFyIGluY2x1ZGUgPSAnLScgPT09IGZpZWxkWyAwIF0gPyAwIDogMTtcbiAgICAgIGlmIChpbmNsdWRlID09PSAwKSBmaWVsZCA9IGZpZWxkLnN1YnN0cmluZyggMSApO1xuICAgICAgZmllbGRzWyBmaWVsZCBdID0gaW5jbHVkZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmllbGRzO1xuICB9XG5cbiAgaWYgKCB1dGlscy5pc09iamVjdCggc2VsZWN0aW9uICkgJiYgIUFycmF5LmlzQXJyYXkoIHNlbGVjdGlvbiApKSB7XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyggc2VsZWN0aW9uICk7XG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBrZXlzLmxlbmd0aDsgKytqKSB7XG4gICAgICBmaWVsZHNbIGtleXNbIGogXSBdID0gc2VsZWN0aW9uWyBrZXlzWyBqIF0gXTtcbiAgICB9XG4gICAgcmV0dXJuIGZpZWxkcztcbiAgfVxuXG4gIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgc2VsZWN0KCkgYXJndW1lbnQuIE11c3QgYmUgc3RyaW5nIG9yIG9iamVjdC4nKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gdXRpbHM7XG4iXX0=
(1)
});
