/**
 * Rest-Api-Client v0.3.0
 * https://github.com/archangel-irk/rest-api-client
 * (c) Constantine Melnikov 2013 - 2019
 * MIT License
 */
const utils = {};
var boolTag = '[object Boolean]';
var stringTag = '[object String]';
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

// API Client

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

export { ApiClient };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLWNsaWVudC5lc20uZGV2ZWxvcG1lbnQuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlscy5qcyIsIi4uL3NyYy9nZXQuanMiLCIuLi9zcmMvcG9zdC5qcyIsIi4uL3NyYy9kZWxldGUuanMiLCIuLi9zcmMvY2FjaGUuanMiLCIuLi9zcmMvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNvbnN0IHV0aWxzID0ge307XG5cbi8qKiBgT2JqZWN0I3RvU3RyaW5nYCByZXN1bHQgcmVmZXJlbmNlcy4gKi9cbnZhciBhcmdzVGFnID0gJ1tvYmplY3QgQXJndW1lbnRzXSc7XG52YXIgYXJyYXlUYWcgPSAnW29iamVjdCBBcnJheV0nO1xudmFyIGJvb2xUYWcgPSAnW29iamVjdCBCb29sZWFuXSc7XG52YXIgZGF0ZVRhZyA9ICdbb2JqZWN0IERhdGVdJztcbnZhciBlcnJvclRhZyA9ICdbb2JqZWN0IEVycm9yXSc7XG52YXIgZnVuY1RhZyA9ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG52YXIgbnVtYmVyVGFnID0gJ1tvYmplY3QgTnVtYmVyXSc7XG52YXIgb2JqZWN0VGFnID0gJ1tvYmplY3QgT2JqZWN0XSc7XG52YXIgcmVnZXhwVGFnID0gJ1tvYmplY3QgUmVnRXhwXSc7XG52YXIgc3RyaW5nVGFnID0gJ1tvYmplY3QgU3RyaW5nXSc7XG5cbi8qKiBVc2VkIGZvciBuYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMuICovXG52YXIgYXJyYXlQcm90byA9IEFycmF5LnByb3RvdHlwZTtcbnZhciBvYmplY3RQcm90byA9IE9iamVjdC5wcm90b3R5cGU7XG5cbi8qKlxuICogVXNlZCB0byByZXNvbHZlIHRoZSBgdG9TdHJpbmdUYWdgIG9mIHZhbHVlcy5cbiAqIFNlZSB0aGUgW0VTIHNwZWNdKGh0dHBzOi8vcGVvcGxlLm1vemlsbGEub3JnL35qb3JlbmRvcmZmL2VzNi1kcmFmdC5odG1sI3NlYy1vYmplY3QucHJvdG90eXBlLnRvc3RyaW5nKVxuICogZm9yIG1vcmUgZGV0YWlscy5cbiAqL1xudmFyIG9ialRvU3RyaW5nID0gb2JqZWN0UHJvdG8udG9TdHJpbmc7XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgb2JqZWN0LWxpa2UuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgb2JqZWN0LWxpa2UsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gaXNPYmplY3RMaWtlKHZhbHVlKSB7XG4gIHJldHVybiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JykgfHwgZmFsc2U7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgY2xhc3NpZmllZCBhcyBhIGBTdHJpbmdgIHByaW1pdGl2ZSBvciBvYmplY3QuXG4gKlxuICogQHN0YXRpY1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBjb3JyZWN0bHkgY2xhc3NpZmllZCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiB1dGlscy5pc1N0cmluZygnYWJjJyk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogdXRpbHMuaXNTdHJpbmcoMSk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG51dGlscy5pc1N0cmluZyA9IGZ1bmN0aW9uIGlzU3RyaW5nKCB2YWx1ZSApIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgfHwgKGlzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgb2JqVG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09IHN0cmluZ1RhZykgfHwgZmFsc2U7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGNsYXNzaWZpZWQgYXMgYSBib29sZWFuIHByaW1pdGl2ZSBvciBvYmplY3QuXG4gKlxuICogQHN0YXRpY1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBjb3JyZWN0bHkgY2xhc3NpZmllZCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiB1dGlscy5pc0Jvb2xlYW4oZmFsc2UpO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIHV0aWxzLmlzQm9vbGVhbihudWxsKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbnV0aWxzLmlzQm9vbGVhbiA9IGZ1bmN0aW9uIGlzQm9vbGVhbih2YWx1ZSkge1xuICByZXR1cm4gKHZhbHVlID09PSB0cnVlIHx8IHZhbHVlID09PSBmYWxzZSB8fCBpc09iamVjdExpa2UodmFsdWUpICYmIG9ialRvU3RyaW5nLmNhbGwodmFsdWUpID09PSBib29sVGFnKSB8fCBmYWxzZTtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgdGhlIGxhbmd1YWdlIHR5cGUgb2YgYE9iamVjdGAuXG4gKiAoZS5nLiBhcnJheXMsIGZ1bmN0aW9ucywgb2JqZWN0cywgcmVnZXhlcywgYG5ldyBOdW1iZXIoMClgLCBhbmQgYG5ldyBTdHJpbmcoJycpYClcbiAqXG4gKiAqKk5vdGU6KiogU2VlIHRoZSBbRVM1IHNwZWNdKGh0dHBzOi8vZXM1LmdpdGh1Yi5pby8jeDgpIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogQHN0YXRpY1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhbiBvYmplY3QsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogdXRpbHMuaXNPYmplY3Qoe30pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIHV0aWxzLmlzT2JqZWN0KFsxLCAyLCAzXSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogdXRpbHMuaXNPYmplY3QoMSk7XG4gKiAvLyA9PiBmYWxzZVxuICpcbiAqIHV0aWxzLmlzT2JqZWN0KGZ1bmN0aW9uKCl7fSk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG51dGlscy5pc09iamVjdCA9IGZ1bmN0aW9uIGlzT2JqZWN0KCB2YWx1ZSApIHtcbiAgLy8gQXZvaWQgYSBWOCBKSVQgYnVnIGluIENocm9tZSAxOS0yMC5cbiAgLy8gU2VlIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0yMjkxIGZvciBtb3JlIGRldGFpbHMuXG4gIHZhciB0eXBlID0gdHlwZW9mIHZhbHVlO1xuICByZXR1cm4gKHZhbHVlICYmIHZhbHVlICE9PSBudWxsICYmIHR5cGUgPT09ICdvYmplY3QnKSB8fCBmYWxzZTtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgY2xhc3NpZmllZCBhcyBhIGBGdW5jdGlvbmAgb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgY29ycmVjdGx5IGNsYXNzaWZpZWQsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogdXRpbHMuaXNGdW5jdGlvbihmdW5jdGlvbigpe30pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIHV0aWxzLmlzRnVuY3Rpb24oL2FiYy8pO1xuICogLy8gPT4gZmFsc2VcbiAqL1xudXRpbHMuaXNGdW5jdGlvbiA9IGZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsdWUpIHtcbiAgLy8gQXZvaWQgYSBDaGFrcmEgSklUIGJ1ZyBpbiBjb21wYXRpYmlsaXR5IG1vZGVzIG9mIElFIDExLlxuICAvLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2phc2hrZW5hcy91bmRlcnNjb3JlL2lzc3Vlcy8xNjIxIGZvciBtb3JlIGRldGFpbHMuXG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicgfHwgZmFsc2U7XG59O1xuXG4vLyBodHRwczovL2dpdGh1Yi5jb20vbnJmMTEwL2RlZXBtZXJnZVxuLyoqXG4gKiBNZXJnZSB0d28gb2JqZWN0cyBgeGAgYW5kIGB5YCBkZWVwbHksIHJldHVybmluZyBhIG5ldyBtZXJnZWQgb2JqZWN0IHdpdGggdGhlIGVsZW1lbnRzIGZyb20gYm90aCBgeGAgYW5kIGB5YC5cbiAqXG4gKiBJZiBhbiBlbGVtZW50IGF0IHRoZSBzYW1lIGtleSBpcyBwcmVzZW50IGZvciBib3RoIGB4YCBhbmQgYHlgLCB0aGUgdmFsdWUgZnJvbSBgeWAgd2lsbCBhcHBlYXIgaW4gdGhlIHJlc3VsdC5cbiAqXG4gKiBUaGUgbWVyZ2UgaXMgaW1tdXRhYmxlLCBzbyBuZWl0aGVyIGB4YCBub3IgYHlgIHdpbGwgYmUgbW9kaWZpZWQuXG4gKlxuICogVGhlIG1lcmdlIHdpbGwgYWxzbyBtZXJnZSBhcnJheXMgYW5kIGFycmF5IHZhbHVlcy5cbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiBAcGFyYW0gc3JjXG4gKiBAcmV0dXJucyB7Ym9vbGVhbnxBcnJheXx7fX1cbiAqL1xudXRpbHMuZGVlcE1lcmdlID0gZnVuY3Rpb24gZGVlcE1lcmdlKCB0YXJnZXQsIHNyYyApe1xuICB2YXIgYXJyYXkgPSBBcnJheS5pc0FycmF5KHNyYyk7XG4gIHZhciBkc3QgPSBhcnJheSAmJiBbXSB8fCB7fTtcblxuICBpZiAoYXJyYXkpIHtcbiAgICB0YXJnZXQgPSB0YXJnZXQgfHwgW107XG4gICAgZHN0ID0gZHN0LmNvbmNhdCh0YXJnZXQpO1xuICAgIHNyYy5mb3JFYWNoKGZ1bmN0aW9uKGUsIGkpIHtcbiAgICAgIGlmICh0eXBlb2YgZHN0W2ldID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBkc3RbaV0gPSBlO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgZHN0W2ldID0gZGVlcE1lcmdlKHRhcmdldFtpXSwgZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodGFyZ2V0LmluZGV4T2YoZSkgPT09IC0xKSB7XG4gICAgICAgICAgZHN0LnB1c2goZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBpZiAodGFyZ2V0ICYmIHR5cGVvZiB0YXJnZXQgPT09ICdvYmplY3QnKSB7XG4gICAgICBPYmplY3Qua2V5cyh0YXJnZXQpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICBkc3Rba2V5XSA9IHRhcmdldFtrZXldO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKCBzcmMgPT0gbnVsbCApe1xuICAgICAgcmV0dXJuIGRzdDtcbiAgICB9XG5cbiAgICBPYmplY3Qua2V5cyhzcmMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgaWYgKHR5cGVvZiBzcmNba2V5XSAhPT0gJ29iamVjdCcgfHwgIXNyY1trZXldKSB7XG4gICAgICAgIGRzdFtrZXldID0gc3JjW2tleV07XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgaWYgKCF0YXJnZXRba2V5XSkge1xuICAgICAgICAgIGRzdFtrZXldID0gc3JjW2tleV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZHN0W2tleV0gPSBkZWVwTWVyZ2UodGFyZ2V0W2tleV0sIHNyY1trZXldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIGRzdDtcbn07XG5cbi8qKlxuICogaHR0cHM6Ly9naXRodWIuY29tL2FoZWNrbWFubi9tcXVlcnkvYmxvYi9tYXN0ZXIvbGliL21xdWVyeS5qc1xuICogbXF1ZXJ5LnNlbGVjdFxuICpcbiAqIFNwZWNpZmllcyB3aGljaCBkb2N1bWVudCBmaWVsZHMgdG8gaW5jbHVkZSBvciBleGNsdWRlXG4gKlxuICogIyMjI1N0cmluZyBzeW50YXhcbiAqXG4gKiBXaGVuIHBhc3NpbmcgYSBzdHJpbmcsIHByZWZpeGluZyBhIHBhdGggd2l0aCBgLWAgd2lsbCBmbGFnIHRoYXQgcGF0aCBhcyBleGNsdWRlZC5cbiAqIFdoZW4gYSBwYXRoIGRvZXMgbm90IGhhdmUgdGhlIGAtYCBwcmVmaXgsIGl0IGlzIGluY2x1ZGVkLlxuICpcbiAqICMjIyNFeGFtcGxlXG4gKlxuICogICAgIC8vIGluY2x1ZGUgYSBhbmQgYiwgZXhjbHVkZSBjXG4gKiAgICAgdXRpbHMuc2VsZWN0KCdhIGIgLWMnKTtcbiAqXG4gKiAgICAgLy8gb3IgeW91IG1heSB1c2Ugb2JqZWN0IG5vdGF0aW9uLCB1c2VmdWwgd2hlblxuICogICAgIC8vIHlvdSBoYXZlIGtleXMgYWxyZWFkeSBwcmVmaXhlZCB3aXRoIGEgXCItXCJcbiAqICAgICB1dGlscy5zZWxlY3Qoe2E6IDEsIGI6IDEsIGM6IDB9KTtcbiAqXG4gKiBAcGFyYW0ge09iamVjdHxTdHJpbmd9IHNlbGVjdGlvblxuICogQHJldHVybiB7T2JqZWN0fHVuZGVmaW5lZH1cbiAqIEBhcGkgcHVibGljXG4gKi9cbnV0aWxzLnNlbGVjdCA9IGZ1bmN0aW9uIHNlbGVjdCggc2VsZWN0aW9uICl7XG4gIGlmICghc2VsZWN0aW9uKSByZXR1cm47XG5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggIT09IDEpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc2VsZWN0OiBzZWxlY3Qgb25seSB0YWtlcyAxIGFyZ3VtZW50Jyk7XG4gIH1cblxuICB2YXIgZmllbGRzID0ge307XG4gIHZhciB0eXBlID0gdHlwZW9mIHNlbGVjdGlvbjtcblxuICBpZiAoJ3N0cmluZycgPT09IHR5cGUgfHwgJ29iamVjdCcgPT09IHR5cGUgJiYgJ251bWJlcicgPT09IHR5cGVvZiBzZWxlY3Rpb24ubGVuZ3RoICYmICFBcnJheS5pc0FycmF5KCBzZWxlY3Rpb24gKSkge1xuICAgIGlmICgnc3RyaW5nJyA9PT0gdHlwZSl7XG4gICAgICBzZWxlY3Rpb24gPSBzZWxlY3Rpb24uc3BsaXQoL1xccysvKTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gc2VsZWN0aW9uLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICB2YXIgZmllbGQgPSBzZWxlY3Rpb25bIGkgXTtcbiAgICAgIGlmICggIWZpZWxkICkgY29udGludWU7XG4gICAgICB2YXIgaW5jbHVkZSA9ICctJyA9PT0gZmllbGRbIDAgXSA/IDAgOiAxO1xuICAgICAgaWYgKGluY2x1ZGUgPT09IDApIGZpZWxkID0gZmllbGQuc3Vic3RyaW5nKCAxICk7XG4gICAgICBmaWVsZHNbIGZpZWxkIF0gPSBpbmNsdWRlO1xuICAgIH1cblxuICAgIHJldHVybiBmaWVsZHM7XG4gIH1cblxuICBpZiAoIHV0aWxzLmlzT2JqZWN0KCBzZWxlY3Rpb24gKSAmJiAhQXJyYXkuaXNBcnJheSggc2VsZWN0aW9uICkpIHtcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKCBzZWxlY3Rpb24gKTtcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IGtleXMubGVuZ3RoOyArK2opIHtcbiAgICAgIGZpZWxkc1sga2V5c1sgaiBdIF0gPSBzZWxlY3Rpb25bIGtleXNbIGogXSBdO1xuICAgIH1cbiAgICByZXR1cm4gZmllbGRzO1xuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBzZWxlY3QoKSBhcmd1bWVudC4gTXVzdCBiZSBzdHJpbmcgb3Igb2JqZWN0LicpO1xufTtcblxuLy8g0J7Rh9C40YHRgtC40YLRjCBpZGVudGl0eSDRgyDRgNC10YHRg9GA0YHQsCDQuCDQtdCz0L4g0YDQvtC00LjRgtC10LvRjNGB0LrQuNGFINGA0LXRgdGD0YDRgdC+0LIg0YLQvtC20LVcbnV0aWxzLmNsZWFySWRlbnRpdHkgPSBmdW5jdGlvbiBjbGVhcklkZW50aXR5KCByZXNvdXJjZSApe1xuICB3aGlsZSAoIHJlc291cmNlLnBhcmVudFJlc291cmNlICkge1xuICAgIHJlc291cmNlLmlkZW50aXR5ID0gJyc7XG4gICAgcmVzb3VyY2UgPSByZXNvdXJjZS5wYXJlbnRSZXNvdXJjZTtcbiAgfVxufTtcblxuLy8g0KHQvtCx0YDQsNGC0YwgdXJsICjQsdC10LcgcXVlcnkgc3RyaW5nKVxudXRpbHMuY29uc3RydWN0VXJsID0gZnVuY3Rpb24gY29uc3RydWN0VXJsKCByZXNvdXJjZSApe1xuICB2YXIgaWRlbnRpdHkgPSByZXNvdXJjZS5pZGVudGl0eSA/ICcvJyArIHJlc291cmNlLmlkZW50aXR5IDogJy8nO1xuXG4gIC8vINCf0YDQvtCx0LXQttCw0YLRjNGB0Y8g0L/QviDQstGB0LXQvCDRgNC10YHRg9GA0YHQsNC8LCDQsiDRgtC+0Lwg0YfQuNGB0LvQtSDQsiDQutC+0YDQtdC90Ywg0LDQv9C4LCDRh9GC0L7QsdGLINGB0L7QsdGA0LDRgtGMIHVybFxuICByZXR1cm4gcmVzb3VyY2UucGFyZW50UmVzb3VyY2VcbiAgICA/IGNvbnN0cnVjdFVybCggcmVzb3VyY2UucGFyZW50UmVzb3VyY2UgKSArICcvJyArIHJlc291cmNlLnVybCArIGlkZW50aXR5XG4gICAgOiByZXNvdXJjZS51cmw7XG59O1xuIiwiaW1wb3J0IHsgdXRpbHMgfSBmcm9tICcuL3V0aWxzLmpzJztcblxuLyoqXG4gKiBHRVQgcmVxdWVzdFxuICpcbiAqINCSIGFqYXhTZXR0aW5ncyDQvNC+0LbQvdC+INGD0LrQsNC30LDRgtGMINC/0L7Qu9C1IGRvTm90U3RvcmUgLSDRh9GC0L7QsdGLINC90LUg0YHQvtGF0YDQsNC90Y/RgtGMINC/0L7Qu9GD0YfQtdC90L3Ri9C5INC+0LHRitC10LrRgiDQsiBzdG9yYWdlXG4gKlxuICogQHBhcmFtIFtkYXRhXVxuICogQHBhcmFtIFthamF4U2V0dGluZ3NdXG4gKiBAcGFyYW0gW2RvbmVdXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFJlcXVlc3QoIGRhdGEsIGFqYXhTZXR0aW5ncywgZG9uZSApe1xuICB2YXIgcmVzb3VyY2UgPSB0aGlzO1xuICB2YXIgbWV0aG9kID0gJ0dFVCc7XG4gIHZhciBrZXk7XG5cbiAgLy8g0JXRgdC70LggZGF0YSAtINC10YHRgtGMINGE0YPQvdC60YbQuNGPLCDRgtC+INGN0YLQviBkb25lXG4gIGlmICggdXRpbHMuaXNGdW5jdGlvbiggZGF0YSApICl7XG4gICAgZG9uZSA9IGRhdGE7XG4gICAgZGF0YSA9IHVuZGVmaW5lZDtcbiAgfVxuICBpZiAoIHV0aWxzLmlzRnVuY3Rpb24oIGFqYXhTZXR0aW5ncyApICl7XG4gICAgZG9uZSA9IGFqYXhTZXR0aW5ncztcbiAgICBhamF4U2V0dGluZ3MgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBhamF4U2V0dGluZ3MgPSBhamF4U2V0dGluZ3MgfHwge307XG4gIGFqYXhTZXR0aW5ncy5kYXRhID0gZGF0YTtcblxuICBpZiAoIHJlc291cmNlLmFwaVJvb3QuZGVmYXVsdHMuY2FjaGUgKXtcbiAgICBhamF4U2V0dGluZ3MudXJsID0gdXRpbHMuY29uc3RydWN0VXJsKCByZXNvdXJjZSApO1xuXG4gICAga2V5ID0gcmVzb3VyY2UuYXBpUm9vdC5jYWNoZS5nZXRLZXkoIGFqYXhTZXR0aW5ncyApO1xuICAgIHZhciByZXEgPSByZXNvdXJjZS5hcGlSb290LmNhY2hlLmdldCgga2V5ICk7XG5cbiAgICBpZiAoIHJlcSApe1xuICAgICAgZG9uZSAmJiBkb25lKCByZXEucmVzcG9uc2UsIHJlcS50ZXh0U3RhdHVzLCByZXEuanFYSFIgKTtcbiAgICAgIHV0aWxzLmNsZWFySWRlbnRpdHkoIHJlc291cmNlICk7XG4gICAgICByZXR1cm4gJC5EZWZlcnJlZCgpLnJlc29sdmUoIHJlcS5yZXNwb25zZSwgcmVxLnRleHRTdGF0dXMsIHJlcS5qcVhIUiApO1xuICAgIH1cbiAgfVxuXG4gIHZhciBkZmQgPSAkLkRlZmVycmVkKCk7XG4gIHRoaXMuX3Jlc291cmNlUmVxdWVzdCggbWV0aG9kLCBhamF4U2V0dGluZ3MgKS5kb25lKGZ1bmN0aW9uKCByZXNwb25zZSwgdGV4dFN0YXR1cywganFYSFIgKXtcbiAgICB2YXIgZmllbGRzO1xuXG4gICAgLy8gI2V4YW1wbGVcbiAgICAvLyBhcGkucGxhY2VzKHsgZmllbGRzOiAnbmFtZScsIHNraXA6IDEwMCB9KTtcbiAgICAvLyDQldGB0LvQuCDQsdGL0LvQsCDQstGL0LHQvtGA0LrQsCDQv9C+INC/0L7Qu9GP0LwsINC90YPQttC90L4g0L/RgNCw0LLQuNC70YzQvdC+INC+0LHRgNCw0LHQvtGC0LDRgtGMINC10ZEg0Lgg0L/QtdGA0LXQtNCw0YLRjCDQsiDQtNC+0LrRg9C80LXQvdGCXG4gICAgaWYgKCBkYXRhICYmIGRhdGEuZmllbGRzICl7XG4gICAgICBmaWVsZHMgPSB1dGlscy5zZWxlY3QoIGRhdGEuZmllbGRzICk7XG4gICAgfVxuXG4gICAgLy8g0JXRgdGC0Ywg0L7RgtCy0LXRgiDQvdCw0LTQviDRgdC+0YXRgNCw0L3QuNGC0Ywg0LIg0YXRgNCw0L3QuNC70LjRidC1XG4gICAgaWYgKCByZXNvdXJjZS5zdG9yYWdlICYmICFhamF4U2V0dGluZ3MuZG9Ob3RTdG9yZSApe1xuICAgICAgcmVzcG9uc2UgPSBzdG9yYWdlWyByZXNvdXJjZS5jb2xsZWN0aW9uTmFtZSBdLmFkZCggcmVzcG9uc2UsIGZpZWxkcywgdHJ1ZSApO1xuICAgIH1cblxuICAgIGlmICggcmVzb3VyY2UuYXBpUm9vdC5kZWZhdWx0cy5jYWNoZSApe1xuICAgICAgcmVzb3VyY2UuYXBpUm9vdC5jYWNoZS5wdXQoIGtleSwge1xuICAgICAgICByZXNwb25zZTogcmVzcG9uc2UsXG4gICAgICAgIHRleHRTdGF0dXM6IHRleHRTdGF0dXMsXG4gICAgICAgIGpxWEhSOiBqcVhIUlxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZG9uZSAmJiBkb25lKCByZXNwb25zZSwgdGV4dFN0YXR1cywganFYSFIgKTtcbiAgICBkZmQucmVzb2x2ZSggcmVzcG9uc2UsIHRleHRTdGF0dXMsIGpxWEhSICk7XG5cbiAgfSkuZmFpbChmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICl7XG4gICAgZGZkLnJlamVjdCgganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICk7XG4gIH0pO1xuXG4gIC8vVE9ETzog0JjRgdC/0L7Qu9GM0LfQvtCy0LDRgtGMINC40LTQtdC+0LvQvtCz0Y4gcXVlcnk/IHF1ZXJ5INC+0LHRitC10LrRgiDQtNC70Y8g0L/QvtGB0YLRgNC+0LXQvdC40Y8g0LfQsNC/0YDQvtGB0L7QslxuXG4gIC8vIGlkZW50aXR5INGB0L7RhdGA0LDQvdGP0LXRgtGB0Y8g0LTQu9GPIGNvbnN0cnVjdFVybCwg0LXQs9C+INC90YPQttC90L4g0L7Rh9C40YHRgtC40YLRjCDQtNC70Y8g0L/QvtGB0LvQtdC00YPRjtGJ0LjRhSDQt9Cw0L/RgNC+0YHQvtCyLlxuICB1dGlscy5jbGVhcklkZW50aXR5KCByZXNvdXJjZSApO1xuXG4gIHJldHVybiBkZmQ7XG59XG4iLCJpbXBvcnQgeyB1dGlscyB9IGZyb20gJy4vdXRpbHMuanMnO1xuXG5cbmZ1bmN0aW9uIHBvc3RMaWtlUmVxdWVzdCggbWV0aG9kLCBkYXRhLCBhamF4U2V0dGluZ3MsIGRvbmUgKXtcbiAgdmFyIHJlc291cmNlID0gdGhpcztcbiAgdmFyIGlkZW50aXR5ID0gdGhpcy5pZGVudGl0eTtcbiAgdmFyIGRvY3VtZW50SWRTdHJpbmc7XG5cbiAgLy8g0JXRgdC70LggZGF0YSAtINC10YHRgtGMINGE0YPQvdC60YbQuNGPLCDRgtC+INGN0YLQviBkb25lXG4gIGlmICggdXRpbHMuaXNGdW5jdGlvbiggZGF0YSApICl7XG4gICAgZG9uZSA9IGRhdGE7XG4gICAgZGF0YSA9IHVuZGVmaW5lZDtcbiAgfVxuICBpZiAoIHV0aWxzLmlzRnVuY3Rpb24oIGFqYXhTZXR0aW5ncyApICl7XG4gICAgZG9uZSA9IGFqYXhTZXR0aW5ncztcbiAgICBhamF4U2V0dGluZ3MgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBhamF4U2V0dGluZ3MgPSBhamF4U2V0dGluZ3MgfHwge307XG5cbiAgLy8g0J/RgNC4INGB0L7RhdGA0LDQvdC10L3QuNC4INC00L7QutGD0LzQtdC90YLQsCDQvdGD0LbQvdC+INGB0L7RhdGA0LDQvdGP0YLRjCDRgtC+0LvRjNC60L4g0LjQt9C80LXQvdGR0L3QvdGL0LUg0L/QvtC70Y9cbiAgLy8g0JjQvdC+0LPQtNCwINC/0LXRgNC10LTQsNGO0YIg0LTQvtC60YPQvNC10L3RglxuICBpZiAoIHJlc291cmNlLnN0b3JhZ2UgJiYgZGF0YSBpbnN0YW5jZW9mIHN0b3JhZ2UuRG9jdW1lbnQgKSB7XG4gICAgZG9jdW1lbnRJZFN0cmluZyA9IGRhdGEuX2lkLnRvU3RyaW5nKCk7XG4gICAgZGF0YSA9IGRhdGEuJF9fZGVsdGEoKTtcblxuICAvLyDQotCw0Log0LzQvtC20L3QviDQv9C+0L3Rj9GC0YwsINGH0YLQviDQvNGLINGB0L7RhdGA0LDQvdGP0LXQvCDRgdGD0YnQtdGC0LLRg9GO0YnQuNC5INC90LAg0YHQtdGA0LLQtdGA0LUgRG9jdW1lbnRcbiAgfSBlbHNlIGlmICggcmVzb3VyY2Uuc3RvcmFnZSAmJiBzdG9yYWdlLk9iamVjdElkLmlzVmFsaWQoIGlkZW50aXR5ICkgKSB7XG4gICAgZG9jdW1lbnRJZFN0cmluZyA9IGlkZW50aXR5O1xuXG4gIC8vINCf0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuCDRh9C10YDQtdC3INC80LXRgtC+0LQgc2F2ZSgpINGDINC00L7QutGD0LzQtdC90YLQsFxuICB9IGVsc2UgaWYgKCByZXNvdXJjZS5zdG9yYWdlICYmIGRhdGEuX2lkICYmIHN0b3JhZ2UuT2JqZWN0SWQuaXNWYWxpZCggZGF0YS5faWQgKSApIHtcbiAgICBkb2N1bWVudElkU3RyaW5nID0gZGF0YS5faWQudG9TdHJpbmcoKTtcbiAgfVxuXG4gIGFqYXhTZXR0aW5ncy5kYXRhID0gZGF0YTtcblxuICB2YXIgZGZkID0gJC5EZWZlcnJlZCgpO1xuICB0aGlzLl9yZXNvdXJjZVJlcXVlc3QoIG1ldGhvZCwgYWpheFNldHRpbmdzICkuZG9uZShmdW5jdGlvbiggcmVzcG9uc2UsIHRleHRTdGF0dXMsIGpxWEhSICl7XG4gICAgdmFyIGRvYztcblxuICAgIC8vINCV0YHRgtGMINC+0YLQstC10YIg0L3QsNC00L4g0YHQvtGF0YDQsNC90LjRgtGMINCyINGF0YDQsNC90LjQu9C40YnQtVxuICAgIGlmICggcmVzb3VyY2Uuc3RvcmFnZSAmJiAhYWpheFNldHRpbmdzLmRvTm90U3RvcmUgKXtcbiAgICAgIC8vINCf0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuCDQvdGD0LbQvdC+INC+0LHQvdC+0LLQu9GP0YLRjCDQtNC+0LrRg9C80LXQvdGCXG4gICAgICAvLyDQn9C+0L/RgNC+0LHRg9C10Lwg0YHQvdCw0YfQsNC70LAg0L3QsNC50YLQuCDQtNC+0LrRg9C80LXQvdGCINC/0L4gaWQg0Lgg0L7QsdC90L7QstC40YLRjCDQtdCz0L5cbiAgICAgIGRvYyA9IHN0b3JhZ2VbIHJlc291cmNlLmNvbGxlY3Rpb25OYW1lIF0uZmluZEJ5SWQoIGRvY3VtZW50SWRTdHJpbmcgKTtcblxuICAgICAgaWYgKCBkb2MgKXtcbiAgICAgICAgLy8g0J7QsdC90L7QstC70Y/QtdC8INC00L7QutGD0LzQtdC90YJcbiAgICAgICAgZG9jLnNldCggcmVzcG9uc2UgKTtcblxuICAgICAgICAvLyDQodC+0LfQtNCw0ZHQvCDRgdGB0YvQu9C60YMg0L/QviDQvdC+0LLQvtC80YMgaWQg0LIg0LrQvtC70LvQtdC60YbQuNC4XG4gICAgICAgIHN0b3JhZ2VbIHJlc291cmNlLmNvbGxlY3Rpb25OYW1lIF0udXBkYXRlSWRMaW5rKCBkb2MgKTtcblxuICAgICAgICAvLyDQrdGC0L7RgiDQtNC+0LrRg9C80LXQvdGCINGC0LXQv9C10YDRjCDRgdC+0YXRgNCw0L3RkdC9INC90LAg0YHQtdGA0LLQtdGA0LUsINC30L3QsNGH0LjRgiDQvtC9INGD0LbQtSDQvdC1INC90L7QstGL0LkuXG4gICAgICAgIGRvYy5pc05ldyA9IGZhbHNlO1xuXG4gICAgICAgIHJlc3BvbnNlID0gZG9jO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNwb25zZSA9IHN0b3JhZ2VbIHJlc291cmNlLmNvbGxlY3Rpb25OYW1lIF0uYWRkKCByZXNwb25zZSwgdW5kZWZpbmVkLCB0cnVlICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZG9uZSAmJiBkb25lKCByZXNwb25zZSwgdGV4dFN0YXR1cywganFYSFIgKTtcbiAgICBkZmQucmVzb2x2ZSggcmVzcG9uc2UsIHRleHRTdGF0dXMsIGpxWEhSICk7XG5cbiAgfSkuZmFpbChmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICl7XG4gICAgZGZkLnJlamVjdCgganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICk7XG4gIH0pO1xuXG4gIC8vIGlkZW50aXR5INGB0L7RhdGA0LDQvdGP0LXRgtGB0Y8g0LTQu9GPIGNvbnN0cnVjdFVybCwg0LXQs9C+INC90YPQttC90L4g0L7Rh9C40YHRgtC40YLRjCDQtNC70Y8g0L/QvtGB0LvQtdC00YPRjtGJ0LjRhSDQt9Cw0L/RgNC+0YHQvtCyLlxuICB1dGlscy5jbGVhcklkZW50aXR5KCByZXNvdXJjZSApO1xuXG4gIHJldHVybiBkZmQ7XG59XG5cbi8vIFBhcnRpYWwgQXBwbGljYXRpb25cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQb3N0TGlrZVJlcXVlc3QoIG1ldGhvZCApe1xuICByZXR1cm4gZnVuY3Rpb24oKXtcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKCBhcmd1bWVudHMgKTtcblxuICAgIHJldHVybiBwb3N0TGlrZVJlcXVlc3QuYXBwbHkoIHRoaXMsIFsgbWV0aG9kIF0uY29uY2F0KCBhcmdzICkgKTtcbiAgfTtcbn1cbiIsImltcG9ydCB7IHV0aWxzIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWxldGVSZXF1ZXN0KCBkYXRhLCBhamF4U2V0dGluZ3MsIGRvbmUgKXtcbiAgdmFyIHJlc291cmNlID0gdGhpcztcbiAgdmFyIG1ldGhvZCA9ICdERUxFVEUnO1xuXG4gIC8vINCV0YHQu9C4IGRhdGEgLSDQtdGB0YLRjCDRhNGD0L3QutGG0LjRjywg0YLQviDRjdGC0L4gZG9uZVxuICBpZiAoIHV0aWxzLmlzRnVuY3Rpb24oIGRhdGEgKSApe1xuICAgIGRvbmUgPSBkYXRhO1xuICAgIGRhdGEgPSB1bmRlZmluZWQ7XG4gIH1cbiAgaWYgKCB1dGlscy5pc0Z1bmN0aW9uKCBhamF4U2V0dGluZ3MgKSApe1xuICAgIGRvbmUgPSBhamF4U2V0dGluZ3M7XG4gICAgYWpheFNldHRpbmdzID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgYWpheFNldHRpbmdzID0gYWpheFNldHRpbmdzIHx8IHt9O1xuICBhamF4U2V0dGluZ3MuZGF0YSA9IGRhdGE7XG5cbiAgdmFyIGRmZCA9ICQuRGVmZXJyZWQoKTtcbiAgdGhpcy5fcmVzb3VyY2VSZXF1ZXN0KCBtZXRob2QsIGFqYXhTZXR0aW5ncyApLmRvbmUoZnVuY3Rpb24oIHJlc3BvbnNlLCB0ZXh0U3RhdHVzLCBqcVhIUiApe1xuICAgIGRvbmUgJiYgZG9uZSggcmVzcG9uc2UsIHRleHRTdGF0dXMsIGpxWEhSICk7XG4gICAgZGZkLnJlc29sdmUoIHJlc3BvbnNlLCB0ZXh0U3RhdHVzLCBqcVhIUiApO1xuXG4gIH0pLmZhaWwoZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApe1xuICAgIGRmZC5yZWplY3QoIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApO1xuICB9KTtcblxuICAvLyBpZGVudGl0eSDRgdC+0YXRgNCw0L3Rj9C10YLRgdGPINC00LvRjyBjb25zdHJ1Y3RVcmwsINC10LPQviDQvdGD0LbQvdC+INC+0YfQuNGB0YLQuNGC0Ywg0LTQu9GPINC/0L7RgdC70LXQtNGD0Y7RidC40YUg0LfQsNC/0YDQvtGB0L7Qsi5cbiAgdXRpbHMuY2xlYXJJZGVudGl0eSggcmVzb3VyY2UgKTtcblxuICByZXR1cm4gZGZkO1xufVxuIiwiaW1wb3J0IHsgdXRpbHMgfSBmcm9tICcuL3V0aWxzLmpzJztcblxuZXhwb3J0IGZ1bmN0aW9uIENhY2hlKCl7XG4gIHRoaXMuZGF0YSA9IHt9O1xufVxuXG5DYWNoZS5wcm90b3R5cGUuZ2V0S2V5ID0gZnVuY3Rpb24oIGFqYXhTZXR0aW5ncyApe1xuICB2YXIga2V5ID0gJyc7XG4gIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgT2JqZWN0LmtleXMoIGFqYXhTZXR0aW5ncyApLmZvckVhY2goZnVuY3Rpb24oIGsgKXtcbiAgICB2YXIgdmFsdWUgPSBhamF4U2V0dGluZ3NbIGsgXTtcblxuICAgIGtleSArPSBrICsgJz0nICsgKHV0aWxzLmlzT2JqZWN0KCB2YWx1ZSApID8gJ3snICsgX3RoaXMuZ2V0S2V5KCB2YWx1ZSApICsgJ30nIDogdmFsdWUpICsgJ3wnO1xuICB9KTtcblxuICByZXR1cm4ga2V5O1xufTtcblxuQ2FjaGUucHJvdG90eXBlLnB1dCA9IGZ1bmN0aW9uKCBrZXksIGRhdGEgKXtcbiAgdGhpcy5kYXRhWyBrZXkgXSA9IHtcbiAgICBjcmVhdGVkOiBuZXcgRGF0ZSgpLFxuICAgIGRhdGE6IGRhdGFcbiAgfTtcbn07XG5cbkNhY2hlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbigga2V5ICl7XG4gIHZhciByZXN1bHQ7XG4gIHJlc3VsdCA9IHRoaXMuZGF0YVsga2V5IF07XG4gIGlmICggIXJlc3VsdCApIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBjYWNoZWQgZmxhZ1xuICByZXN1bHQuZGF0YS5yZXNwb25zZS5fX2NhY2hlZCA9IHRydWU7XG5cbiAgLy9pZiAoIHRoaXMudmFsaWQocmVzdWx0LmNyZWF0ZWQpICl7XG4gICAgcmV0dXJuIHJlc3VsdC5kYXRhO1xuICAvL31cbn07XG5cbkNhY2hlLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCAgKXtcbiAgdGhpcy5kYXRhID0ge307XG59O1xuIiwiLy8gQVBJIENsaWVudFxuLy8gLS0tLS0tLS0tLS0tLS0tXG5cbi8vIEV4YW1wbGVcbi8qXG4gdmFyIGdpdGh1YiA9IEFwaUNsaWVudCgnaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbScsIHtcbiAgIGhvb2tzOiB7XG4gICAgIGhlYWRlcnM6IHtcbiAgICAgICBBY2NlcHQ6ICdhcHBsaWNhdGlvbi92bmQuZ2l0aHViLnYzK2pzb24nLFxuICAgICAgIEF1dGhvcml6YXRpb246ICd0b2tlbiA4ZmJmYzU0MGYxZWQxNDE3MDgzYzcwYTk5MGI0ZGIzYzlhYTg2ZWZlJ1xuICAgICB9XG4gICB9XG4gfSk7XG5cbiBnaXRodWIuYWRkKCdzZWFyY2gnLCB7XG4gIHNlYXJjaE1ldGhvZDogZnVuY3Rpb24oKXtcbiAgICBjb25zb2xlLmxvZyggJ3NlYXJjaDo6c2VhcmNoTWV0aG9kJyApO1xuICB9XG4gfSk7XG4gZ2l0aHViLnNlYXJjaC5hZGQoJ3VzZXJzJywge1xuICB1c2Vyc01ldGhvZDogZnVuY3Rpb24oKXtcbiAgICB0aGlzLnBhcmVudC5zZWFyY2hNZXRob2QoKTtcbiAgfVxuIH0pO1xuXG4gLy8g0JTQvtCx0LDQstC70Y/QtdC8INGA0LXRgdGD0YDRgdGLXG4gZ2l0aHViLmFkZCgndXNlcicpO1xuIGdpdGh1Yi5hZGQoJ3VzZXJzJyk7XG4gZ2l0aHViLnVzZXJzLmFkZCgncmVwb3MnKTtcblxuIC8vINCf0YDQvtGH0LjRgtCw0YLRjCDRgNC10L/QvtC30LjRgtC+0YDQuNC4ICjQvtGC0L/RgNCw0LLQuNGC0Ywg0LPQtdGCINC30LDQv9GA0L7RgSDQvdCwIGh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vdXNlcnMvcmVwb3MvKVxuIGdpdGh1Yi51c2Vycy5yZXBvcy5yZWFkKCk7XG5cbiAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAvLyDQndC1INGB0L7QstGB0LXQvCBSRVNULCDQstGB0LUg0LfQsNC/0YDQvtGB0Ysg0LjQtNGD0YIg0L3QsCDQvtC00LjQvSDQsNC00YDQtdGBXG4gdmFyIHNpbXBsZUFwaSA9IEFwaUNsaWVudCgnYXBpLmV4YW1wbGUuY29tJywge30pO1xuXG4gc2ltcGxlQXBpKCkucmVhZCh7XG4gIGU6ICcvQmFzZS9EZXBhcnRtZW50J1xuIH0pO1xuXG4gc2ltcGxlQXBpLnBvc3QoeyBkYXRhIH0pO1xuIHNpbXBsZUFwaSgnaWRlbnRpdHknKS5wb3N0KHsgZGF0YSB9LCB7IGFqYXhTZXR0aW5ncyB9KTtcbiBzaW1wbGVBcGkoJ2lkZW50aXR5JykucG9zdCggbnVsbCwgeyBhamF4U2V0dGluZ3MgfSk7XG4gc2ltcGxlQXBpLnBvc3QoeyBkYXRhIH0sIHsgYWpheFNldHRpbmdzIH0pO1xuIHNpbXBsZUFwaS5wb3N0KCBudWxsLCB7IGFqYXhTZXR0aW5ncyB9KTtcblxuIHNpbXBsZUFwaS5yZWFkKCBkb25lICkuZG9uZSggZG9uZSApLmZhaWwoIGZhaWwgKTtcblxuINCg0LDQsdC+0YLQsCDRgSDQtNC+0LrRg9C80LXQvdGC0LDQvNC4IChzdG9yYWdlKSwg0L7QvSDRgdCw0Lwg0L/RgNC10L7QsdGA0LDQt9GD0LXRgtGB0Y8g0YfQtdGA0LXQtyDQvNC10YLQvtC0ICRfX2RlbHRhKClcbiBzaW1wbGVBcGkucG9zdCggRG9jdW1lbnQgKTtcbiBzaW1wbGVBcGkuc2F2ZSggRG9jdW1lbnQgKTtcblxuXG4gLy8g0KTQuNGH0LhcbiBhamF4U2V0dGluZ3Mg0LTQu9GPINC60LDQttC00L7Qs9C+INC30LDQv9GA0L7RgdCwXG4gSWRlbnRpdHkg0LTQu9GPINC60LDQttC00L7Qs9C+INC30LDQv9GA0L7RgdCwXG5cbiAqL1xuXG5pbXBvcnQgeyB1dGlscyB9IGZyb20gJy4vdXRpbHMuanMnO1xuaW1wb3J0IHsgZ2V0UmVxdWVzdCB9IGZyb20gJy4vZ2V0LmpzJztcbmltcG9ydCB7IGNyZWF0ZVBvc3RMaWtlUmVxdWVzdCB9IGZyb20gJy4vcG9zdC5qcyc7XG5pbXBvcnQgeyBkZWxldGVSZXF1ZXN0IH0gZnJvbSAnLi9kZWxldGUuanMnO1xuaW1wb3J0IHsgQ2FjaGUgfSBmcm9tICcuL2NhY2hlLmpzJztcblxudmFyIHJlc291cmNlTWl4aW4gPSB7XG4gIHJlc291cmNlTmFtZTogJ3Jlc291cmNlJyxcbiAgdXJsOiAnJywgLy8gPSByZXNvdXJjZU5hbWVcblxuICAvKipcbiAgICog0JTQvtCx0LDQstC40YLRjCDQvdC+0LLRi9C5INGA0LXRgdGD0YDRgVxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gcmVzb3VyY2VOYW1lXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbcGFyZW50UmVzb3VyY2VdIC0g0YDQvtC00LjRgtC10LvRjNGB0LrQuNC5INGA0LXRgdGD0YDRgVxuICAgKiBAcGFyYW0ge29iamVjdH0gW3VzZXJzTWl4aW5dIC0g0L/QvtC70YzQt9C+0LLQsNGC0LXQu9GM0YHQutCw0Y8g0L/RgNC40LzQtdGB0YxcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBhZGQ6IGZ1bmN0aW9uKCByZXNvdXJjZU5hbWUsIHBhcmVudFJlc291cmNlLCB1c2Vyc01peGluICl7XG4gICAgaWYgKCAhdXNlcnNNaXhpbiApIHtcbiAgICAgIHVzZXJzTWl4aW4gPSBwYXJlbnRSZXNvdXJjZSB8fCB7fTtcbiAgICAgIHBhcmVudFJlc291cmNlID0gdGhpcztcbiAgICB9XG5cbiAgICAvLyDQkdGA0L7RgdC40YLRjCDQuNGB0LrQu9GO0YfQtdC90LjQtSwg0LXRgdC70Lgg0YLQsNC60L7QuSDRgNC10YHRg9GA0YEg0YPQttC1INC10YHRgtGMXG4gICAgaWYgKCB0aGlzWyByZXNvdXJjZU5hbWUgXSApe1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIHJlc291cmNlIG5hbWVkICcgKyByZXNvdXJjZU5hbWUgKyAnYWxyZWFkeSBleGlzdHMuJyk7XG4gICAgfVxuXG4gICAgLy8g0JvRjtCx0L7QuSDQuNC3INGN0YLQuNGFINC/0LDRgNCw0LzQtdGC0YDQvtCyINGD0LrQsNC30YvQstCw0LXRgiDQvdCwINC90LXQvtCx0YXQvtC00LjQvNC+0YHRgtGMINC40YHQv9C+0LvRjNC30L7QstCw0YLRjCDRhdGA0LDQvdC40LvQuNGJ0LVcbiAgICBpZiAoIHVzZXJzTWl4aW4uc2NoZW1hTmFtZSB8fCB1c2Vyc01peGluLmNvbGxlY3Rpb25OYW1lIHx8IHVzZXJzTWl4aW4uc3RvcmFnZSApIHtcbiAgICAgIC8vINCe0L/RgNC10LTQtdC70LjQvCDQvdCw0LfQstCw0L3QuNC1INGB0L7Qt9C00LDQstCw0LXQvNC+0Lkg0LrQvtC70LvQtdC60YbQuNC4XG4gICAgICB1c2Vyc01peGluLmNvbGxlY3Rpb25OYW1lID0gdXNlcnNNaXhpbi5jb2xsZWN0aW9uTmFtZSB8fCByZXNvdXJjZU5hbWU7XG4gICAgfVxuXG4gICAgLy8g0J/QtdGA0LXQtCDRgdC+0LfQtNCw0L3QuNC10Lwg0LrQvtC70LvQtdC60YbQuNC4INC90YPQttC90L4g0YHQvtC30LTQsNGC0Ywg0YDQtdGB0YPRgNGBLCDRh9GC0L7QsdGLINGDINC60L7Qu9C70LXQutGG0LjQuCDQsdGL0LvQsCDRgdGB0YvQu9C60LAg0L3QsCDQvdC10LPQvlxuICAgIHRoaXNbIHJlc291cmNlTmFtZSBdID0gbmV3IFJlc291cmNlKCByZXNvdXJjZU5hbWUsIHBhcmVudFJlc291cmNlLCB1c2Vyc01peGluICk7XG5cbiAgICAvLyDQodC+0LfQtNCw0YLRjCDQutC+0LvQu9C10LrRhtC40Y4sINC10YHQu9C4INGN0YLQvtCz0L4g0LXRidC1INC90LUg0YHQtNC10LvQsNC70LhcbiAgICBpZiAoIHVzZXJzTWl4aW4uY29sbGVjdGlvbk5hbWUgJiYgIXN0b3JhZ2VbIHVzZXJzTWl4aW4uY29sbGVjdGlvbk5hbWUgXSApe1xuICAgICAgLy8g0JjRidC10Lwg0YHRhdC10LzRgywg0LXRgdC70Lgg0L7QvdCwINGD0LrQsNC30LDQvdCwXG4gICAgICB2YXIgc2NoZW1hID0gc3RvcmFnZS5zY2hlbWFzWyB1c2Vyc01peGluLnNjaGVtYU5hbWUgXTtcblxuICAgICAgaWYgKCBzY2hlbWEgKXtcbiAgICAgICAgc3RvcmFnZS5jcmVhdGVDb2xsZWN0aW9uKCB1c2Vyc01peGluLmNvbGxlY3Rpb25OYW1lLCBzY2hlbWEsIHRoaXNbIHJlc291cmNlTmFtZSBdICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdSZXNvdXJjZTo6JyArIHJlc291cmNlTmFtZSArICcgWW91IGNhbm5vdCB1c2Ugc3RvcmFnZSAoY3JlYXRlIGNvbGxlY3Rpb24pLCB3aXRob3V0IHNwZWNpZnlpbmcgdGhlIHNjaGVtYSBvZiB0aGUgZGF0YS4nKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1sgcmVzb3VyY2VOYW1lIF07XG4gIH0sXG5cbiAgX3Jlc291cmNlUmVxdWVzdDogZnVuY3Rpb24oIG1ldGhvZCwgYWpheFNldHRpbmdzLCBkb25lICl7XG4gICAgdmFyIHVybCA9IHV0aWxzLmNvbnN0cnVjdFVybCggdGhpcyApO1xuICAgIHZhciB1c2VOb3RpZmljYXRpb25zID0gdGhpcy5ub3RpZmljYXRpb25zO1xuXG4gICAgcmV0dXJuIHRoaXMuYXBpUm9vdC5fcmVxdWVzdCggbWV0aG9kLCB1cmwsIGFqYXhTZXR0aW5ncy5kYXRhLCBhamF4U2V0dGluZ3MsIHVzZU5vdGlmaWNhdGlvbnMsIGRvbmUgKTtcbiAgfVxufTtcblxuLy8gR0VUXG5yZXNvdXJjZU1peGluLmdldCA9IGdldFJlcXVlc3Q7XG5yZXNvdXJjZU1peGluLnJlYWQgPSBnZXRSZXF1ZXN0O1xuXG4vLyBQT1NUXG5yZXNvdXJjZU1peGluLnBvc3QgPSBjcmVhdGVQb3N0TGlrZVJlcXVlc3QoJ1BPU1QnKTtcbnJlc291cmNlTWl4aW4uY3JlYXRlID0gcmVzb3VyY2VNaXhpbi5wb3N0O1xuXG4vLyBQVVRcbnJlc291cmNlTWl4aW4ucHV0ID0gY3JlYXRlUG9zdExpa2VSZXF1ZXN0KCdQVVQnKTtcbnJlc291cmNlTWl4aW4udXBkYXRlID0gcmVzb3VyY2VNaXhpbi5wdXQ7XG5yZXNvdXJjZU1peGluLnNhdmUgPSByZXNvdXJjZU1peGluLnB1dDtcblxuLy8gUEFUQ0hcbnJlc291cmNlTWl4aW4ucGF0Y2ggPSBjcmVhdGVQb3N0TGlrZVJlcXVlc3QoJ1BBVENIJyk7XG5cbi8vIERFTEVURVxucmVzb3VyY2VNaXhpbi5kZWxldGUgPSBkZWxldGVSZXF1ZXN0O1xuXG4vKipcbiAqINCa0L7QvdGB0YLRgNGD0LrRgtC+0YAg0YDQtdGB0YPRgNGB0LAsINC90L4g0LLQvtC30LLRgNCw0YnQsNC10YIg0YTRg9C90LrRhtC40Y4g0YHQviDRgdCy0L7QudGB0YLQstCw0LzQuFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSByZXNvdXJjZU5hbWVcbiAqIEBwYXJhbSB7b2JqZWN0fSBwYXJlbnRSZXNvdXJjZVxuICogQHBhcmFtIHtvYmplY3R9IHVzZXJzTWl4aW5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gcmVzb3VyY2VcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBSZXNvdXJjZSggcmVzb3VyY2VOYW1lLCBwYXJlbnRSZXNvdXJjZSwgdXNlcnNNaXhpbiApe1xuXG4gIC8qKlxuICAgKiDQrdGC0YMg0YTRg9C90LrRhtC40Y4g0LzRiyDQvtGC0LTQsNGR0Lwg0L/QvtC70YzQt9C+0LLQsNGC0LXQu9GOINCyINC60LDRh9C10YHRgtCy0LUg0LTQvtGB0YLRg9C/0LAg0Log0YDQtdGB0YPRgNGB0YMuXG4gICAqINCe0L3QsCDQv9C+0LfQstC+0LvRj9C10YIg0LfQsNC00LDRgtGMIGlkZW50aXR5INC00LvRjyDQt9Cw0L/RgNC+0YHQsC5cbiAgICpcbiAgICogQHBhcmFtIFtpZGVudGl0eV1cbiAgICogQHJldHVybnMge0Z1bmN0aW9ufVxuICAgKi9cbiAgdmFyIHJlc291cmNlID0gZnVuY3Rpb24gcmVzb3VyY2UoIGlkZW50aXR5ICl7XG4gICAgaWYgKCBpZGVudGl0eSA9PSBudWxsICl7XG4gICAgICByZXR1cm4gcmVzb3VyY2U7XG4gICAgfVxuXG4gICAgaWYgKCBpZGVudGl0eSAmJiAhdXRpbHMuaXNTdHJpbmcoIGlkZW50aXR5ICkgKXtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ2lkZW50aXR5INC00L7Qu9C20LXQvSDQsdGL0YLRjCDRgdGC0YDQvtC60L7QuSwg0LAg0L3QtScsIGlkZW50aXR5ICk7XG4gICAgfVxuXG4gICAgcmVzb3VyY2UuaWRlbnRpdHkgPSBpZGVudGl0eSB8fCAnJztcblxuICAgIHJldHVybiByZXNvdXJjZTtcbiAgfTtcblxuICAkLmV4dGVuZCggcmVzb3VyY2UsIHJlc291cmNlTWl4aW4sIHtcbiAgICByZXNvdXJjZU5hbWU6IHJlc291cmNlTmFtZSxcbiAgICB1cmw6IHJlc291cmNlTmFtZVxuICB9LCB1c2Vyc01peGluICk7XG5cbiAgcmVzb3VyY2UucGFyZW50UmVzb3VyY2UgPSBwYXJlbnRSZXNvdXJjZTtcbiAgcmVzb3VyY2UuYXBpUm9vdCA9IHBhcmVudFJlc291cmNlLmFwaVJvb3QgfHwgcGFyZW50UmVzb3VyY2U7XG5cbiAgcmV0dXJuIHJlc291cmNlO1xufVxuXG4vKipcbiAqIENyZWF0ZSBuZXcgYXBpIGNsaWVudFxuICpcbiAqIEBleGFtcGxlXG4gKiB2YXIgYXBpID0gbmV3IEFwaUNsaWVudCgnL2FwaScsIHtcbiAqICAgaG9va3M6IHtcbiAqICAgICBoZWFkZXJzOiB7XG4gKiAgICAgICB0b2tlbjogJ1hYWFhYWCdcbiAqICAgICB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIHZhciBhcGkgPSBuZXcgQXBpQ2xpZW50KCdodHRwczovL2RvbWFpbi5jb20vYXBpJywge1xuICogICBob29rczoge1xuICogICAgIGhlYWRlcnM6IHtcbiAqICAgICAgIHRva2VuOiAnWFhYWFhYJ1xuICogICAgIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogdmFyIGFwaSA9IG5ldyBBcGlDbGllbnQoe1xuICogICB1cmw6ICcvYXBpJ1xuICogICBob29rczoge1xuICogICAgIGhlYWRlcnM6IHtcbiAqICAgICAgIHRva2VuOiAnWFhYWFhYJ1xuICogICAgIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogQHBhcmFtIHVybCBhcGkgcm9vdCB1cmxcbiAqIEBwYXJhbSBvcHRpb25zIGFwaSBjbGllbnQgb3B0aW9uc1xuICovXG5mdW5jdGlvbiBBcGlDbGllbnQoIHVybCwgb3B0aW9ucyApe1xuICBpZiAoICEodGhpcyBpbnN0YW5jZW9mIEFwaUNsaWVudCkgKSB7XG4gICAgcmV0dXJuIG5ldyBBcGlDbGllbnQoIHVybCwgb3B0aW9ucyApO1xuICB9XG5cbiAgdGhpcy5kZWZhdWx0cyA9IHtcbiAgICAvLyBTdHJpcCBzbGFzaGVzIGJ5IGRlZmF1bHRcbiAgICBzdHJpcFRyYWlsaW5nU2xhc2hlczogdHJ1ZSxcbiAgICAvLyBVc2UgY2FjaGUgZm9yIEdFVCByZXF1ZXN0c1xuICAgIGNhY2hlOiB0cnVlXG4gIH07XG5cbiAgLy8gSWYgZmlyc3QgYXJnIGlzIG9iamVjdFxuICBpZiAoIHV0aWxzLmlzT2JqZWN0KCB1cmwgKSApe1xuICAgIG9wdGlvbnMgPSB1cmw7XG4gICAgdXJsID0gbG9jYXRpb24ub3JpZ2luO1xuICB9XG5cbiAgaWYgKCB1cmwgPT0gbnVsbCApe1xuICAgIHVybCA9IGxvY2F0aW9uLm9yaWdpbjtcbiAgfVxuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBvcHRpb25zLnVybCA9IHVybDtcblxuICAvLyBEZWZhdWx0cywgbm90aWZpY2F0aW9ucyBpcyBvZmZcbiAgdGhpcy5ub3RpZmljYXRpb25zID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIGhvb2tzIGZvciBhamF4IHNldHRpbmdzIChhcyBiYXNlIGFqYXhTZXR0aW5ncylcbiAgICogQHNlZSBodHRwOi8vYXBpLmpxdWVyeS5jb20valF1ZXJ5LmFqYXgvXG4gICAqXG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqL1xuICB0aGlzLmhvb2tzID0ge1xuICAgIC8vINC00L7Qv9C+0LvQvdC40YLQtdC70YzQvdGL0LUg0LTQsNC90L3Ri9C1INC30LDQv9GA0L7RgdCwXG4gICAgZGF0YToge30sXG4gICAgLy8g0J7QsdGK0LXQutGCINC00LvRjyDQtNC+0LHQsNCy0LvQtdC90LjRjyDQv9GA0L7QuNC30LLQvtC70YzQvdGL0YUg0LfQsNCz0L7Qu9C+0LLQutC+0LIg0LrQviDQstGB0LXQvCDQt9Cw0L/RgNC+0YHQsNC8XG4gICAgLy8g0YPQtNC+0LHQvdC+INC00LvRjyDQsNCy0YLQvtGA0LjQt9Cw0YbQuNC4INC/0L4g0YLQvtC60LXQvdCw0LxcbiAgICBoZWFkZXJzOiB7fVxuICB9O1xuXG4gIC8vdG9kbzogdG8gdXRpbHMgKGRlZXBNZXJnZSkg0LTQvtCx0LDQstC40YLRjCDQstC+0LfQvNC+0LbQvdC+0YHRgtGMINGA0LDRgdGI0LjRgNGP0YLRjCDQvtCx0YrQtdC60YIsINCwINC90LUg0LLQvtC30LLRgNCw0YnQsNGC0Ywg0L3QvtCy0YvQuVxuICAkLmV4dGVuZCggdHJ1ZSwgdGhpcywgb3B0aW9ucyApO1xuXG4gIC8vIEluaXQgY2FjaGVcbiAgaWYgKCB0aGlzLmRlZmF1bHRzLmNhY2hlICl7XG4gICAgdGhpcy5jYWNoZSA9IG5ldyBDYWNoZSgpO1xuICB9XG59XG5cbkFwaUNsaWVudC5wcm90b3R5cGUgPSB7XG4gIC8qKlxuICAgKiDQlNC+0LHQsNCy0LjRgtGMINC90L7QstGL0Lkg0YDQtdGB0YPRgNGBXG4gICAqIEBzZWUgcmVzb3VyY2VNaXhpbi5hZGRcbiAgICovXG4gIGFkZDogcmVzb3VyY2VNaXhpbi5hZGQsXG5cbiAgX21ldGhvZHM6IHtcbiAgICAnY3JlYXRlJzogJ1BPU1QnLFxuICAgICdyZWFkJzogICAnR0VUJyxcbiAgICAndXBkYXRlJzogJ1BVVCcsXG4gICAgJ2RlbGV0ZSc6ICdERUxFVEUnLFxuICAgICdwYXRjaCc6ICAnUEFUQ0gnLFxuXG4gICAgJ3Bvc3QnOiAgICdQT1NUJyxcbiAgICAnZ2V0JzogICAgJ0dFVCcsXG4gICAgJ3NhdmUnOiAgICdQVVQnXG4gIH0sXG5cbiAgX3ByZXBhcmVBamF4U2V0dGluZ3M6IGZ1bmN0aW9uKCBtZXRob2QsIHVybCwgZGF0YSwgYWpheFNldHRpbmdzICl7XG4gICAgdmFyIF9hamF4U2V0dGluZ3MgPSB1dGlscy5kZWVwTWVyZ2UoIHRoaXMuaG9va3MsIGFqYXhTZXR0aW5ncyApO1xuXG4gICAgX2FqYXhTZXR0aW5ncy50eXBlID0gbWV0aG9kO1xuXG4gICAgLy8gc3RyaXAgdHJhaWxpbmcgc2xhc2hlcyBhbmQgc2V0IHRoZSB1cmwgKHVubGVzcyB0aGlzIGJlaGF2aW9yIGlzIHNwZWNpZmljYWxseSBkaXNhYmxlZClcbiAgICBpZiAoIHRoaXMuZGVmYXVsdHMuc3RyaXBUcmFpbGluZ1NsYXNoZXMgKXtcbiAgICAgIHVybCA9IHVybC5yZXBsYWNlKC9cXC8rJC8sICcnKSB8fCAnLyc7XG4gICAgfVxuXG4gICAgX2FqYXhTZXR0aW5ncy51cmwgPSB1cmw7XG5cbiAgICAvLyDQlNC+0LHQsNCy0LvRj9C10Lwg0LDQstGC0L7RgNC40LfQsNGG0LjRjiDQv9C+INGC0L7QutC10L3Rg1xuICAgIGlmICggdGhpcy50b2tlbiAmJiBhamF4U2V0dGluZ3MuaGVhZGVycyAmJiBhamF4U2V0dGluZ3MuaGVhZGVycy50b2tlbiA9PSBudWxsICl7XG4gICAgICBfYWpheFNldHRpbmdzLmhlYWRlcnMuQXV0aG9yaXphdGlvbiA9ICd0b2tlbiAnICsgdGhpcy50b2tlbjtcbiAgICB9XG5cbiAgICBpZiAoIG1ldGhvZCA9PT0gJ0dFVCcgKXtcbiAgICAgIF9hamF4U2V0dGluZ3MuZGF0YSA9IHV0aWxzLmRlZXBNZXJnZSggX2FqYXhTZXR0aW5ncy5kYXRhLCBkYXRhICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vINCV0YHQu9C4INGB0L7RhdGA0LDQvdGP0LXQvCDQtNC+0LrRg9C80LXQvdGCLCDQvdGD0LbQvdC+INGB0LTQtdC70LDRgtGMIHRvT2JqZWN0KHtkZXBvcHVsYXRlOiAxfSlcbiAgICAgIGlmICggZGF0YSAmJiBkYXRhLmNvbnN0cnVjdG9yICYmIGRhdGEuY29uc3RydWN0b3IubmFtZSAmJiBkYXRhLmNvbnN0cnVjdG9yLm5hbWUgPT09ICdEb2N1bWVudCcgKXtcbiAgICAgICAgX2FqYXhTZXR0aW5ncy5kYXRhID0gdXRpbHMuZGVlcE1lcmdlKCBfYWpheFNldHRpbmdzLmRhdGEsIGRhdGEudG9PYmplY3Qoe2RlcG9wdWxhdGU6IDF9KSApO1xuXG4gICAgICB9IGVsc2UgaWYgKCBkYXRhICkge1xuICAgICAgICBfYWpheFNldHRpbmdzLmRhdGEgPSB1dGlscy5kZWVwTWVyZ2UoIF9hamF4U2V0dGluZ3MuZGF0YSwgZGF0YSApO1xuICAgICAgfVxuXG4gICAgICBpZiAoIF9hamF4U2V0dGluZ3MuZGF0YSAmJiBfYWpheFNldHRpbmdzLmNvbnRlbnRUeXBlID09PSAnYXBwbGljYXRpb24vanNvbicgKXtcbiAgICAgICAgX2FqYXhTZXR0aW5ncy5kYXRhID0gSlNPTi5zdHJpbmdpZnkoIF9hamF4U2V0dGluZ3MuZGF0YSApO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHRvZG8g0L/RgNC+0LLQtdGA0YLRjCDQvdCw0LTQvtCx0L3QvtGB0YLRjCDQutC+0LTQsFxuICAgIC8vINCY0YHQv9C+0LvRjNC30YPQtdGC0YHRjyDQtNC70Y8g0LDQu9C40LDRgdC+0LIsINCyINC60L7RgtC+0YDRi9GFINCy0YLQvtGA0L7QuSDQv9Cw0YDQsNC80LXRgtGAIC0g0LXRgdGC0Ywg0L7QsdGK0LXQutGCINC90LDRgdGC0YDQvtC10LpcbiAgICBpZiAoIHV0aWxzLmlzT2JqZWN0KCB1cmwgKSApe1xuICAgICAgY29uc29sZS5pbmZvKCfQkNGFQCrRgtGMLCDQvdGD0LbQvdGL0Lkg0LrQvtC0ISEhIScpO1xuICAgICAgX2FqYXhTZXR0aW5ncyA9IHVybDtcbiAgICAgIGRlYnVnZ2VyO1xuICAgIH1cblxuICAgIHJldHVybiBfYWpheFNldHRpbmdzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZW5kIHJlcXVlc3Qgb24gc2VydmVyXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtZXRob2Qg0J3QsNC30LLQsNC90LjQtSDQvNC10YLQvtC00LAgKFBPU1QsIEdFVCwgUFVULCBERUxFVEUsIFBBVENIKVxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXJsINCf0L7Qu9C90YvQuSDRg9GA0Lsg0YDQtdGB0YPRgNGB0LBcbiAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEg0J7QsdGK0LXQutGCINGBINC00LDQvdC90YvQvNC4INC00LvRjyDQt9Cw0L/RgNC+0YHQsFxuICAgKiBAcGFyYW0ge29iamVjdH0gYWpheFNldHRpbmdzINCe0LHRitC10LrRgiDRgSDQvdCw0YHRgtGA0L7QudC60LDQvNC4XG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gdXNlTm90aWZpY2F0aW9ucyDQpNC70LDQsywg0LjRgdC/0L7Qu9GM0LfQvtCy0LDRgtGMINC70Lgg0YPQstC10LTQvtC80LvQtdC90LjRj1xuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBkb25lINCk0YPQvdC60YbQuNGPINGD0YHQv9C10YjQvdC+0LPQviDQvtCx0YDQsNGC0L3QvtCz0L4g0LLRi9C30L7QstCwXG4gICAqIEByZXR1cm5zIHskLkRlZmVycmVkfSDQstC+0LfQstGA0LDRidCw0LXRgiBqcXVlcnkgYWpheCDQvtCx0YrQtdC60YJcbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9yZXF1ZXN0OiBmdW5jdGlvbiggbWV0aG9kLCB1cmwsIGRhdGEsIGFqYXhTZXR0aW5ncywgdXNlTm90aWZpY2F0aW9ucywgZG9uZSApe1xuICAgIGlmICggIXV0aWxzLmlzU3RyaW5nKCBtZXRob2QgKSApe1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCfQn9Cw0YDQsNC80LXRgtGAIGBtZXRob2RgINC00L7Qu9C20LXQvSDQsdGL0YLRjCDRgdGC0YDQvtC60L7QuSwg0LAg0L3QtSAnLCBtZXRob2QgKTtcbiAgICB9XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG5vdGlmaWNhdGlvblR5cGUgPSBtZXRob2QgPT09ICdHRVQnID8gJ2xvYWQnIDogKCBtZXRob2QgPT09ICdQT1NUJyB8fCBtZXRob2QgPT09ICdQVVQnIHx8IG1ldGhvZCA9PT0gJ1BBVENIJyApID8gJ3NhdmUnIDogJ2RlbGV0ZSc7XG4gICAgdmFyIF9hamF4U2V0dGluZ3MgPSB0aGlzLl9wcmVwYXJlQWpheFNldHRpbmdzKCBtZXRob2QsIHVybCwgZGF0YSwgYWpheFNldHRpbmdzICk7XG5cbiAgICAvLyDQmNGB0L/QvtC70YzQt9C+0LLQsNGC0Ywg0LfQvdCw0YfQtdC90LjQtSDQv9C+INGD0LzQvtC70YfQsNC90LjRjiwg0LXRgdC70LggdXNlTm90aWZpY2F0aW9ucyDQvdC1INC30LDQtNCw0L1cbiAgICAvLyDRgtGD0YIg0LbQtSDQv9C+0YDQstC10YDRj9C10LwsINC/0L7QtNC60LvRjtGH0LXQvdGLINC70Lgg0YPQstC10LTQvtC80LvQtdC90LjRj1xuICAgIGlmICggdXRpbHMuaXNCb29sZWFuKCB1c2VOb3RpZmljYXRpb25zICkgKXtcbiAgICAgIHVzZU5vdGlmaWNhdGlvbnMgPSB1c2VOb3RpZmljYXRpb25zICYmIGNmLm5vdGlmaWNhdGlvbjtcbiAgICB9IGVsc2Uge1xuICAgICAgdXNlTm90aWZpY2F0aW9ucyA9IHRoaXMubm90aWZpY2F0aW9ucyAmJiBjZi5ub3RpZmljYXRpb247XG4gICAgfVxuXG4gICAgaWYgKCB1c2VOb3RpZmljYXRpb25zICl7XG4gICAgICBjZi5ub3RpZmljYXRpb25bIG5vdGlmaWNhdGlvblR5cGUgXS5zaG93KCk7XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coIG1ldGhvZCArICcgJyArIF9hamF4U2V0dGluZ3MudXJsICk7XG5cbiAgICByZXR1cm4gJC5hamF4KCBfYWpheFNldHRpbmdzICkuZmFpbChmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICl7XG4gICAgICBjb25zb2xlLndhcm4oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApO1xuXG4gICAgICAvLyBVbmF1dGhvcml6ZWQgQ2FsbGJhY2tcbiAgICAgIGlmICgganFYSFIuc3RhdHVzID09PSA0MDEgJiYgc2VsZi51bmF1dGhvcml6ZWRDYWxsYmFjayApe1xuICAgICAgICBzZWxmLnVuYXV0aG9yaXplZENhbGxiYWNrKCBqcVhIUiwgbWV0aG9kLCB1cmwsIGRhdGEsIGFqYXhTZXR0aW5ncywgZG9uZSApO1xuXG4gICAgICAgIC8vINCd0LUg0L/QvtC60LDQt9GL0LLQsNGC0Ywg0YHQvtC+0LHRidC10L3QuNC1INGBINC+0YjQuNCx0LrQvtC5INC/0YDQuCA0MDEsINC10YHQu9C4INCy0YHRkSDQv9C70L7RhdC+LCDRgtC+INGA0L7Rg9GC0LXRgCDRgdCw0Lwg0L/QtdGA0LXQutC40L3QtdGCINC90LAg0YTQvtGA0LzRgyDQstGF0L7QtNCwXG4gICAgICAgIGlmICggdXNlTm90aWZpY2F0aW9ucyApe1xuICAgICAgICAgIGNmLm5vdGlmaWNhdGlvblsgbm90aWZpY2F0aW9uVHlwZSBdLmhpZGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKCB1c2VOb3RpZmljYXRpb25zICl7XG4gICAgICAgIGNmLm5vdGlmaWNhdGlvblsgbm90aWZpY2F0aW9uVHlwZSBdLmZhaWwoKTtcbiAgICAgIH1cblxuICAgIH0pLmRvbmUoZnVuY3Rpb24oKXtcbiAgICAgIGlmICggdXNlTm90aWZpY2F0aW9ucyApe1xuICAgICAgICBjZi5ub3RpZmljYXRpb25bIG5vdGlmaWNhdGlvblR5cGUgXS5oaWRlKCk7XG4gICAgICB9XG4gICAgfSkuZG9uZSggZG9uZSApO1xuICB9XG59O1xuXG4vKipcbiAqIE1ldGhvZCBmb3IgZ2V0IHJlcXVlc3QgdG8gYXBpIHJvb3RcbiAqXG4gKiBAcGFyYW0gYWpheFNldHRpbmdzXG4gKiBAcGFyYW0gZG9uZVxuICogQHJldHVybnMgeyQuRGVmZXJyZWR9XG4gKi9cbkFwaUNsaWVudC5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24oIGFqYXhTZXR0aW5ncywgZG9uZSApe1xuICBjb25zb2xlLmxvZyggJ2FwaTo6Z2V0JyApO1xuICBpZiAoIHV0aWxzLmlzRnVuY3Rpb24oIGFqYXhTZXR0aW5ncyApICl7XG4gICAgZG9uZSA9IGFqYXhTZXR0aW5ncztcbiAgICBhamF4U2V0dGluZ3MgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBhamF4U2V0dGluZ3MgPSBhamF4U2V0dGluZ3MgfHwge307XG5cbiAgcmV0dXJuIHRoaXMuX3JlcXVlc3QoJ0dFVCcsIHRoaXMudXJsLCB1bmRlZmluZWQsIGFqYXhTZXR0aW5ncywgZmFsc2UsIGRvbmUgKTtcbn07XG4vKipcbiAqIEBhbGlhcyBBcGlDbGllbnQucHJvdG90eXBlLmdldFxuICogQHR5cGUge0Z1bmN0aW9ufVxuICovXG5BcGlDbGllbnQucHJvdG90eXBlLnJlYWQgPSBBcGlDbGllbnQucHJvdG90eXBlLmdldDtcblxuQXBpQ2xpZW50LnZlcnNpb24gPSAnMC4zLjAnO1xuXG5BcGlDbGllbnQudXRpbHMgPSB1dGlscztcblxuZXhwb3J0IHsgQXBpQ2xpZW50IH07XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQU8sTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDO0FBQ3hCLEFBSUEsSUFBSSxPQUFPLEdBQUcsa0JBQWtCLENBQUM7QUFDakMsQUFNQSxJQUFJLFNBQVMsR0FBRyxpQkFBaUIsQ0FBQztBQUNsQyxBQUdBLElBQUksV0FBVyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUM7Ozs7Ozs7QUFPbkMsSUFBSSxXQUFXLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQzs7Ozs7Ozs7O0FBU3ZDLFNBQVMsWUFBWSxDQUFDLEtBQUssRUFBRTtFQUMzQixPQUFPLENBQUMsS0FBSyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsS0FBSyxLQUFLLENBQUM7Q0FDdEQ7Ozs7Ozs7Ozs7Ozs7Ozs7QUFnQkQsS0FBSyxDQUFDLFFBQVEsR0FBRyxTQUFTLFFBQVEsRUFBRSxLQUFLLEdBQUc7RUFDMUMsT0FBTyxPQUFPLEtBQUssS0FBSyxRQUFRLEtBQUssWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssU0FBUyxDQUFDLElBQUksS0FBSyxDQUFDO0NBQzdHLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7QUFnQkYsS0FBSyxDQUFDLFNBQVMsR0FBRyxTQUFTLFNBQVMsQ0FBQyxLQUFLLEVBQUU7RUFDMUMsT0FBTyxDQUFDLEtBQUssS0FBSyxJQUFJLElBQUksS0FBSyxLQUFLLEtBQUssSUFBSSxZQUFZLENBQUMs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
