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
  constructUrl: function constructUrl( recursionCall ){
    // todo: проверить надобность закомментированного кода
    // trailingSlash - он иногда нужен, сделать конфиг
    // условие с recursionCall добавляет слэш в урл перед знаком вопроса
    //var identity = this.identity ? '/' + this.identity : recursionCall ? '' : '/';
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
  if ( data instanceof storage.Document ) {
    documentIdString = data._id.toString();
    data = data.$__delta();

  // Так можно понять, что мы сохраняем сущетвующий на сервере Document
  } else if ( storage.ObjectId.isValid( identity ) ) {
    documentIdString = identity;

  // При сохранении через метод save() у документа
  } else if ( data._id && storage.ObjectId.isValid( data._id ) ) {
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
  if ( data instanceof storage.Document ) {
    documentIdString = data._id.toString();
    data = data.$__delta();

    // Так можно понять, что мы сохраняем сущетвующий на сервере Document
  } else if ( storage.ObjectId.isValid( identity ) ) {
    documentIdString = identity;

    // При сохранении через метод save() у документа
  } else if ( data._id && storage.ObjectId.isValid( data._id ) ) {
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
  if ( data instanceof storage.Document ) {
    documentIdString = data._id.toString();
    data = data.$__delta();

    // Так можно понять, что мы сохраняем сущетвующий на сервере Document
  } else if ( storage.ObjectId.isValid( identity ) ) {
    documentIdString = identity;

    // При сохранении через метод save() у документа
  } else if ( data._id && storage.ObjectId.isValid( data._id ) ) {
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
    var type = this.methodsMap[ method ];
    var _ajaxSettings = utils.deepMerge( this.hooks, ajaxSettings );

    _ajaxSettings.type = type;
    _ajaxSettings.url = url;

    // Добавляем авторизацию по токену
    if ( this.token && ajaxSettings.headers && ajaxSettings.headers.token == null ){
      _ajaxSettings.headers.Authorization = 'token ' + this.token;
    }

    if ( type === 'GET' ){
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

    var self = this
      , type = this.methodsMap[ method ]
      , notificationType = type === 'GET' ? 'load' : ( type === 'POST' || type === 'PUT' || type === 'PATCH' ) ? 'save' : 'delete'
      , _ajaxSettings = this._prepareAjaxSettings( method, url, data, ajaxSettings );

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9yZXN0LWFwaS1jbGllbnQvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3Jlc3QtYXBpLWNsaWVudC9zcmMvZmFrZV82Y2Q4YzYyNS5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9yZXN0LWFwaS1jbGllbnQvc3JjL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbndCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBBUEkgQ2xpZW50XG4vLyAtLS0tLS0tLS0tLS0tLS1cblxuLy8gRXhhbXBsZVxuLypcbiB2YXIgZ2l0aHViID0gQXBpQ2xpZW50KCdodHRwczovL2FwaS5naXRodWIuY29tJywge1xuICAgaG9va3M6IHtcbiAgICAgaGVhZGVyczoge1xuICAgICAgIEFjY2VwdDogJ2FwcGxpY2F0aW9uL3ZuZC5naXRodWIudjMranNvbicsXG4gICAgICAgQXV0aG9yaXphdGlvbjogJ3Rva2VuIDhmYmZjNTQwZjFlZDE0MTcwODNjNzBhOTkwYjRkYjNjOWFhODZlZmUnXG4gICAgIH1cbiAgIH1cbiB9KTtcblxuIGdpdGh1Yi5hZGQoJ3NlYXJjaCcsIHtcbiAgc2VhcmNoTWV0aG9kOiBmdW5jdGlvbigpe1xuICAgIGNvbnNvbGUubG9nKCAnc2VhcmNoOjpzZWFyY2hNZXRob2QnICk7XG4gIH1cbiB9KTtcbiBnaXRodWIuc2VhcmNoLmFkZCgndXNlcnMnLCB7XG4gIHVzZXJzTWV0aG9kOiBmdW5jdGlvbigpe1xuICAgIHRoaXMucGFyZW50LnNlYXJjaE1ldGhvZCgpO1xuICB9XG4gfSk7XG5cbiAvLyDQlNC+0LHQsNCy0LvRj9C10Lwg0YDQtdGB0YPRgNGB0YtcbiBnaXRodWIuYWRkKCd1c2VyJyk7XG4gZ2l0aHViLmFkZCgndXNlcnMnKTtcbiBnaXRodWIudXNlcnMuYWRkKCdyZXBvcycpO1xuXG4gLy8g0J/RgNC+0YfQuNGC0LDRgtGMINGA0LXQv9C+0LfQuNGC0L7RgNC40LggKNC+0YLQv9GA0LDQstC40YLRjCDQs9C10YIg0LfQsNC/0YDQvtGBINC90LAgaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS91c2Vycy9yZXBvcy8pXG4gZ2l0aHViLnVzZXJzLnJlcG9zLnJlYWQoKTtcblxuIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuIC8vINCd0LUg0YHQvtCy0YHQtdC8IFJFU1QsINCy0YHQtSDQt9Cw0L/RgNC+0YHRiyDQuNC00YPRgiDQvdCwINC+0LTQuNC9INCw0LTRgNC10YFcbiB2YXIgc2ltcGxlQXBpID0gQXBpQ2xpZW50KCdhcGkuZXhhbXBsZS5jb20nLCB7fSk7XG5cbiBzaW1wbGVBcGkoKS5yZWFkKHtcbiAgZTogJy9CYXNlL0RlcGFydG1lbnQnXG4gfSk7XG5cbiBzaW1wbGVBcGkucG9zdCh7IGRhdGEgfSk7XG4gc2ltcGxlQXBpKCdpZGVudGl0eScpLnBvc3QoeyBkYXRhIH0sIHsgYWpheFNldHRpbmdzIH0pO1xuIHNpbXBsZUFwaSgnaWRlbnRpdHknKS5wb3N0KCBudWxsLCB7IGFqYXhTZXR0aW5ncyB9KTtcbiBzaW1wbGVBcGkucG9zdCh7IGRhdGEgfSwgeyBhamF4U2V0dGluZ3MgfSk7XG4gc2ltcGxlQXBpLnBvc3QoIG51bGwsIHsgYWpheFNldHRpbmdzIH0pO1xuXG4gc2ltcGxlQXBpLnJlYWQoIGRvbmUgKS5kb25lKCBkb25lICkuZmFpbCggZmFpbCApO1xuXG4g0KDQsNCx0L7RgtCwINGBINC00L7QutGD0LzQtdC90YLQsNC80LggKHN0b3JhZ2UpLCDQvtC9INGB0LDQvCDQv9GA0LXQvtCx0YDQsNC30YPQtdGC0YHRjyDRh9C10YDQtdC3INC80LXRgtC+0LQgJF9fZGVsdGEoKVxuIHNpbXBsZUFwaS5wb3N0KCBEb2N1bWVudCApO1xuIHNpbXBsZUFwaS5zYXZlKCBEb2N1bWVudCApO1xuXG5cbiAvLyDQpNC40YfQuFxuIGFqYXhTZXR0aW5ncyDQtNC70Y8g0LrQsNC20LTQvtCz0L4g0LfQsNC/0YDQvtGB0LBcbiBJZGVudGl0eSDQtNC70Y8g0LrQsNC20LTQvtCz0L4g0LfQsNC/0YDQvtGB0LBcblxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgcmVzb3VyY2VNaXhpbiA9IHtcbiAgcmVzb3VyY2VOYW1lOiAncmVzb3VyY2UnLFxuICB1cmw6ICcnLCAvLyA9IHJlc291cmNlTmFtZVxuXG4gIC8qKlxuICAgKiDQlNC+0LHQsNCy0LjRgtGMINC90L7QstGL0Lkg0YDQtdGB0YPRgNGBXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSByZXNvdXJjZU5hbWVcbiAgICogQHBhcmFtIHtvYmplY3R9IFtwYXJlbnRSZXNvdXJjZV0gLSDRgNC+0LTQuNGC0LXQu9GM0YHQutC40Lkg0YDQtdGB0YPRgNGBXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbdXNlcnNNaXhpbl0gLSDQv9C+0LvRjNC30L7QstCw0YLQtdC70YzRgdC60LDRjyDQv9GA0LjQvNC10YHRjFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGFkZDogZnVuY3Rpb24oIHJlc291cmNlTmFtZSwgcGFyZW50UmVzb3VyY2UsIHVzZXJzTWl4aW4gKXtcbiAgICBpZiAoICF1c2Vyc01peGluICkge1xuICAgICAgdXNlcnNNaXhpbiA9IHBhcmVudFJlc291cmNlIHx8IHt9O1xuICAgICAgcGFyZW50UmVzb3VyY2UgPSB0aGlzO1xuICAgIH1cblxuICAgIC8vINCR0YDQvtGB0LjRgtGMINC40YHQutC70Y7Rh9C10L3QuNC1LCDQtdGB0LvQuCDRgtCw0LrQvtC5INGA0LXRgdGD0YDRgSDRg9C20LUg0LXRgdGC0YxcbiAgICBpZiAoIHRoaXNbIHJlc291cmNlTmFtZSBdICl7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgcmVzb3VyY2UgbmFtZWQgJyArIHJlc291cmNlTmFtZSArICdhbHJlYWR5IGV4aXN0cy4nKTtcbiAgICB9XG5cbiAgICAvLyDQm9GO0LHQvtC5INC40Lcg0Y3RgtC40YUg0L/QsNGA0LDQvNC10YLRgNC+0LIg0YPQutCw0LfRi9Cy0LDQtdGCINC90LAg0L3QtdC+0LHRhdC+0LTQuNC80L7RgdGC0Ywg0LjRgdC/0L7Qu9GM0LfQvtCy0LDRgtGMINGF0YDQsNC90LjQu9C40YnQtVxuICAgIGlmICggdXNlcnNNaXhpbi5zY2hlbWFOYW1lIHx8IHVzZXJzTWl4aW4uY29sbGVjdGlvbk5hbWUgfHwgdXNlcnNNaXhpbi5zdG9yYWdlICkge1xuICAgICAgLy8g0J7Qv9GA0LXQtNC10LvQuNC8INC90LDQt9Cy0LDQvdC40LUg0YHQvtC30LTQsNCy0LDQtdC80L7QuSDQutC+0LvQu9C10LrRhtC40LhcbiAgICAgIHVzZXJzTWl4aW4uY29sbGVjdGlvbk5hbWUgPSB1c2Vyc01peGluLmNvbGxlY3Rpb25OYW1lIHx8IHJlc291cmNlTmFtZTtcbiAgICB9XG5cbiAgICAvLyDQn9C10YDQtdC0INGB0L7Qt9C00LDQvdC40LXQvCDQutC+0LvQu9C10LrRhtC40Lgg0L3Rg9C20L3QviDRgdC+0LfQtNCw0YLRjCDRgNC10YHRg9GA0YEsINGH0YLQvtCx0Ysg0YMg0LrQvtC70LvQtdC60YbQuNC4INCx0YvQu9CwINGB0YHRi9C70LrQsCDQvdCwINC90LXQs9C+XG4gICAgdGhpc1sgcmVzb3VyY2VOYW1lIF0gPSBuZXcgUmVzb3VyY2UoIHJlc291cmNlTmFtZSwgcGFyZW50UmVzb3VyY2UsIHVzZXJzTWl4aW4gKTtcblxuICAgIC8vINCh0L7Qt9C00LDRgtGMINC60L7Qu9C70LXQutGG0LjRjiwg0LXRgdC70Lgg0Y3RgtC+0LPQviDQtdGJ0LUg0L3QtSDRgdC00LXQu9Cw0LvQuFxuICAgIGlmICggdXNlcnNNaXhpbi5jb2xsZWN0aW9uTmFtZSAmJiAhc3RvcmFnZVsgdXNlcnNNaXhpbi5jb2xsZWN0aW9uTmFtZSBdICl7XG4gICAgICAvLyDQmNGJ0LXQvCDRgdGF0LXQvNGDLCDQtdGB0LvQuCDQvtC90LAg0YPQutCw0LfQsNC90LBcbiAgICAgIHZhciBzY2hlbWEgPSBzdG9yYWdlLnNjaGVtYXNbIHVzZXJzTWl4aW4uc2NoZW1hTmFtZSBdO1xuXG4gICAgICBpZiAoIHNjaGVtYSApe1xuICAgICAgICBzdG9yYWdlLmNyZWF0ZUNvbGxlY3Rpb24oIHVzZXJzTWl4aW4uY29sbGVjdGlvbk5hbWUsIHNjaGVtYSwgdGhpc1sgcmVzb3VyY2VOYW1lIF0gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Jlc291cmNlOjonICsgcmVzb3VyY2VOYW1lICsgJyBZb3UgY2Fubm90IHVzZSBzdG9yYWdlIChjcmVhdGUgY29sbGVjdGlvbiksIHdpdGhvdXQgc3BlY2lmeWluZyB0aGUgc2NoZW1hIG9mIHRoZSBkYXRhLicpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzWyByZXNvdXJjZU5hbWUgXTtcbiAgfSxcblxuICAvLyDQn9GA0L7QsdC10LbQsNGC0YzRgdGPINC/0L4g0LLRgdC10Lwg0YDQvtC00LjRgtC10LvRjNGB0LrQuNC8INGA0LXRgdGD0YDRgdCw0Lwg0Lgg0YHQvtCx0YDQsNGC0YwgdXJsICjQsdC10LcgcXVlcnkgc3RyaW5nKVxuICBjb25zdHJ1Y3RVcmw6IGZ1bmN0aW9uIGNvbnN0cnVjdFVybCggcmVjdXJzaW9uQ2FsbCApe1xuICAgIC8vIHRvZG86INC/0YDQvtCy0LXRgNC40YLRjCDQvdCw0LTQvtCx0L3QvtGB0YLRjCDQt9Cw0LrQvtC80LzQtdC90YLQuNGA0L7QstCw0L3QvdC+0LPQviDQutC+0LTQsFxuICAgIC8vIHRyYWlsaW5nU2xhc2ggLSDQvtC9INC40L3QvtCz0LTQsCDQvdGD0LbQtdC9LCDRgdC00LXQu9Cw0YLRjCDQutC+0L3RhNC40LNcbiAgICAvLyDRg9GB0LvQvtCy0LjQtSDRgSByZWN1cnNpb25DYWxsINC00L7QsdCw0LLQu9GP0LXRgiDRgdC70Y3RiCDQsiDRg9GA0Lsg0L/QtdGA0LXQtCDQt9C90LDQutC+0Lwg0LLQvtC/0YDQvtGB0LBcbiAgICAvL3ZhciBpZGVudGl0eSA9IHRoaXMuaWRlbnRpdHkgPyAnLycgKyB0aGlzLmlkZW50aXR5IDogcmVjdXJzaW9uQ2FsbCA/ICcnIDogJy8nO1xuICAgIHZhciBpZGVudGl0eSA9IHRoaXMuaWRlbnRpdHkgPyAnLycgKyB0aGlzLmlkZW50aXR5IDogJyc7XG5cbiAgICAvLyDQn9GA0L7QsdC10LbQsNGC0YzRgdGPINC/0L4g0LLRgdC10Lwg0YDQtdGB0YPRgNGB0LDQvCDQuCDQt9Cw0LPQu9GP0L3Rg9GC0Ywg0LIg0LrQvtGA0LXQvdGMINCw0L/QuCwg0YfRgtC+0LHRiyDRgdC+0LHRgNCw0YLRjCB1cmxcbiAgICByZXR1cm4gdGhpcy5wYXJlbnRSZXNvdXJjZVxuICAgICAgPyBjb25zdHJ1Y3RVcmwuY2FsbCggdGhpcy5wYXJlbnRSZXNvdXJjZSwgdHJ1ZSApICsgJy8nICsgdGhpcy51cmwgKyBpZGVudGl0eVxuICAgICAgOiB0aGlzLnVybDtcbiAgfSxcblxuICBfcmVzb3VyY2VSZXF1ZXN0OiBmdW5jdGlvbiggbWV0aG9kLCBhamF4U2V0dGluZ3MsIGRvbmUgKXtcbiAgICB2YXIgdXJsID0gdGhpcy5jb25zdHJ1Y3RVcmwoKVxuICAgICAgLCB1c2VOb3RpZmljYXRpb25zID0gdGhpcy5ub3RpZmljYXRpb25zO1xuXG4gICAgY29uc29sZS5sb2coIHRoaXMucmVzb3VyY2VOYW1lICsgJzo6JyArIG1ldGhvZCArICcgJyArIHVybCApO1xuICAgIHJldHVybiB0aGlzLmluc3RhbmNlLl9yZXF1ZXN0KCBtZXRob2QsIHVybCwgYWpheFNldHRpbmdzLmRhdGEsIGFqYXhTZXR0aW5ncywgdXNlTm90aWZpY2F0aW9ucywgZG9uZSApO1xuICB9XG59O1xuXG52YXIgcmVxdWVzdHNUYWJsZSA9IFtdO1xuXG52YXIgbWV0aG9kc01hcCA9IHtcbiAgJ2NyZWF0ZSc6ICdQT1NUJyxcbiAgJ3JlYWQnOiAgICdHRVQnLFxuICAndXBkYXRlJzogJ1BVVCcsXG4gICdkZWxldGUnOiAnREVMRVRFJyxcbiAgJ3BhdGNoJzogICdQQVRDSCcsXG5cbiAgJ3Bvc3QnOiAgICdQT1NUJyxcbiAgJ2dldCc6ICAgICdHRVQnLFxuICAnc2F2ZSc6ICAgJ1BVVCdcbn07XG5cbi8qKlxuICog0JfQsNC/0YDQvtGB0YsgY3JlYXRlIHJlYWQgdXBkYXRlIGRlbGV0ZSBwYXRjaCBnZXQgcG9zdFxuICpcbiAqINCSIGFqYXhTZXR0aW5ncyDQvNC+0LbQvdC+INGD0LrQsNC30LDRgtGMINC/0L7Qu9C1IGRvTm90U3RvcmUgLSDRh9GC0L7QsdGLINC90LUg0YHQvtGF0YDQsNC90Y/RgtGMINC/0L7Qu9GD0YfQtdC90L3Ri9C5INC+0LHRitC10LrRgiDQsiBzdG9yYWdlXG4gKlxuICogQHBhcmFtIFtkYXRhXVxuICogQHBhcmFtIFthamF4U2V0dGluZ3NdXG4gKiBAcGFyYW0gW2RvbmVdXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xucmVzb3VyY2VNaXhpbi5nZXQgPSBmdW5jdGlvbiggZGF0YSwgYWpheFNldHRpbmdzLCBkb25lICl7XG4gIHZhciByZXNvdXJjZSA9IHRoaXM7XG4gIHZhciBpZGVudGl0eSA9IHRoaXMuaWRlbnRpdHk7XG4gIHZhciBtZXRob2QgPSAnR0VUJztcblxuICAvLyDQldGB0LvQuCBkYXRhIC0g0LXRgdGC0Ywg0YTRg9C90LrRhtC40Y8sINGC0L4g0Y3RgtC+IGRvbmVcbiAgaWYgKCB1dGlscy5pc0Z1bmN0aW9uKCBkYXRhICkgKXtcbiAgICBkb25lID0gZGF0YTtcbiAgICBkYXRhID0gdW5kZWZpbmVkO1xuICB9XG4gIGlmICggdXRpbHMuaXNGdW5jdGlvbiggYWpheFNldHRpbmdzICkgKXtcbiAgICBkb25lID0gYWpheFNldHRpbmdzO1xuICAgIGFqYXhTZXR0aW5ncyA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGFqYXhTZXR0aW5ncyA9IGFqYXhTZXR0aW5ncyB8fCB7fTtcbiAgYWpheFNldHRpbmdzLmRhdGEgPSBkYXRhO1xuXG4gIHZhciByZXFJbmZvID0ge1xuICAgIG1ldGhvZDogbWV0aG9kLFxuICAgIHVybDogdGhpcy5jb25zdHJ1Y3RVcmwoKSxcbiAgICBhamF4U2V0dGluZ3M6IGFqYXhTZXR0aW5ncyxcbiAgICByZXN1bHQ6IG51bGwsXG4gICAgbWV0YTogbnVsbFxuICB9O1xuXG4gIC8vVE9ETzog0LTQvtC00LXQu9Cw0YLRjCDQutGN0YjQuNGA0L7QstCw0L3QuNC1XG4gIC8vINCa0Y3RiNC40YDQvtCy0LDQvdC40LUg0L3QsCDRh9GC0LXQvdC40LVcbiAgaWYgKCBtZXRob2QgPT09ICdHRVQnICl7XG4gICAgdmFyIGluQ2FjaGUgPSBfLmZpbmQoIHJlcXVlc3RzVGFibGUsIHJlcUluZm8gKTtcblxuICAgIGlmICggcmVzb3VyY2Uuc3RvcmFnZSAmJiBpZGVudGl0eSAmJiBpbkNhY2hlICl7XG4gICAgICAvLyDQldGB0LvQuCDQtNCw0L3QvdC+0LUg0LXRgdGC0YwgLSDQstC10YDQvdGD0YLRjCDQtdCz0L5cbiAgICAgIGlmICggaW5DYWNoZS5yZXN1bHQgKXtcbiAgICAgICAgZG9uZSAmJiBkb25lKCBpbkNhY2hlLnJlc3VsdCwgaW5DYWNoZS5tZXRhICk7XG4gICAgICAgIGNsZWFySWRlbnRpdHkoIHJlc291cmNlICk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICB2YXIgZGZkID0gJC5EZWZlcnJlZCgpO1xuICB0aGlzLl9yZXNvdXJjZVJlcXVlc3QoIG1ldGhvZCwgYWpheFNldHRpbmdzICkuZG9uZShmdW5jdGlvbiggcmVzcG9uc2UsIHRleHRTdGF0dXMsIGpxWEhSICl7XG4gICAgdmFyIHJlc3VsdCwgZmllbGRzO1xuXG4gICAgLy8gI2V4YW1wbGVcbiAgICAvLyBhcGkucGxhY2VzKHsgZmllbGRzOiAnbmFtZScsIHNraXA6IDEwMCB9KTtcbiAgICAvLyDQldGB0LvQuCDQsdGL0LvQsCDQstGL0LHQvtGA0LrQsCDQv9C+INC/0L7Qu9GP0LwsINC90YPQttC90L4g0L/RgNCw0LLQuNC70YzQvdC+INC+0LHRgNCw0LHQvtGC0LDRgtGMINC10ZEg0Lgg0L/QtdGA0LXQtNCw0YLRjCDQsiDQtNC+0LrRg9C80LXQvdGCXG4gICAgaWYgKCBkYXRhICYmIGRhdGEuZmllbGRzICl7XG4gICAgICBmaWVsZHMgPSB1dGlscy5zZWxlY3QoIGRhdGEuZmllbGRzICk7XG4gICAgfVxuXG4gICAgLy8g0JXRgdGC0Ywg0L7RgtCy0LXRgiDQvdCw0LTQviDRgdC+0YXRgNCw0L3QuNGC0Ywg0LIg0YXRgNCw0L3QuNC70LjRidC1XG4gICAgaWYgKCByZXNvdXJjZS5zdG9yYWdlICYmICFhamF4U2V0dGluZ3MuZG9Ob3RTdG9yZSApe1xuICAgICAgLy8g0J3QtSDQtNC+0LHQsNCy0LvRj9GC0Ywg0LIg0YXRgNCw0L3QuNC70LjRidC1INGA0LXQt9GD0LvRjNGC0LDRgiDQt9Cw0L/RgNC+0YHQvtCyINGBINCy0YvQsdC+0YDQutC+0Lkg0L/QvtC70LXQuVxuICAgICAgaWYgKCBmaWVsZHMgKXtcbiAgICAgICAgcmVzdWx0ID0gcmVzcG9uc2UucmVzdWx0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0ID0gc3RvcmFnZVsgcmVzb3VyY2UuY29sbGVjdGlvbk5hbWUgXS5hZGQoIHJlc3BvbnNlLnJlc3VsdCB8fCByZXNwb25zZSwgZmllbGRzLCB0cnVlICk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdCA9IHJlc3BvbnNlLnJlc3VsdCB8fCByZXNwb25zZTtcbiAgICB9XG5cbiAgICAvLyDQodC+0YXRgNCw0L3QuNGC0Ywg0L/QsNGA0LDQvNC10YLRgNGLINC30LDQv9GA0L7RgdCwINC4INC+0YLQstC10YIg0LTQu9GPINC60Y3RiNC40YDQvtCy0LDQvdC40Y9cbiAgICByZXFJbmZvLnJlc3VsdCA9IHJlc3VsdDtcbiAgICByZXFJbmZvLm1ldGEgPSByZXNwb25zZS5tZXRhO1xuICAgIHJlcXVlc3RzVGFibGUucHVzaCggcmVxSW5mbyApO1xuXG4gICAgZG9uZSAmJiBkb25lKCByZXN1bHQsIHJlc3BvbnNlLm1ldGEgKTtcbiAgICBkZmQucmVzb2x2ZSggcmVzdWx0LCByZXNwb25zZS5tZXRhLCB0ZXh0U3RhdHVzLCBqcVhIUiApO1xuXG4gIH0pLmZhaWwoZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApe1xuICAgIGRmZC5yZWplY3QoIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApO1xuICB9KTtcblxuICAvL1RPRE86INCY0YHQv9C+0LvRjNC30L7QstCw0YLRjCDQuNC00LXQvtC70L7Qs9GOIHF1ZXJ5PyBxdWVyeSDQvtCx0YrQtdC60YIg0LTQu9GPINC/0L7RgdGC0YDQvtC10L3QuNGPINC30LDQv9GA0L7RgdC+0LJcblxuICAvLyBpZGVudGl0eSDRgdC+0YXRgNCw0L3Rj9C10YLRgdGPINC00LvRjyBjb25zdHJ1Y3RVcmwsINC10LPQviDQvdGD0LbQvdC+INC+0YfQuNGB0YLQuNGC0Ywg0LTQu9GPINC/0L7RgdC70LXQtNGD0Y7RidC40YUg0LfQsNC/0YDQvtGB0L7Qsi5cbiAgY2xlYXJJZGVudGl0eSggcmVzb3VyY2UgKTtcblxuICByZXR1cm4gZGZkO1xufTtcbnJlc291cmNlTWl4aW4ucmVhZCA9IHJlc291cmNlTWl4aW4uZ2V0O1xuXG5yZXNvdXJjZU1peGluLnBvc3QgPSBmdW5jdGlvbiggZGF0YSwgYWpheFNldHRpbmdzLCBkb25lICl7XG4gIHZhciByZXNvdXJjZSA9IHRoaXM7XG4gIHZhciBpZGVudGl0eSA9IHRoaXMuaWRlbnRpdHk7XG4gIHZhciBtZXRob2QgPSAnUE9TVCc7XG4gIHZhciBkb2N1bWVudElkU3RyaW5nO1xuXG4gIC8vINCV0YHQu9C4IGRhdGEgLSDQtdGB0YLRjCDRhNGD0L3QutGG0LjRjywg0YLQviDRjdGC0L4gZG9uZVxuICBpZiAoIHV0aWxzLmlzRnVuY3Rpb24oIGRhdGEgKSApe1xuICAgIGRvbmUgPSBkYXRhO1xuICAgIGRhdGEgPSB1bmRlZmluZWQ7XG4gIH1cbiAgaWYgKCB1dGlscy5pc0Z1bmN0aW9uKCBhamF4U2V0dGluZ3MgKSApe1xuICAgIGRvbmUgPSBhamF4U2V0dGluZ3M7XG4gICAgYWpheFNldHRpbmdzID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgYWpheFNldHRpbmdzID0gYWpheFNldHRpbmdzIHx8IHt9O1xuXG4gIC8vINCf0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuCDQtNC+0LrRg9C80LXQvdGC0LAg0L3Rg9C20L3QviDRgdC+0YXRgNCw0L3Rj9GC0Ywg0YLQvtC70YzQutC+INC40LfQvNC10L3RkdC90L3Ri9C1INC/0L7Qu9GPXG4gIC8vINCY0L3QvtCz0LTQsCDQv9C10YDQtdC00LDRjtGCINC00L7QutGD0LzQtdC90YJcbiAgaWYgKCBkYXRhIGluc3RhbmNlb2Ygc3RvcmFnZS5Eb2N1bWVudCApIHtcbiAgICBkb2N1bWVudElkU3RyaW5nID0gZGF0YS5faWQudG9TdHJpbmcoKTtcbiAgICBkYXRhID0gZGF0YS4kX19kZWx0YSgpO1xuXG4gIC8vINCi0LDQuiDQvNC+0LbQvdC+INC/0L7QvdGP0YLRjCwg0YfRgtC+INC80Ysg0YHQvtGF0YDQsNC90Y/QtdC8INGB0YPRidC10YLQstGD0Y7RidC40Lkg0L3QsCDRgdC10YDQstC10YDQtSBEb2N1bWVudFxuICB9IGVsc2UgaWYgKCBzdG9yYWdlLk9iamVjdElkLmlzVmFsaWQoIGlkZW50aXR5ICkgKSB7XG4gICAgZG9jdW1lbnRJZFN0cmluZyA9IGlkZW50aXR5O1xuXG4gIC8vINCf0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuCDRh9C10YDQtdC3INC80LXRgtC+0LQgc2F2ZSgpINGDINC00L7QutGD0LzQtdC90YLQsFxuICB9IGVsc2UgaWYgKCBkYXRhLl9pZCAmJiBzdG9yYWdlLk9iamVjdElkLmlzVmFsaWQoIGRhdGEuX2lkICkgKSB7XG4gICAgZG9jdW1lbnRJZFN0cmluZyA9IGRhdGEuX2lkLnRvU3RyaW5nKCk7XG4gIH1cblxuICBhamF4U2V0dGluZ3MuZGF0YSA9IGRhdGE7XG5cbiAgdmFyIGRmZCA9ICQuRGVmZXJyZWQoKTtcbiAgdGhpcy5fcmVzb3VyY2VSZXF1ZXN0KCBtZXRob2QsIGFqYXhTZXR0aW5ncyApLmRvbmUoZnVuY3Rpb24oIHJlc3BvbnNlLCB0ZXh0U3RhdHVzLCBqcVhIUiApe1xuICAgIHZhciByZXN1bHQ7XG5cbiAgICAvLyDQldGB0YLRjCDQvtGC0LLQtdGCINC90LDQtNC+INGB0L7RhdGA0LDQvdC40YLRjCDQsiDRhdGA0LDQvdC40LvQuNGJ0LVcbiAgICBpZiAoIHJlc291cmNlLnN0b3JhZ2UgJiYgIWFqYXhTZXR0aW5ncy5kb05vdFN0b3JlICl7XG4gICAgICAvLyDQn9GA0Lgg0YHQvtGF0YDQsNC90LXQvdC40Lgg0L3Rg9C20L3QviDQvtCx0L3QvtCy0LvRj9GC0Ywg0LTQvtC60YPQvNC10L3RglxuICAgICAgLy8g0J/QvtC/0YDQvtCx0YPQtdC8INGB0L3QsNGH0LDQu9CwINC90LDQudGC0Lgg0LTQvtC60YPQvNC10L3RgiDQv9C+IGlkINC4INC+0LHQvdC+0LLQuNGC0Ywg0LXQs9C+XG4gICAgICByZXN1bHQgPSBzdG9yYWdlWyByZXNvdXJjZS5jb2xsZWN0aW9uTmFtZSBdLmZpbmRCeUlkKCBkb2N1bWVudElkU3RyaW5nICk7XG5cbiAgICAgIGlmICggcmVzdWx0ICl7XG4gICAgICAgIC8vINCe0LHQvdC+0LLQu9GP0LXQvCDQtNC+0LrRg9C80LXQvdGCXG4gICAgICAgIHJlc3VsdC5zZXQoIHJlc3BvbnNlLnJlc3VsdCApO1xuXG4gICAgICAgIC8vINCh0L7Qt9C00LDRkdC8INGB0YHRi9C70LrRgyDQv9C+INC90L7QstC+0LzRgyBpZCDQsiDQutC+0LvQu9C10LrRhtC40LhcbiAgICAgICAgc3RvcmFnZVsgcmVzb3VyY2UuY29sbGVjdGlvbk5hbWUgXS51cGRhdGVJZExpbmsoIHJlc3VsdCApO1xuXG4gICAgICAgIC8vINCt0YLQvtGCINC00L7QutGD0LzQtdC90YIg0YLQtdC/0LXRgNGMINGB0L7RhdGA0LDQvdGR0L0g0L3QsCDRgdC10YDQstC10YDQtSwg0LfQvdCw0YfQuNGCINC+0L0g0YPQttC1INC90LUg0L3QvtCy0YvQuS5cbiAgICAgICAgcmVzdWx0LmlzTmV3ID0gZmFsc2U7XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdCA9IHN0b3JhZ2VbIHJlc291cmNlLmNvbGxlY3Rpb25OYW1lIF0uYWRkKCByZXNwb25zZS5yZXN1bHQgfHwgcmVzcG9uc2UsIHVuZGVmaW5lZCwgdHJ1ZSApO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQgPSByZXNwb25zZS5yZXN1bHQgfHwgcmVzcG9uc2U7XG4gICAgfVxuXG4gICAgZG9uZSAmJiBkb25lKCByZXN1bHQsIHJlc3BvbnNlLm1ldGEgKTtcbiAgICBkZmQucmVzb2x2ZSggcmVzdWx0LCByZXNwb25zZS5tZXRhLCB0ZXh0U3RhdHVzLCBqcVhIUiApO1xuXG4gIH0pLmZhaWwoZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApe1xuICAgIGRmZC5yZWplY3QoIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApO1xuICB9KTtcblxuICAvLyBpZGVudGl0eSDRgdC+0YXRgNCw0L3Rj9C10YLRgdGPINC00LvRjyBjb25zdHJ1Y3RVcmwsINC10LPQviDQvdGD0LbQvdC+INC+0YfQuNGB0YLQuNGC0Ywg0LTQu9GPINC/0L7RgdC70LXQtNGD0Y7RidC40YUg0LfQsNC/0YDQvtGB0L7Qsi5cbiAgY2xlYXJJZGVudGl0eSggcmVzb3VyY2UgKTtcblxuICByZXR1cm4gZGZkO1xufTtcbnJlc291cmNlTWl4aW4uY3JlYXRlID0gcmVzb3VyY2VNaXhpbi5wb3N0O1xuXG5yZXNvdXJjZU1peGluLnB1dCA9IGZ1bmN0aW9uKCBkYXRhLCBhamF4U2V0dGluZ3MsIGRvbmUgKXtcbiAgdmFyIHJlc291cmNlID0gdGhpcztcbiAgdmFyIGlkZW50aXR5ID0gdGhpcy5pZGVudGl0eTtcbiAgdmFyIG1ldGhvZCA9ICdQVVQnO1xuICB2YXIgZG9jdW1lbnRJZFN0cmluZztcblxuICAvLyDQldGB0LvQuCBkYXRhIC0g0LXRgdGC0Ywg0YTRg9C90LrRhtC40Y8sINGC0L4g0Y3RgtC+IGRvbmVcbiAgaWYgKCB1dGlscy5pc0Z1bmN0aW9uKCBkYXRhICkgKXtcbiAgICBkb25lID0gZGF0YTtcbiAgICBkYXRhID0gdW5kZWZpbmVkO1xuICB9XG4gIGlmICggdXRpbHMuaXNGdW5jdGlvbiggYWpheFNldHRpbmdzICkgKXtcbiAgICBkb25lID0gYWpheFNldHRpbmdzO1xuICAgIGFqYXhTZXR0aW5ncyA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGFqYXhTZXR0aW5ncyA9IGFqYXhTZXR0aW5ncyB8fCB7fTtcblxuICAvLyDQn9GA0Lgg0YHQvtGF0YDQsNC90LXQvdC40Lgg0LTQvtC60YPQvNC10L3RgtCwINC90YPQttC90L4g0YHQvtGF0YDQsNC90Y/RgtGMINGC0L7Qu9GM0LrQviDQuNC30LzQtdC90ZHQvdC90YvQtSDQv9C+0LvRj1xuICAvLyDQmNC90L7Qs9C00LAg0L/QtdGA0LXQtNCw0Y7RgiDQtNC+0LrRg9C80LXQvdGCXG4gIGlmICggZGF0YSBpbnN0YW5jZW9mIHN0b3JhZ2UuRG9jdW1lbnQgKSB7XG4gICAgZG9jdW1lbnRJZFN0cmluZyA9IGRhdGEuX2lkLnRvU3RyaW5nKCk7XG4gICAgZGF0YSA9IGRhdGEuJF9fZGVsdGEoKTtcblxuICAgIC8vINCi0LDQuiDQvNC+0LbQvdC+INC/0L7QvdGP0YLRjCwg0YfRgtC+INC80Ysg0YHQvtGF0YDQsNC90Y/QtdC8INGB0YPRidC10YLQstGD0Y7RidC40Lkg0L3QsCDRgdC10YDQstC10YDQtSBEb2N1bWVudFxuICB9IGVsc2UgaWYgKCBzdG9yYWdlLk9iamVjdElkLmlzVmFsaWQoIGlkZW50aXR5ICkgKSB7XG4gICAgZG9jdW1lbnRJZFN0cmluZyA9IGlkZW50aXR5O1xuXG4gICAgLy8g0J/RgNC4INGB0L7RhdGA0LDQvdC10L3QuNC4INGH0LXRgNC10Lcg0LzQtdGC0L7QtCBzYXZlKCkg0YMg0LTQvtC60YPQvNC10L3RgtCwXG4gIH0gZWxzZSBpZiAoIGRhdGEuX2lkICYmIHN0b3JhZ2UuT2JqZWN0SWQuaXNWYWxpZCggZGF0YS5faWQgKSApIHtcbiAgICBkb2N1bWVudElkU3RyaW5nID0gZGF0YS5faWQudG9TdHJpbmcoKTtcbiAgfVxuXG4gIGFqYXhTZXR0aW5ncy5kYXRhID0gZGF0YTtcblxuICB2YXIgZGZkID0gJC5EZWZlcnJlZCgpO1xuICB0aGlzLl9yZXNvdXJjZVJlcXVlc3QoIG1ldGhvZCwgYWpheFNldHRpbmdzICkuZG9uZShmdW5jdGlvbiggcmVzcG9uc2UsIHRleHRTdGF0dXMsIGpxWEhSICl7XG4gICAgdmFyIHJlc3VsdDtcblxuICAgIC8vINCV0YHRgtGMINC+0YLQstC10YIg0L3QsNC00L4g0YHQvtGF0YDQsNC90LjRgtGMINCyINGF0YDQsNC90LjQu9C40YnQtVxuICAgIGlmICggcmVzb3VyY2Uuc3RvcmFnZSAmJiAhYWpheFNldHRpbmdzLmRvTm90U3RvcmUgKXtcbiAgICAgIC8vINCf0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuCDQvdGD0LbQvdC+INC+0LHQvdC+0LLQu9GP0YLRjCDQtNC+0LrRg9C80LXQvdGCXG4gICAgICAvLyDQn9C+0L/RgNC+0LHRg9C10Lwg0YHQvdCw0YfQsNC70LAg0L3QsNC50YLQuCDQtNC+0LrRg9C80LXQvdGCINC/0L4gaWQg0Lgg0L7QsdC90L7QstC40YLRjCDQtdCz0L5cbiAgICAgIHJlc3VsdCA9IHN0b3JhZ2VbIHJlc291cmNlLmNvbGxlY3Rpb25OYW1lIF0uZmluZEJ5SWQoIGRvY3VtZW50SWRTdHJpbmcgKTtcblxuICAgICAgaWYgKCByZXN1bHQgKXtcbiAgICAgICAgLy8g0J7QsdC90L7QstC70Y/QtdC8INC00L7QutGD0LzQtdC90YJcbiAgICAgICAgcmVzdWx0LnNldCggcmVzcG9uc2UucmVzdWx0ICk7XG5cbiAgICAgICAgLy8g0KHQvtC30LTQsNGR0Lwg0YHRgdGL0LvQutGDINC/0L4g0L3QvtCy0L7QvNGDIGlkINCyINC60L7Qu9C70LXQutGG0LjQuFxuICAgICAgICBzdG9yYWdlWyByZXNvdXJjZS5jb2xsZWN0aW9uTmFtZSBdLnVwZGF0ZUlkTGluayggcmVzdWx0ICk7XG5cbiAgICAgICAgLy8g0K3RgtC+0YIg0LTQvtC60YPQvNC10L3RgiDRgtC10L/QtdGA0Ywg0YHQvtGF0YDQsNC90ZHQvSDQvdCwINGB0LXRgNCy0LXRgNC1LCDQt9C90LDRh9C40YIg0L7QvSDRg9C20LUg0L3QtSDQvdC+0LLRi9C5LlxuICAgICAgICByZXN1bHQuaXNOZXcgPSBmYWxzZTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0ID0gc3RvcmFnZVsgcmVzb3VyY2UuY29sbGVjdGlvbk5hbWUgXS5hZGQoIHJlc3BvbnNlLnJlc3VsdCB8fCByZXNwb25zZSwgdW5kZWZpbmVkLCB0cnVlICk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdCA9IHJlc3BvbnNlLnJlc3VsdCB8fCByZXNwb25zZTtcbiAgICB9XG5cbiAgICBkb25lICYmIGRvbmUoIHJlc3VsdCwgcmVzcG9uc2UubWV0YSApO1xuICAgIGRmZC5yZXNvbHZlKCByZXN1bHQsIHJlc3BvbnNlLm1ldGEsIHRleHRTdGF0dXMsIGpxWEhSICk7XG5cbiAgfSkuZmFpbChmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICl7XG4gICAgZGZkLnJlamVjdCgganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICk7XG4gIH0pO1xuXG4gIC8vIGlkZW50aXR5INGB0L7RhdGA0LDQvdGP0LXRgtGB0Y8g0LTQu9GPIGNvbnN0cnVjdFVybCwg0LXQs9C+INC90YPQttC90L4g0L7Rh9C40YHRgtC40YLRjCDQtNC70Y8g0L/QvtGB0LvQtdC00YPRjtGJ0LjRhSDQt9Cw0L/RgNC+0YHQvtCyLlxuICBjbGVhcklkZW50aXR5KCByZXNvdXJjZSApO1xuXG4gIHJldHVybiBkZmQ7XG59O1xucmVzb3VyY2VNaXhpbi51cGRhdGUgPSByZXNvdXJjZU1peGluLnB1dDtcbnJlc291cmNlTWl4aW4uc2F2ZSA9IHJlc291cmNlTWl4aW4ucHV0O1xuXG5yZXNvdXJjZU1peGluLnBhdGNoID0gZnVuY3Rpb24oIGRhdGEsIGFqYXhTZXR0aW5ncywgZG9uZSApe1xuICB2YXIgcmVzb3VyY2UgPSB0aGlzO1xuICB2YXIgaWRlbnRpdHkgPSB0aGlzLmlkZW50aXR5O1xuICB2YXIgbWV0aG9kID0gJ1BBVENIJztcbiAgdmFyIGRvY3VtZW50SWRTdHJpbmc7XG5cbiAgLy8g0JXRgdC70LggZGF0YSAtINC10YHRgtGMINGE0YPQvdC60YbQuNGPLCDRgtC+INGN0YLQviBkb25lXG4gIGlmICggdXRpbHMuaXNGdW5jdGlvbiggZGF0YSApICl7XG4gICAgZG9uZSA9IGRhdGE7XG4gICAgZGF0YSA9IHVuZGVmaW5lZDtcbiAgfVxuICBpZiAoIHV0aWxzLmlzRnVuY3Rpb24oIGFqYXhTZXR0aW5ncyApICl7XG4gICAgZG9uZSA9IGFqYXhTZXR0aW5ncztcbiAgICBhamF4U2V0dGluZ3MgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBhamF4U2V0dGluZ3MgPSBhamF4U2V0dGluZ3MgfHwge307XG5cbiAgLy8g0J/RgNC4INGB0L7RhdGA0LDQvdC10L3QuNC4INC00L7QutGD0LzQtdC90YLQsCDQvdGD0LbQvdC+INGB0L7RhdGA0LDQvdGP0YLRjCDRgtC+0LvRjNC60L4g0LjQt9C80LXQvdGR0L3QvdGL0LUg0L/QvtC70Y9cbiAgLy8g0JjQvdC+0LPQtNCwINC/0LXRgNC10LTQsNGO0YIg0LTQvtC60YPQvNC10L3RglxuICBpZiAoIGRhdGEgaW5zdGFuY2VvZiBzdG9yYWdlLkRvY3VtZW50ICkge1xuICAgIGRvY3VtZW50SWRTdHJpbmcgPSBkYXRhLl9pZC50b1N0cmluZygpO1xuICAgIGRhdGEgPSBkYXRhLiRfX2RlbHRhKCk7XG5cbiAgICAvLyDQotCw0Log0LzQvtC20L3QviDQv9C+0L3Rj9GC0YwsINGH0YLQviDQvNGLINGB0L7RhdGA0LDQvdGP0LXQvCDRgdGD0YnQtdGC0LLRg9GO0YnQuNC5INC90LAg0YHQtdGA0LLQtdGA0LUgRG9jdW1lbnRcbiAgfSBlbHNlIGlmICggc3RvcmFnZS5PYmplY3RJZC5pc1ZhbGlkKCBpZGVudGl0eSApICkge1xuICAgIGRvY3VtZW50SWRTdHJpbmcgPSBpZGVudGl0eTtcblxuICAgIC8vINCf0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuCDRh9C10YDQtdC3INC80LXRgtC+0LQgc2F2ZSgpINGDINC00L7QutGD0LzQtdC90YLQsFxuICB9IGVsc2UgaWYgKCBkYXRhLl9pZCAmJiBzdG9yYWdlLk9iamVjdElkLmlzVmFsaWQoIGRhdGEuX2lkICkgKSB7XG4gICAgZG9jdW1lbnRJZFN0cmluZyA9IGRhdGEuX2lkLnRvU3RyaW5nKCk7XG4gIH1cblxuICBhamF4U2V0dGluZ3MuZGF0YSA9IGRhdGE7XG5cbiAgdmFyIGRmZCA9ICQuRGVmZXJyZWQoKTtcbiAgdGhpcy5fcmVzb3VyY2VSZXF1ZXN0KCBtZXRob2QsIGFqYXhTZXR0aW5ncyApLmRvbmUoZnVuY3Rpb24oIHJlc3BvbnNlLCB0ZXh0U3RhdHVzLCBqcVhIUiApe1xuICAgIHZhciByZXN1bHQ7XG5cbiAgICAvLyDQldGB0YLRjCDQvtGC0LLQtdGCINC90LDQtNC+INGB0L7RhdGA0LDQvdC40YLRjCDQsiDRhdGA0LDQvdC40LvQuNGJ0LVcbiAgICBpZiAoIHJlc291cmNlLnN0b3JhZ2UgJiYgIWFqYXhTZXR0aW5ncy5kb05vdFN0b3JlICl7XG4gICAgICAvLyDQn9GA0LggUEFUQ0gg0L3Rg9C20L3QviDQvtCx0L3QvtCy0LvRj9GC0Ywg0LTQvtC60YPQvNC10L3RglxuICAgICAgLy8g0J/QvtC/0YDQvtCx0YPQtdC8INGB0L3QsNGH0LDQu9CwINC90LDQudGC0Lgg0LTQvtC60YPQvNC10L3RgiDQv9C+IGlkINC4INC+0LHQvdC+0LLQuNGC0Ywg0LXQs9C+XG4gICAgICByZXN1bHQgPSBzdG9yYWdlWyByZXNvdXJjZS5jb2xsZWN0aW9uTmFtZSBdLmZpbmRCeUlkKCBkb2N1bWVudElkU3RyaW5nICk7XG5cbiAgICAgIGlmICggcmVzdWx0ICl7XG4gICAgICAgIC8vINCe0LHQvdC+0LLQu9GP0LXQvCDQtNC+0LrRg9C80LXQvdGCXG4gICAgICAgIHJlc3VsdC5zZXQoIHJlc3BvbnNlLnJlc3VsdCApO1xuXG4gICAgICAgIC8vINCh0L7Qt9C00LDRkdC8INGB0YHRi9C70LrRgyDQv9C+INC90L7QstC+0LzRgyBpZCDQsiDQutC+0LvQu9C10LrRhtC40LhcbiAgICAgICAgc3RvcmFnZVsgcmVzb3VyY2UuY29sbGVjdGlvbk5hbWUgXS51cGRhdGVJZExpbmsoIHJlc3VsdCApO1xuXG4gICAgICAgIC8vINCt0YLQvtGCINC00L7QutGD0LzQtdC90YIg0YLQtdC/0LXRgNGMINGB0L7RhdGA0LDQvdGR0L0g0L3QsCDRgdC10YDQstC10YDQtSwg0LfQvdCw0YfQuNGCINC+0L0g0YPQttC1INC90LUg0L3QvtCy0YvQuS5cbiAgICAgICAgcmVzdWx0LmlzTmV3ID0gZmFsc2U7XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdCA9IHN0b3JhZ2VbIHJlc291cmNlLmNvbGxlY3Rpb25OYW1lIF0uYWRkKCByZXNwb25zZS5yZXN1bHQgfHwgcmVzcG9uc2UsIHVuZGVmaW5lZCwgdHJ1ZSApO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQgPSByZXNwb25zZS5yZXN1bHQgfHwgcmVzcG9uc2U7XG4gICAgfVxuXG4gICAgLy90b2RvOiDQvNC+0LbQvdC+INC00L7QsdCw0LLQuNGC0Ywg0LrRjdGIINC90LAg0L/QvtGB0LvQtdC00YPRjtGJ0LjQtSBHRVQg0LggSEVBRCDQt9Cw0L/RgNC+0YHRiyAoaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNTc4OSlcblxuICAgIGRvbmUgJiYgZG9uZSggcmVzdWx0LCByZXNwb25zZS5tZXRhICk7XG4gICAgZGZkLnJlc29sdmUoIHJlc3VsdCwgcmVzcG9uc2UubWV0YSwgdGV4dFN0YXR1cywganFYSFIgKTtcblxuICB9KS5mYWlsKGZ1bmN0aW9uKCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKXtcbiAgICBkZmQucmVqZWN0KCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKTtcbiAgfSk7XG5cbiAgLy8gaWRlbnRpdHkg0YHQvtGF0YDQsNC90Y/QtdGC0YHRjyDQtNC70Y8gY29uc3RydWN0VXJsLCDQtdCz0L4g0L3Rg9C20L3QviDQvtGH0LjRgdGC0LjRgtGMINC00LvRjyDQv9C+0YHQu9C10LTRg9GO0YnQuNGFINC30LDQv9GA0L7RgdC+0LIuXG4gIGNsZWFySWRlbnRpdHkoIHJlc291cmNlICk7XG5cbiAgcmV0dXJuIGRmZDtcbn07XG5cbnJlc291cmNlTWl4aW4uZGVsZXRlID0gZnVuY3Rpb24oIGRhdGEsIGFqYXhTZXR0aW5ncywgZG9uZSApe1xuICB2YXIgcmVzb3VyY2UgPSB0aGlzO1xuICB2YXIgbWV0aG9kID0gJ0RFTEVURSc7XG5cbiAgLy8g0JXRgdC70LggZGF0YSAtINC10YHRgtGMINGE0YPQvdC60YbQuNGPLCDRgtC+INGN0YLQviBkb25lXG4gIGlmICggdXRpbHMuaXNGdW5jdGlvbiggZGF0YSApICl7XG4gICAgZG9uZSA9IGRhdGE7XG4gICAgZGF0YSA9IHVuZGVmaW5lZDtcbiAgfVxuICBpZiAoIHV0aWxzLmlzRnVuY3Rpb24oIGFqYXhTZXR0aW5ncyApICl7XG4gICAgZG9uZSA9IGFqYXhTZXR0aW5ncztcbiAgICBhamF4U2V0dGluZ3MgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBhamF4U2V0dGluZ3MgPSBhamF4U2V0dGluZ3MgfHwge307XG4gIGFqYXhTZXR0aW5ncy5kYXRhID0gZGF0YTtcblxuICB2YXIgZGZkID0gJC5EZWZlcnJlZCgpO1xuICB0aGlzLl9yZXNvdXJjZVJlcXVlc3QoIG1ldGhvZCwgYWpheFNldHRpbmdzICkuZG9uZShmdW5jdGlvbiggcmVzcG9uc2UsIHRleHRTdGF0dXMsIGpxWEhSICl7XG4gICAgdmFyIHJlc3VsdDtcblxuICAgIHJlc3VsdCA9IHJlc3BvbnNlLnJlc3VsdCB8fCByZXNwb25zZTtcblxuICAgIGRvbmUgJiYgZG9uZSggcmVzdWx0LCByZXNwb25zZS5tZXRhICk7XG4gICAgZGZkLnJlc29sdmUoIHJlc3VsdCwgcmVzcG9uc2UubWV0YSwgdGV4dFN0YXR1cywganFYSFIgKTtcblxuICB9KS5mYWlsKGZ1bmN0aW9uKCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKXtcbiAgICBkZmQucmVqZWN0KCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKTtcbiAgfSk7XG5cbiAgLy8gaWRlbnRpdHkg0YHQvtGF0YDQsNC90Y/QtdGC0YHRjyDQtNC70Y8gY29uc3RydWN0VXJsLCDQtdCz0L4g0L3Rg9C20L3QviDQvtGH0LjRgdGC0LjRgtGMINC00LvRjyDQv9C+0YHQu9C10LTRg9GO0YnQuNGFINC30LDQv9GA0L7RgdC+0LIuXG4gIGNsZWFySWRlbnRpdHkoIHJlc291cmNlICk7XG5cbiAgcmV0dXJuIGRmZDtcbn07XG5cbi8vINCe0YfQuNGB0YLQuNGC0YwgaWRlbnRpdHkg0YMg0YDQtdGB0YPRgNGB0LAg0Lgg0LXQs9C+INGA0L7QtNC40YLQtdC70YzRgdC60LjRhSDRgNC10YHRg9GA0YHQvtCyINGC0L7QttC1XG5mdW5jdGlvbiBjbGVhcklkZW50aXR5KCByZXNvdXJjZSApe1xuICB3aGlsZSAoIHJlc291cmNlLnBhcmVudFJlc291cmNlICkge1xuICAgIHJlc291cmNlLmlkZW50aXR5ID0gJyc7XG4gICAgcmVzb3VyY2UgPSByZXNvdXJjZS5wYXJlbnRSZXNvdXJjZTtcbiAgfVxufVxuXG4vKipcbiAqINCa0L7QvdGB0YLRgNGD0LrRgtC+0YAg0YDQtdGB0YPRgNGB0LAsINC90L4g0LLQvtC30LLRgNCw0YnQsNC10YIg0YTRg9C90LrRhtC40Y4g0YHQviDRgdCy0L7QudGB0YLQstCw0LzQuFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSByZXNvdXJjZU5hbWVcbiAqIEBwYXJhbSB7b2JqZWN0fSBwYXJlbnRSZXNvdXJjZVxuICogQHBhcmFtIHtvYmplY3R9IHVzZXJzTWl4aW5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gcmVzb3VyY2VcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBSZXNvdXJjZSggcmVzb3VyY2VOYW1lLCBwYXJlbnRSZXNvdXJjZSwgdXNlcnNNaXhpbiApe1xuXG4gIC8qKlxuICAgKiDQrdGC0YMg0YTRg9C90LrRhtC40Y4g0LzRiyDQvtGC0LTQsNGR0Lwg0L/QvtC70YzQt9C+0LLQsNGC0LXQu9GOINCyINC60LDRh9C10YHRgtCy0LUg0LTQvtGB0YLRg9C/0LAg0Log0YDQtdGB0YPRgNGB0YMuXG4gICAqINCe0L3QsCDQv9C+0LfQstC+0LvRj9C10YIg0LfQsNC00LDRgtGMIGlkZW50aXR5INC00LvRjyDQt9Cw0L/RgNC+0YHQsC5cbiAgICpcbiAgICogQHBhcmFtIFtpZGVudGl0eV1cbiAgICogQHJldHVybnMge0Z1bmN0aW9ufVxuICAgKi9cbiAgdmFyIHJlc291cmNlID0gZnVuY3Rpb24gcmVzb3VyY2UoIGlkZW50aXR5ICl7XG4gICAgaWYgKCBpZGVudGl0eSA9PSBudWxsICl7XG4gICAgICByZXR1cm4gcmVzb3VyY2U7XG4gICAgfVxuXG4gICAgaWYgKCBpZGVudGl0eSAmJiAhdXRpbHMuaXNTdHJpbmcoIGlkZW50aXR5ICkgKXtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ2lkZW50aXR5INC00L7Qu9C20LXQvSDQsdGL0YLRjCDRgdGC0YDQvtC60L7QuSwg0LAg0L3QtScsIGlkZW50aXR5ICk7XG4gICAgfVxuXG4gICAgcmVzb3VyY2UuaWRlbnRpdHkgPSBpZGVudGl0eSB8fCAnJztcblxuICAgIHJldHVybiByZXNvdXJjZTtcbiAgfTtcblxuICAkLmV4dGVuZCggcmVzb3VyY2UsIHJlc291cmNlTWl4aW4sIHtcbiAgICByZXNvdXJjZU5hbWU6IHJlc291cmNlTmFtZSxcbiAgICB1cmw6IHJlc291cmNlTmFtZVxuICB9LCB1c2Vyc01peGluICk7XG5cbiAgcmVzb3VyY2UucGFyZW50UmVzb3VyY2UgPSBwYXJlbnRSZXNvdXJjZTtcbiAgcmVzb3VyY2UuaW5zdGFuY2UgPSBwYXJlbnRSZXNvdXJjZS5pbnN0YW5jZSB8fCBwYXJlbnRSZXNvdXJjZTtcblxuICByZXR1cm4gcmVzb3VyY2U7XG59XG5cbi8qKlxuICogQ3JlYXRlIG5ldyBhcGkgY2xpZW50XG4gKlxuICogQGV4YW1wbGVcbiAqIHZhciBhcGkgPSBuZXcgQXBpQ2xpZW50KCcvYXBpJywge1xuICogICBob29rczoge1xuICogICAgIGhlYWRlcnM6IHtcbiAqICAgICAgIHRva2VuOiAnWFhYWFhYJ1xuICogICAgIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogdmFyIGFwaSA9IG5ldyBBcGlDbGllbnQoJ2h0dHBzOi8vZG9tYWluLmNvbS9hcGknLCB7XG4gKiAgIGhvb2tzOiB7XG4gKiAgICAgaGVhZGVyczoge1xuICogICAgICAgdG9rZW46ICdYWFhYWFgnXG4gKiAgICAgfVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiB2YXIgYXBpID0gbmV3IEFwaUNsaWVudCh7XG4gKiAgIHVybDogJy9hcGknXG4gKiAgIGhvb2tzOiB7XG4gKiAgICAgaGVhZGVyczoge1xuICogICAgICAgdG9rZW46ICdYWFhYWFgnXG4gKiAgICAgfVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiBAcGFyYW0gdXJsIGFwaSByb290IHVybFxuICogQHBhcmFtIG9wdGlvbnMgYXBpIGNsaWVudCBvcHRpb25zXG4gKi9cbmZ1bmN0aW9uIEFwaUNsaWVudCggdXJsLCBvcHRpb25zICl7XG4gIGlmICggISh0aGlzIGluc3RhbmNlb2YgQXBpQ2xpZW50KSApIHtcbiAgICByZXR1cm4gbmV3IEFwaUNsaWVudCggdXJsLCBvcHRpb25zICk7XG4gIH1cblxuICAvLyBJZiBmaXJzdCBhcmcgaXMgb2JqZWN0XG4gIGlmICggdXRpbHMuaXNPYmplY3QoIHVybCApICl7XG4gICAgb3B0aW9ucyA9IHVybDtcbiAgICB1cmwgPSBsb2NhdGlvbi5vcmlnaW47XG4gIH1cblxuICBpZiAoIHVybCA9PSBudWxsICl7XG4gICAgdXJsID0gbG9jYXRpb24ub3JpZ2luO1xuICB9XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIG9wdGlvbnMudXJsID0gdXJsO1xuXG4gIC8vIERlZmF1bHRzLCBub3RpZmljYXRpb25zIGlzIG9mZlxuICB0aGlzLm5vdGlmaWNhdGlvbnMgPSBmYWxzZTtcblxuICAvKipcbiAgICogaG9va3MgZm9yIGFqYXggc2V0dGluZ3MgKGFzIGJhc2UgYWpheFNldHRpbmdzKVxuICAgKiBAc2VlIGh0dHA6Ly9hcGkuanF1ZXJ5LmNvbS9qUXVlcnkuYWpheC9cbiAgICpcbiAgICogQHR5cGUge09iamVjdH1cbiAgICovXG4gIHRoaXMuaG9va3MgPSB7XG4gICAgLy8g0LTQvtC/0L7Qu9C90LjRgtC10LvRjNC90YvQtSDQtNCw0L3QvdGL0LUg0LfQsNC/0YDQvtGB0LBcbiAgICBkYXRhOiB7fSxcbiAgICAvLyDQntCx0YrQtdC60YIg0LTQu9GPINC00L7QsdCw0LLQu9C10L3QuNGPINC/0YDQvtC40LfQstC+0LvRjNC90YvRhSDQt9Cw0LPQvtC70L7QstC60L7QsiDQutC+INCy0YHQtdC8INC30LDQv9GA0L7RgdCw0LxcbiAgICAvLyDRg9C00L7QsdC90L4g0LTQu9GPINCw0LLRgtC+0YDQuNC30LDRhtC40Lgg0L/QviDRgtC+0LrQtdC90LDQvFxuICAgIGhlYWRlcnM6IHt9XG4gIH07XG5cbiAgLy90b2RvOiB0byB1dGlscyAoZGVlcE1lcmdlKSDQtNC+0LHQsNCy0LjRgtGMINCy0L7Qt9C80L7QttC90L7RgdGC0Ywg0YDQsNGB0YjQuNGA0Y/RgtGMINC+0LHRitC10LrRgiwg0LAg0L3QtSDQstC+0LfQstGA0LDRidCw0YLRjCDQvdC+0LLRi9C5XG4gICQuZXh0ZW5kKCB0cnVlLCB0aGlzLCBvcHRpb25zICk7XG59XG5cbkFwaUNsaWVudC5wcm90b3R5cGUgPSB7XG4gIC8qKlxuICAgKiDQlNC+0LHQsNCy0LjRgtGMINC90L7QstGL0Lkg0YDQtdGB0YPRgNGBXG4gICAqIEBzZWUgcmVzb3VyY2VNaXhpbi5hZGRcbiAgICovXG4gIGFkZDogcmVzb3VyY2VNaXhpbi5hZGQsXG5cbiAgbWV0aG9kc01hcDogbWV0aG9kc01hcCxcblxuICBfcHJlcGFyZUFqYXhTZXR0aW5nczogZnVuY3Rpb24oIG1ldGhvZCwgdXJsLCBkYXRhLCBhamF4U2V0dGluZ3MgKXtcbiAgICB2YXIgdHlwZSA9IHRoaXMubWV0aG9kc01hcFsgbWV0aG9kIF07XG4gICAgdmFyIF9hamF4U2V0dGluZ3MgPSB1dGlscy5kZWVwTWVyZ2UoIHRoaXMuaG9va3MsIGFqYXhTZXR0aW5ncyApO1xuXG4gICAgX2FqYXhTZXR0aW5ncy50eXBlID0gdHlwZTtcbiAgICBfYWpheFNldHRpbmdzLnVybCA9IHVybDtcblxuICAgIC8vINCU0L7QsdCw0LLQu9GP0LXQvCDQsNCy0YLQvtGA0LjQt9Cw0YbQuNGOINC/0L4g0YLQvtC60LXQvdGDXG4gICAgaWYgKCB0aGlzLnRva2VuICYmIGFqYXhTZXR0aW5ncy5oZWFkZXJzICYmIGFqYXhTZXR0aW5ncy5oZWFkZXJzLnRva2VuID09IG51bGwgKXtcbiAgICAgIF9hamF4U2V0dGluZ3MuaGVhZGVycy5BdXRob3JpemF0aW9uID0gJ3Rva2VuICcgKyB0aGlzLnRva2VuO1xuICAgIH1cblxuICAgIGlmICggdHlwZSA9PT0gJ0dFVCcgKXtcbiAgICAgIF9hamF4U2V0dGluZ3MuZGF0YSA9IHV0aWxzLmRlZXBNZXJnZSggX2FqYXhTZXR0aW5ncy5kYXRhLCBkYXRhICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vINCV0YHQu9C4INGB0L7RhdGA0LDQvdGP0LXQvCDQtNC+0LrRg9C80LXQvdGCLCDQvdGD0LbQvdC+INGB0LTQtdC70LDRgtGMIHRvT2JqZWN0KHtkZXBvcHVsYXRlOiAxfSlcbiAgICAgIGlmICggZGF0YSAmJiBkYXRhLmNvbnN0cnVjdG9yICYmIGRhdGEuY29uc3RydWN0b3IubmFtZSAmJiBkYXRhLmNvbnN0cnVjdG9yLm5hbWUgPT09ICdEb2N1bWVudCcgKXtcbiAgICAgICAgX2FqYXhTZXR0aW5ncy5kYXRhID0gdXRpbHMuZGVlcE1lcmdlKCBfYWpheFNldHRpbmdzLmRhdGEsIGRhdGEudG9PYmplY3Qoe2RlcG9wdWxhdGU6IDF9KSApO1xuXG4gICAgICB9IGVsc2UgaWYgKCBkYXRhICkge1xuICAgICAgICBfYWpheFNldHRpbmdzLmRhdGEgPSB1dGlscy5kZWVwTWVyZ2UoIF9hamF4U2V0dGluZ3MuZGF0YSwgZGF0YSApO1xuICAgICAgfVxuXG4gICAgICBpZiAoIF9hamF4U2V0dGluZ3MuZGF0YSAmJiBfYWpheFNldHRpbmdzLmNvbnRlbnRUeXBlID09PSAnYXBwbGljYXRpb24vanNvbicgKXtcbiAgICAgICAgX2FqYXhTZXR0aW5ncy5kYXRhID0gSlNPTi5zdHJpbmdpZnkoIF9hamF4U2V0dGluZ3MuZGF0YSApO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHRvZG8g0L/RgNC+0LLQtdGA0YLRjCDQvdCw0LTQvtCx0L3QvtGB0YLRjCDQutC+0LTQsFxuICAgIC8vINCY0YHQv9C+0LvRjNC30YPQtdGC0YHRjyDQtNC70Y8g0LDQu9C40LDRgdC+0LIsINCyINC60L7RgtC+0YDRi9GFINCy0YLQvtGA0L7QuSDQv9Cw0YDQsNC80LXRgtGAIC0g0LXRgdGC0Ywg0L7QsdGK0LXQutGCINC90LDRgdGC0YDQvtC10LpcbiAgICBpZiAoIHV0aWxzLmlzT2JqZWN0KCB1cmwgKSApe1xuICAgICAgY29uc29sZS5pbmZvKCfQkNGFQCrRgtGMLCDQvdGD0LbQvdGL0Lkg0LrQvtC0ISEhIScpO1xuICAgICAgX2FqYXhTZXR0aW5ncyA9IHVybDtcbiAgICAgIGRlYnVnZ2VyO1xuICAgIH1cblxuICAgIHJldHVybiBfYWpheFNldHRpbmdzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZW5kIHJlcXVlc3Qgb24gc2VydmVyXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtZXRob2Qg0J3QsNC30LLQsNC90LjQtSDQvNC10YLQvtC00LAgKFBPU1QsIEdFVCwgUFVULCBERUxFVEUsIFBBVENIKVxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXJsINCf0L7Qu9C90YvQuSDRg9GA0Lsg0YDQtdGB0YPRgNGB0LBcbiAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEg0J7QsdGK0LXQutGCINGBINC00LDQvdC90YvQvNC4INC00LvRjyDQt9Cw0L/RgNC+0YHQsFxuICAgKiBAcGFyYW0ge29iamVjdH0gYWpheFNldHRpbmdzINCe0LHRitC10LrRgiDRgSDQvdCw0YHRgtGA0L7QudC60LDQvNC4XG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gdXNlTm90aWZpY2F0aW9ucyDQpNC70LDQsywg0LjRgdC/0L7Qu9GM0LfQvtCy0LDRgtGMINC70Lgg0YPQstC10LTQvtC80LvQtdC90LjRj1xuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBkb25lINCk0YPQvdC60YbQuNGPINGD0YHQv9C10YjQvdC+0LPQviDQvtCx0YDQsNGC0L3QvtCz0L4g0LLRi9C30L7QstCwXG4gICAqIEByZXR1cm5zIHskLkRlZmVycmVkfSDQstC+0LfQstGA0LDRidCw0LXRgiBqcXVlcnkgYWpheCDQvtCx0YrQtdC60YJcbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9yZXF1ZXN0OiBmdW5jdGlvbiggbWV0aG9kLCB1cmwsIGRhdGEsIGFqYXhTZXR0aW5ncywgdXNlTm90aWZpY2F0aW9ucywgZG9uZSApe1xuICAgIGlmICggIXV0aWxzLmlzU3RyaW5nKCBtZXRob2QgKSApe1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCfQn9Cw0YDQsNC80LXRgtGAIGBtZXRob2RgINC00L7Qu9C20LXQvSDQsdGL0YLRjCDRgdGC0YDQvtC60L7QuSwg0LAg0L3QtSAnLCBtZXRob2QgKTtcbiAgICB9XG5cbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICAgICwgdHlwZSA9IHRoaXMubWV0aG9kc01hcFsgbWV0aG9kIF1cbiAgICAgICwgbm90aWZpY2F0aW9uVHlwZSA9IHR5cGUgPT09ICdHRVQnID8gJ2xvYWQnIDogKCB0eXBlID09PSAnUE9TVCcgfHwgdHlwZSA9PT0gJ1BVVCcgfHwgdHlwZSA9PT0gJ1BBVENIJyApID8gJ3NhdmUnIDogJ2RlbGV0ZSdcbiAgICAgICwgX2FqYXhTZXR0aW5ncyA9IHRoaXMuX3ByZXBhcmVBamF4U2V0dGluZ3MoIG1ldGhvZCwgdXJsLCBkYXRhLCBhamF4U2V0dGluZ3MgKTtcblxuICAgIC8vINCY0YHQv9C+0LvRjNC30L7QstCw0YLRjCDQt9C90LDRh9C10L3QuNC1INC/0L4g0YPQvNC+0LvRh9Cw0L3QuNGOLCDQtdGB0LvQuCB1c2VOb3RpZmljYXRpb25zINC90LUg0LfQsNC00LDQvVxuICAgIC8vINGC0YPRgiDQttC1INC/0L7RgNCy0LXRgNGP0LXQvCwg0L/QvtC00LrQu9GO0YfQtdC90Ysg0LvQuCDRg9Cy0LXQtNC+0LzQu9C10L3QuNGPXG4gICAgaWYgKCB1dGlscy5pc0Jvb2xlYW4oIHVzZU5vdGlmaWNhdGlvbnMgKSApe1xuICAgICAgdXNlTm90aWZpY2F0aW9ucyA9IHVzZU5vdGlmaWNhdGlvbnMgJiYgY2Yubm90aWZpY2F0aW9uO1xuICAgIH0gZWxzZSB7XG4gICAgICB1c2VOb3RpZmljYXRpb25zID0gdGhpcy5ub3RpZmljYXRpb25zICYmIGNmLm5vdGlmaWNhdGlvbjtcbiAgICB9XG5cbiAgICBpZiAoIHVzZU5vdGlmaWNhdGlvbnMgKXtcbiAgICAgIGNmLm5vdGlmaWNhdGlvblsgbm90aWZpY2F0aW9uVHlwZSBdLnNob3coKTtcbiAgICB9XG5cbiAgICByZXR1cm4gJC5hamF4KCBfYWpheFNldHRpbmdzICkuZmFpbChmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICl7XG4gICAgICBjb25zb2xlLndhcm4oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApO1xuXG4gICAgICAvLyBVbmF1dGhvcml6ZWQgQ2FsbGJhY2tcbiAgICAgIGlmICgganFYSFIuc3RhdHVzID09PSA0MDEgJiYgc2VsZi51bmF1dGhvcml6ZWRDYWxsYmFjayApe1xuICAgICAgICBzZWxmLnVuYXV0aG9yaXplZENhbGxiYWNrKCBqcVhIUiwgbWV0aG9kLCB1cmwsIGRhdGEsIGFqYXhTZXR0aW5ncywgZG9uZSApO1xuXG4gICAgICAgIC8vINCd0LUg0L/QvtC60LDQt9GL0LLQsNGC0Ywg0YHQvtC+0LHRidC10L3QuNC1INGBINC+0YjQuNCx0LrQvtC5INC/0YDQuCA0MDEsINC10YHQu9C4INCy0YHRkSDQv9C70L7RhdC+LCDRgtC+INGA0L7Rg9GC0LXRgCDRgdCw0Lwg0L/QtdGA0LXQutC40L3QtdGCINC90LAg0YTQvtGA0LzRgyDQstGF0L7QtNCwXG4gICAgICAgIGlmICggdXNlTm90aWZpY2F0aW9ucyApe1xuICAgICAgICAgIGNmLm5vdGlmaWNhdGlvblsgbm90aWZpY2F0aW9uVHlwZSBdLmhpZGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKCB1c2VOb3RpZmljYXRpb25zICl7XG4gICAgICAgIGNmLm5vdGlmaWNhdGlvblsgbm90aWZpY2F0aW9uVHlwZSBdLmZhaWwoKTtcbiAgICAgIH1cblxuICAgIH0pLmRvbmUoZnVuY3Rpb24oKXtcbiAgICAgIGlmICggdXNlTm90aWZpY2F0aW9ucyApe1xuICAgICAgICBjZi5ub3RpZmljYXRpb25bIG5vdGlmaWNhdGlvblR5cGUgXS5oaWRlKCk7XG4gICAgICB9XG4gICAgfSkuZG9uZSggZG9uZSApO1xuICB9XG59O1xuXG4vKipcbiAqIE1ldGhvZCBmb3IgZ2V0IHJlcXVlc3QgdG8gYXBpIHJvb3RcbiAqXG4gKiBAcGFyYW0gYWpheFNldHRpbmdzXG4gKiBAcGFyYW0gZG9uZVxuICogQHJldHVybnMgeyQuRGVmZXJyZWR9XG4gKi9cbkFwaUNsaWVudC5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24oIGFqYXhTZXR0aW5ncywgZG9uZSApe1xuICBjb25zb2xlLmxvZyggJ2FwaTo6Z2V0JyApO1xuICBpZiAoIHV0aWxzLmlzRnVuY3Rpb24oIGFqYXhTZXR0aW5ncyApICl7XG4gICAgZG9uZSA9IGFqYXhTZXR0aW5ncztcbiAgICBhamF4U2V0dGluZ3MgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBhamF4U2V0dGluZ3MgPSBhamF4U2V0dGluZ3MgfHwge307XG5cbiAgcmV0dXJuIHRoaXMuX3JlcXVlc3QoJ3JlYWQnLCB0aGlzLnVybCwgdW5kZWZpbmVkLCBhamF4U2V0dGluZ3MsIGZhbHNlLCBkb25lICk7XG59O1xuLyoqXG4gKiBAYWxpYXMgQXBpQ2xpZW50LnByb3RvdHlwZS5nZXRcbiAqIEB0eXBlIHtGdW5jdGlvbn1cbiAqL1xuQXBpQ2xpZW50LnByb3RvdHlwZS5yZWFkID0gQXBpQ2xpZW50LnByb3RvdHlwZS5nZXQ7XG5cbkFwaUNsaWVudC52ZXJzaW9uID0gJzAuMy4wJztcblxuQXBpQ2xpZW50LnV0aWxzID0gdXRpbHM7XG5cbi8vIGV4cG9ydHNcbm1vZHVsZS5leHBvcnRzID0gQXBpQ2xpZW50OyIsIi8qKlxuICogVXNlcjogQ29uc3RhbnRpbmUgTWVsbmlrb3ZcbiAqIEVtYWlsOiBrYS5tZWxuaWtvdkBnbWFpbC5jb21cbiAqIERhdGU6IDI3LjAxLjE1XG4gKiBUaW1lOiAxNjoxNlxuICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHt9O1xuXG4vKiogYE9iamVjdCN0b1N0cmluZ2AgcmVzdWx0IHJlZmVyZW5jZXMuICovXG52YXIgYXJnc1RhZyA9ICdbb2JqZWN0IEFyZ3VtZW50c10nLFxuICAgIGFycmF5VGFnID0gJ1tvYmplY3QgQXJyYXldJyxcbiAgICBib29sVGFnID0gJ1tvYmplY3QgQm9vbGVhbl0nLFxuICAgIGRhdGVUYWcgPSAnW29iamVjdCBEYXRlXScsXG4gICAgZXJyb3JUYWcgPSAnW29iamVjdCBFcnJvcl0nLFxuICAgIGZ1bmNUYWcgPSAnW29iamVjdCBGdW5jdGlvbl0nLFxuICAgIG51bWJlclRhZyA9ICdbb2JqZWN0IE51bWJlcl0nLFxuICAgIG9iamVjdFRhZyA9ICdbb2JqZWN0IE9iamVjdF0nLFxuICAgIHJlZ2V4cFRhZyA9ICdbb2JqZWN0IFJlZ0V4cF0nLFxuICAgIHN0cmluZ1RhZyA9ICdbb2JqZWN0IFN0cmluZ10nO1xuXG4vKiogVXNlZCBmb3IgbmF0aXZlIG1ldGhvZCByZWZlcmVuY2VzLiAqL1xudmFyIGFycmF5UHJvdG8gPSBBcnJheS5wcm90b3R5cGU7XG52YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKipcbiAqIFVzZWQgdG8gcmVzb2x2ZSB0aGUgYHRvU3RyaW5nVGFnYCBvZiB2YWx1ZXMuXG4gKiBTZWUgdGhlIFtFUyBzcGVjXShodHRwczovL3Blb3BsZS5tb3ppbGxhLm9yZy9+am9yZW5kb3JmZi9lczYtZHJhZnQuaHRtbCNzZWMtb2JqZWN0LnByb3RvdHlwZS50b3N0cmluZylcbiAqIGZvciBtb3JlIGRldGFpbHMuXG4gKi9cbnZhciBvYmpUb1N0cmluZyA9IG9iamVjdFByb3RvLnRvU3RyaW5nO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0TGlrZSh2YWx1ZSkge1xuICByZXR1cm4gKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHx8IGZhbHNlO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGNsYXNzaWZpZWQgYXMgYSBgU3RyaW5nYCBwcmltaXRpdmUgb3Igb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgY29ycmVjdGx5IGNsYXNzaWZpZWQsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogdXRpbHMuaXNTdHJpbmcoJ2FiYycpO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIHV0aWxzLmlzU3RyaW5nKDEpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xudXRpbHMuaXNTdHJpbmcgPSBmdW5jdGlvbiBpc1N0cmluZyggdmFsdWUgKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnIHx8IChpc09iamVjdExpa2UodmFsdWUpICYmIG9ialRvU3RyaW5nLmNhbGwodmFsdWUpID09PSBzdHJpbmdUYWcpIHx8IGZhbHNlO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBjbGFzc2lmaWVkIGFzIGEgYm9vbGVhbiBwcmltaXRpdmUgb3Igb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgY29ycmVjdGx5IGNsYXNzaWZpZWQsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogdXRpbHMuaXNCb29sZWFuKGZhbHNlKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiB1dGlscy5pc0Jvb2xlYW4obnVsbCk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG51dGlscy5pc0Jvb2xlYW4gPSBmdW5jdGlvbiBpc0Jvb2xlYW4odmFsdWUpIHtcbiAgcmV0dXJuICh2YWx1ZSA9PT0gdHJ1ZSB8fCB2YWx1ZSA9PT0gZmFsc2UgfHwgaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBvYmpUb1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gYm9vbFRhZykgfHwgZmFsc2U7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIHRoZSBsYW5ndWFnZSB0eXBlIG9mIGBPYmplY3RgLlxuICogKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXG4gKlxuICogKipOb3RlOioqIFNlZSB0aGUgW0VTNSBzcGVjXShodHRwczovL2VzNS5naXRodWIuaW8vI3g4KSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gb2JqZWN0LCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIHV0aWxzLmlzT2JqZWN0KHt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiB1dGlscy5pc09iamVjdChbMSwgMiwgM10pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIHV0aWxzLmlzT2JqZWN0KDEpO1xuICogLy8gPT4gZmFsc2VcbiAqXG4gKiB1dGlscy5pc09iamVjdChmdW5jdGlvbigpe30pO1xuICogLy8gPT4gZmFsc2VcbiAqL1xudXRpbHMuaXNPYmplY3QgPSBmdW5jdGlvbiBpc09iamVjdCggdmFsdWUgKSB7XG4gIC8vIEF2b2lkIGEgVjggSklUIGJ1ZyBpbiBDaHJvbWUgMTktMjAuXG4gIC8vIFNlZSBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MjI5MSBmb3IgbW9yZSBkZXRhaWxzLlxuICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcbiAgcmV0dXJuICh2YWx1ZSAmJiB2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlID09PSAnb2JqZWN0JykgfHwgZmFsc2U7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGNsYXNzaWZpZWQgYXMgYSBgRnVuY3Rpb25gIG9iamVjdC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGNvcnJlY3RseSBjbGFzc2lmaWVkLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIHV0aWxzLmlzRnVuY3Rpb24oZnVuY3Rpb24oKXt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiB1dGlscy5pc0Z1bmN0aW9uKC9hYmMvKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbnV0aWxzLmlzRnVuY3Rpb24gPSBmdW5jdGlvbiBpc0Z1bmN0aW9uKHZhbHVlKSB7XG4gIC8vIEF2b2lkIGEgQ2hha3JhIEpJVCBidWcgaW4gY29tcGF0aWJpbGl0eSBtb2RlcyBvZiBJRSAxMS5cbiAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9qYXNoa2VuYXMvdW5kZXJzY29yZS9pc3N1ZXMvMTYyMSBmb3IgbW9yZSBkZXRhaWxzLlxuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nIHx8IGZhbHNlO1xufTtcblxuLy8gaHR0cHM6Ly9naXRodWIuY29tL25yZjExMC9kZWVwbWVyZ2Vcbi8qKlxuICogTWVyZ2UgdHdvIG9iamVjdHMgYHhgIGFuZCBgeWAgZGVlcGx5LCByZXR1cm5pbmcgYSBuZXcgbWVyZ2VkIG9iamVjdCB3aXRoIHRoZSBlbGVtZW50cyBmcm9tIGJvdGggYHhgIGFuZCBgeWAuXG4gKlxuICogSWYgYW4gZWxlbWVudCBhdCB0aGUgc2FtZSBrZXkgaXMgcHJlc2VudCBmb3IgYm90aCBgeGAgYW5kIGB5YCwgdGhlIHZhbHVlIGZyb20gYHlgIHdpbGwgYXBwZWFyIGluIHRoZSByZXN1bHQuXG4gKlxuICogVGhlIG1lcmdlIGlzIGltbXV0YWJsZSwgc28gbmVpdGhlciBgeGAgbm9yIGB5YCB3aWxsIGJlIG1vZGlmaWVkLlxuICpcbiAqIFRoZSBtZXJnZSB3aWxsIGFsc28gbWVyZ2UgYXJyYXlzIGFuZCBhcnJheSB2YWx1ZXMuXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogQHBhcmFtIHNyY1xuICogQHJldHVybnMge2Jvb2xlYW58QXJyYXl8e319XG4gKi9cbnV0aWxzLmRlZXBNZXJnZSA9IGZ1bmN0aW9uIGRlZXBNZXJnZSggdGFyZ2V0LCBzcmMgKXtcbiAgdmFyIGFycmF5ID0gQXJyYXkuaXNBcnJheShzcmMpO1xuICB2YXIgZHN0ID0gYXJyYXkgJiYgW10gfHwge307XG5cbiAgaWYgKGFycmF5KSB7XG4gICAgdGFyZ2V0ID0gdGFyZ2V0IHx8IFtdO1xuICAgIGRzdCA9IGRzdC5jb25jYXQodGFyZ2V0KTtcbiAgICBzcmMuZm9yRWFjaChmdW5jdGlvbihlLCBpKSB7XG4gICAgICBpZiAodHlwZW9mIGRzdFtpXSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgZHN0W2ldID0gZTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGRzdFtpXSA9IGRlZXBNZXJnZSh0YXJnZXRbaV0sIGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRhcmdldC5pbmRleE9mKGUpID09PSAtMSkge1xuICAgICAgICAgIGRzdC5wdXNoKGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKHRhcmdldCAmJiB0eXBlb2YgdGFyZ2V0ID09PSAnb2JqZWN0Jykge1xuICAgICAgT2JqZWN0LmtleXModGFyZ2V0KS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgZHN0W2tleV0gPSB0YXJnZXRba2V5XTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICggc3JjID09IG51bGwgKXtcbiAgICAgIHJldHVybiBkc3Q7XG4gICAgfVxuXG4gICAgT2JqZWN0LmtleXMoc3JjKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgIGlmICh0eXBlb2Ygc3JjW2tleV0gIT09ICdvYmplY3QnIHx8ICFzcmNba2V5XSkge1xuICAgICAgICBkc3Rba2V5XSA9IHNyY1trZXldO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGlmICghdGFyZ2V0W2tleV0pIHtcbiAgICAgICAgICBkc3Rba2V5XSA9IHNyY1trZXldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRzdFtrZXldID0gZGVlcE1lcmdlKHRhcmdldFtrZXldLCBzcmNba2V5XSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBkc3Q7XG59O1xuXG4vKipcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9haGVja21hbm4vbXF1ZXJ5L2Jsb2IvbWFzdGVyL2xpYi9tcXVlcnkuanNcbiAqIG1xdWVyeS5zZWxlY3RcbiAqXG4gKiBTcGVjaWZpZXMgd2hpY2ggZG9jdW1lbnQgZmllbGRzIHRvIGluY2x1ZGUgb3IgZXhjbHVkZVxuICpcbiAqICMjIyNTdHJpbmcgc3ludGF4XG4gKlxuICogV2hlbiBwYXNzaW5nIGEgc3RyaW5nLCBwcmVmaXhpbmcgYSBwYXRoIHdpdGggYC1gIHdpbGwgZmxhZyB0aGF0IHBhdGggYXMgZXhjbHVkZWQuXG4gKiBXaGVuIGEgcGF0aCBkb2VzIG5vdCBoYXZlIHRoZSBgLWAgcHJlZml4LCBpdCBpcyBpbmNsdWRlZC5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICAvLyBpbmNsdWRlIGEgYW5kIGIsIGV4Y2x1ZGUgY1xuICogICAgIHV0aWxzLnNlbGVjdCgnYSBiIC1jJyk7XG4gKlxuICogICAgIC8vIG9yIHlvdSBtYXkgdXNlIG9iamVjdCBub3RhdGlvbiwgdXNlZnVsIHdoZW5cbiAqICAgICAvLyB5b3UgaGF2ZSBrZXlzIGFscmVhZHkgcHJlZml4ZWQgd2l0aCBhIFwiLVwiXG4gKiAgICAgdXRpbHMuc2VsZWN0KHthOiAxLCBiOiAxLCBjOiAwfSk7XG4gKlxuICogQHBhcmFtIHtPYmplY3R8U3RyaW5nfSBzZWxlY3Rpb25cbiAqIEByZXR1cm4ge09iamVjdHx1bmRlZmluZWR9XG4gKiBAYXBpIHB1YmxpY1xuICovXG51dGlscy5zZWxlY3QgPSBmdW5jdGlvbiBzZWxlY3QoIHNlbGVjdGlvbiApe1xuICBpZiAoIXNlbGVjdGlvbikgcmV0dXJuO1xuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHNlbGVjdDogc2VsZWN0IG9ubHkgdGFrZXMgMSBhcmd1bWVudCcpO1xuICB9XG5cbiAgdmFyIGZpZWxkcyA9IHt9O1xuICB2YXIgdHlwZSA9IHR5cGVvZiBzZWxlY3Rpb247XG5cbiAgaWYgKCdzdHJpbmcnID09PSB0eXBlIHx8ICdvYmplY3QnID09PSB0eXBlICYmICdudW1iZXInID09PSB0eXBlb2Ygc2VsZWN0aW9uLmxlbmd0aCAmJiAhQXJyYXkuaXNBcnJheSggc2VsZWN0aW9uICkpIHtcbiAgICBpZiAoJ3N0cmluZycgPT09IHR5cGUpe1xuICAgICAgc2VsZWN0aW9uID0gc2VsZWN0aW9uLnNwbGl0KC9cXHMrLyk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHNlbGVjdGlvbi5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgdmFyIGZpZWxkID0gc2VsZWN0aW9uWyBpIF07XG4gICAgICBpZiAoICFmaWVsZCApIGNvbnRpbnVlO1xuICAgICAgdmFyIGluY2x1ZGUgPSAnLScgPT09IGZpZWxkWyAwIF0gPyAwIDogMTtcbiAgICAgIGlmIChpbmNsdWRlID09PSAwKSBmaWVsZCA9IGZpZWxkLnN1YnN0cmluZyggMSApO1xuICAgICAgZmllbGRzWyBmaWVsZCBdID0gaW5jbHVkZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmllbGRzO1xuICB9XG5cbiAgaWYgKCB1dGlscy5pc09iamVjdCggc2VsZWN0aW9uICkgJiYgIUFycmF5LmlzQXJyYXkoIHNlbGVjdGlvbiApKSB7XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyggc2VsZWN0aW9uICk7XG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBrZXlzLmxlbmd0aDsgKytqKSB7XG4gICAgICBmaWVsZHNbIGtleXNbIGogXSBdID0gc2VsZWN0aW9uWyBrZXlzWyBqIF0gXTtcbiAgICB9XG4gICAgcmV0dXJuIGZpZWxkcztcbiAgfVxuXG4gIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgc2VsZWN0KCkgYXJndW1lbnQuIE11c3QgYmUgc3RyaW5nIG9yIG9iamVjdC4nKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gdXRpbHM7XG4iXX0=
(1)
});
