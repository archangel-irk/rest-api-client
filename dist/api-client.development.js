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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLWNsaWVudC5kZXZlbG9wbWVudC5qcyIsInNvdXJjZXMiOlsiLi4vc3JjL3V0aWxzLmpzIiwiLi4vc3JjL2dldC5qcyIsIi4uL3NyYy9wb3N0LmpzIiwiLi4vc3JjL2RlbGV0ZS5qcyIsIi4uL3NyYy9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY29uc3QgdXRpbHMgPSB7fTtcblxuLyoqIGBPYmplY3QjdG9TdHJpbmdgIHJlc3VsdCByZWZlcmVuY2VzLiAqL1xudmFyIGFyZ3NUYWcgPSAnW29iamVjdCBBcmd1bWVudHNdJztcbnZhciBhcnJheVRhZyA9ICdbb2JqZWN0IEFycmF5XSc7XG52YXIgYm9vbFRhZyA9ICdbb2JqZWN0IEJvb2xlYW5dJztcbnZhciBkYXRlVGFnID0gJ1tvYmplY3QgRGF0ZV0nO1xudmFyIGVycm9yVGFnID0gJ1tvYmplY3QgRXJyb3JdJztcbnZhciBmdW5jVGFnID0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbnZhciBudW1iZXJUYWcgPSAnW29iamVjdCBOdW1iZXJdJztcbnZhciBvYmplY3RUYWcgPSAnW29iamVjdCBPYmplY3RdJztcbnZhciByZWdleHBUYWcgPSAnW29iamVjdCBSZWdFeHBdJztcbnZhciBzdHJpbmdUYWcgPSAnW29iamVjdCBTdHJpbmddJztcblxuLyoqIFVzZWQgZm9yIG5hdGl2ZSBtZXRob2QgcmVmZXJlbmNlcy4gKi9cbnZhciBhcnJheVByb3RvID0gQXJyYXkucHJvdG90eXBlO1xudmFyIG9iamVjdFByb3RvID0gT2JqZWN0LnByb3RvdHlwZTtcblxuLyoqXG4gKiBVc2VkIHRvIHJlc29sdmUgdGhlIGB0b1N0cmluZ1RhZ2Agb2YgdmFsdWVzLlxuICogU2VlIHRoZSBbRVMgc3BlY10oaHR0cHM6Ly9wZW9wbGUubW96aWxsYS5vcmcvfmpvcmVuZG9yZmYvZXM2LWRyYWZ0Lmh0bWwjc2VjLW9iamVjdC5wcm90b3R5cGUudG9zdHJpbmcpXG4gKiBmb3IgbW9yZSBkZXRhaWxzLlxuICovXG52YXIgb2JqVG9TdHJpbmcgPSBvYmplY3RQcm90by50b1N0cmluZztcblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBvYmplY3QtbGlrZS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBvYmplY3QtbGlrZSwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc09iamVjdExpa2UodmFsdWUpIHtcbiAgcmV0dXJuICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB8fCBmYWxzZTtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBjbGFzc2lmaWVkIGFzIGEgYFN0cmluZ2AgcHJpbWl0aXZlIG9yIG9iamVjdC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGNvcnJlY3RseSBjbGFzc2lmaWVkLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIHV0aWxzLmlzU3RyaW5nKCdhYmMnKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiB1dGlscy5pc1N0cmluZygxKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbnV0aWxzLmlzU3RyaW5nID0gZnVuY3Rpb24gaXNTdHJpbmcoIHZhbHVlICkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyB8fCAoaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBvYmpUb1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gc3RyaW5nVGFnKSB8fCBmYWxzZTtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgY2xhc3NpZmllZCBhcyBhIGJvb2xlYW4gcHJpbWl0aXZlIG9yIG9iamVjdC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGNvcnJlY3RseSBjbGFzc2lmaWVkLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIHV0aWxzLmlzQm9vbGVhbihmYWxzZSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogdXRpbHMuaXNCb29sZWFuKG51bGwpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xudXRpbHMuaXNCb29sZWFuID0gZnVuY3Rpb24gaXNCb29sZWFuKHZhbHVlKSB7XG4gIHJldHVybiAodmFsdWUgPT09IHRydWUgfHwgdmFsdWUgPT09IGZhbHNlIHx8IGlzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgb2JqVG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09IGJvb2xUYWcpIHx8IGZhbHNlO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyB0aGUgbGFuZ3VhZ2UgdHlwZSBvZiBgT2JqZWN0YC5cbiAqIChlLmcuIGFycmF5cywgZnVuY3Rpb25zLCBvYmplY3RzLCByZWdleGVzLCBgbmV3IE51bWJlcigwKWAsIGFuZCBgbmV3IFN0cmluZygnJylgKVxuICpcbiAqICoqTm90ZToqKiBTZWUgdGhlIFtFUzUgc3BlY10oaHR0cHM6Ly9lczUuZ2l0aHViLmlvLyN4OCkgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBAc3RhdGljXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiB1dGlscy5pc09iamVjdCh7fSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogdXRpbHMuaXNPYmplY3QoWzEsIDIsIDNdKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiB1dGlscy5pc09iamVjdCgxKTtcbiAqIC8vID0+IGZhbHNlXG4gKlxuICogdXRpbHMuaXNPYmplY3QoZnVuY3Rpb24oKXt9KTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbnV0aWxzLmlzT2JqZWN0ID0gZnVuY3Rpb24gaXNPYmplY3QoIHZhbHVlICkge1xuICAvLyBBdm9pZCBhIFY4IEpJVCBidWcgaW4gQ2hyb21lIDE5LTIwLlxuICAvLyBTZWUgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTIyOTEgZm9yIG1vcmUgZGV0YWlscy5cbiAgdmFyIHR5cGUgPSB0eXBlb2YgdmFsdWU7XG4gIHJldHVybiAodmFsdWUgJiYgdmFsdWUgIT09IG51bGwgJiYgdHlwZSA9PT0gJ29iamVjdCcpIHx8IGZhbHNlO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBjbGFzc2lmaWVkIGFzIGEgYEZ1bmN0aW9uYCBvYmplY3QuXG4gKlxuICogQHN0YXRpY1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBjb3JyZWN0bHkgY2xhc3NpZmllZCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiB1dGlscy5pc0Z1bmN0aW9uKGZ1bmN0aW9uKCl7fSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogdXRpbHMuaXNGdW5jdGlvbigvYWJjLyk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG51dGlscy5pc0Z1bmN0aW9uID0gZnVuY3Rpb24gaXNGdW5jdGlvbih2YWx1ZSkge1xuICAvLyBBdm9pZCBhIENoYWtyYSBKSVQgYnVnIGluIGNvbXBhdGliaWxpdHkgbW9kZXMgb2YgSUUgMTEuXG4gIC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vamFzaGtlbmFzL3VuZGVyc2NvcmUvaXNzdWVzLzE2MjEgZm9yIG1vcmUgZGV0YWlscy5cbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJyB8fCBmYWxzZTtcbn07XG5cbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9ucmYxMTAvZGVlcG1lcmdlXG4vKipcbiAqIE1lcmdlIHR3byBvYmplY3RzIGB4YCBhbmQgYHlgIGRlZXBseSwgcmV0dXJuaW5nIGEgbmV3IG1lcmdlZCBvYmplY3Qgd2l0aCB0aGUgZWxlbWVudHMgZnJvbSBib3RoIGB4YCBhbmQgYHlgLlxuICpcbiAqIElmIGFuIGVsZW1lbnQgYXQgdGhlIHNhbWUga2V5IGlzIHByZXNlbnQgZm9yIGJvdGggYHhgIGFuZCBgeWAsIHRoZSB2YWx1ZSBmcm9tIGB5YCB3aWxsIGFwcGVhciBpbiB0aGUgcmVzdWx0LlxuICpcbiAqIFRoZSBtZXJnZSBpcyBpbW11dGFibGUsIHNvIG5laXRoZXIgYHhgIG5vciBgeWAgd2lsbCBiZSBtb2RpZmllZC5cbiAqXG4gKiBUaGUgbWVyZ2Ugd2lsbCBhbHNvIG1lcmdlIGFycmF5cyBhbmQgYXJyYXkgdmFsdWVzLlxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqIEBwYXJhbSBzcmNcbiAqIEByZXR1cm5zIHtib29sZWFufEFycmF5fHt9fVxuICovXG51dGlscy5kZWVwTWVyZ2UgPSBmdW5jdGlvbiBkZWVwTWVyZ2UoIHRhcmdldCwgc3JjICl7XG4gIHZhciBhcnJheSA9IEFycmF5LmlzQXJyYXkoc3JjKTtcbiAgdmFyIGRzdCA9IGFycmF5ICYmIFtdIHx8IHt9O1xuXG4gIGlmIChhcnJheSkge1xuICAgIHRhcmdldCA9IHRhcmdldCB8fCBbXTtcbiAgICBkc3QgPSBkc3QuY29uY2F0KHRhcmdldCk7XG4gICAgc3JjLmZvckVhY2goZnVuY3Rpb24oZSwgaSkge1xuICAgICAgaWYgKHR5cGVvZiBkc3RbaV0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGRzdFtpXSA9IGU7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBlID09PSAnb2JqZWN0Jykge1xuICAgICAgICBkc3RbaV0gPSBkZWVwTWVyZ2UodGFyZ2V0W2ldLCBlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh0YXJnZXQuaW5kZXhPZihlKSA9PT0gLTEpIHtcbiAgICAgICAgICBkc3QucHVzaChlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIGlmICh0YXJnZXQgJiYgdHlwZW9mIHRhcmdldCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIE9iamVjdC5rZXlzKHRhcmdldCkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIGRzdFtrZXldID0gdGFyZ2V0W2tleV07XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoIHNyYyA9PSBudWxsICl7XG4gICAgICByZXR1cm4gZHN0O1xuICAgIH1cblxuICAgIE9iamVjdC5rZXlzKHNyYykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICBpZiAodHlwZW9mIHNyY1trZXldICE9PSAnb2JqZWN0JyB8fCAhc3JjW2tleV0pIHtcbiAgICAgICAgZHN0W2tleV0gPSBzcmNba2V5XTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBpZiAoIXRhcmdldFtrZXldKSB7XG4gICAgICAgICAgZHN0W2tleV0gPSBzcmNba2V5XTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkc3Rba2V5XSA9IGRlZXBNZXJnZSh0YXJnZXRba2V5XSwgc3JjW2tleV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gZHN0O1xufTtcblxuLyoqXG4gKiBodHRwczovL2dpdGh1Yi5jb20vYWhlY2ttYW5uL21xdWVyeS9ibG9iL21hc3Rlci9saWIvbXF1ZXJ5LmpzXG4gKiBtcXVlcnkuc2VsZWN0XG4gKlxuICogU3BlY2lmaWVzIHdoaWNoIGRvY3VtZW50IGZpZWxkcyB0byBpbmNsdWRlIG9yIGV4Y2x1ZGVcbiAqXG4gKiAjIyMjU3RyaW5nIHN5bnRheFxuICpcbiAqIFdoZW4gcGFzc2luZyBhIHN0cmluZywgcHJlZml4aW5nIGEgcGF0aCB3aXRoIGAtYCB3aWxsIGZsYWcgdGhhdCBwYXRoIGFzIGV4Y2x1ZGVkLlxuICogV2hlbiBhIHBhdGggZG9lcyBub3QgaGF2ZSB0aGUgYC1gIHByZWZpeCwgaXQgaXMgaW5jbHVkZWQuXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgLy8gaW5jbHVkZSBhIGFuZCBiLCBleGNsdWRlIGNcbiAqICAgICB1dGlscy5zZWxlY3QoJ2EgYiAtYycpO1xuICpcbiAqICAgICAvLyBvciB5b3UgbWF5IHVzZSBvYmplY3Qgbm90YXRpb24sIHVzZWZ1bCB3aGVuXG4gKiAgICAgLy8geW91IGhhdmUga2V5cyBhbHJlYWR5IHByZWZpeGVkIHdpdGggYSBcIi1cIlxuICogICAgIHV0aWxzLnNlbGVjdCh7YTogMSwgYjogMSwgYzogMH0pO1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fFN0cmluZ30gc2VsZWN0aW9uXG4gKiBAcmV0dXJuIHtPYmplY3R8dW5kZWZpbmVkfVxuICogQGFwaSBwdWJsaWNcbiAqL1xudXRpbHMuc2VsZWN0ID0gZnVuY3Rpb24gc2VsZWN0KCBzZWxlY3Rpb24gKXtcbiAgaWYgKCFzZWxlY3Rpb24pIHJldHVybjtcblxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCAhPT0gMSkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzZWxlY3Q6IHNlbGVjdCBvbmx5IHRha2VzIDEgYXJndW1lbnQnKTtcbiAgfVxuXG4gIHZhciBmaWVsZHMgPSB7fTtcbiAgdmFyIHR5cGUgPSB0eXBlb2Ygc2VsZWN0aW9uO1xuXG4gIGlmICgnc3RyaW5nJyA9PT0gdHlwZSB8fCAnb2JqZWN0JyA9PT0gdHlwZSAmJiAnbnVtYmVyJyA9PT0gdHlwZW9mIHNlbGVjdGlvbi5sZW5ndGggJiYgIUFycmF5LmlzQXJyYXkoIHNlbGVjdGlvbiApKSB7XG4gICAgaWYgKCdzdHJpbmcnID09PSB0eXBlKXtcbiAgICAgIHNlbGVjdGlvbiA9IHNlbGVjdGlvbi5zcGxpdCgvXFxzKy8pO1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBzZWxlY3Rpb24ubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgIHZhciBmaWVsZCA9IHNlbGVjdGlvblsgaSBdO1xuICAgICAgaWYgKCAhZmllbGQgKSBjb250aW51ZTtcbiAgICAgIHZhciBpbmNsdWRlID0gJy0nID09PSBmaWVsZFsgMCBdID8gMCA6IDE7XG4gICAgICBpZiAoaW5jbHVkZSA9PT0gMCkgZmllbGQgPSBmaWVsZC5zdWJzdHJpbmcoIDEgKTtcbiAgICAgIGZpZWxkc1sgZmllbGQgXSA9IGluY2x1ZGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZpZWxkcztcbiAgfVxuXG4gIGlmICggdXRpbHMuaXNPYmplY3QoIHNlbGVjdGlvbiApICYmICFBcnJheS5pc0FycmF5KCBzZWxlY3Rpb24gKSkge1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoIHNlbGVjdGlvbiApO1xuICAgIGZvciAodmFyIGogPSAwOyBqIDwga2V5cy5sZW5ndGg7ICsraikge1xuICAgICAgZmllbGRzWyBrZXlzWyBqIF0gXSA9IHNlbGVjdGlvblsga2V5c1sgaiBdIF07XG4gICAgfVxuICAgIHJldHVybiBmaWVsZHM7XG4gIH1cblxuICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIHNlbGVjdCgpIGFyZ3VtZW50LiBNdXN0IGJlIHN0cmluZyBvciBvYmplY3QuJyk7XG59O1xuXG4vLyDQntGH0LjRgdGC0LjRgtGMIGlkZW50aXR5INGDINGA0LXRgdGD0YDRgdCwINC4INC10LPQviDRgNC+0LTQuNGC0LXQu9GM0YHQutC40YUg0YDQtdGB0YPRgNGB0L7QsiDRgtC+0LbQtVxudXRpbHMuY2xlYXJJZGVudGl0eSA9IGZ1bmN0aW9uIGNsZWFySWRlbnRpdHkoIHJlc291cmNlICl7XG4gIHdoaWxlICggcmVzb3VyY2UucGFyZW50UmVzb3VyY2UgKSB7XG4gICAgcmVzb3VyY2UuaWRlbnRpdHkgPSAnJztcbiAgICByZXNvdXJjZSA9IHJlc291cmNlLnBhcmVudFJlc291cmNlO1xuICB9XG59O1xuXG4vLyDQodC+0LHRgNCw0YLRjCB1cmwgKNCx0LXQtyBxdWVyeSBzdHJpbmcpXG51dGlscy5jb25zdHJ1Y3RVcmwgPSBmdW5jdGlvbiBjb25zdHJ1Y3RVcmwoIHJlc291cmNlICl7XG4gIHZhciBpZGVudGl0eSA9IHJlc291cmNlLmlkZW50aXR5ID8gJy8nICsgcmVzb3VyY2UuaWRlbnRpdHkgOiAnLyc7XG5cbiAgLy8g0J/RgNC+0LHQtdC20LDRgtGM0YHRjyDQv9C+INCy0YHQtdC8INGA0LXRgdGD0YDRgdCw0LwsINCyINGC0L7QvCDRh9C40YHQu9C1INCyINC60L7RgNC10L3RjCDQsNC/0LgsINGH0YLQvtCx0Ysg0YHQvtCx0YDQsNGC0YwgdXJsXG4gIHJldHVybiByZXNvdXJjZS5wYXJlbnRSZXNvdXJjZVxuICAgID8gY29uc3RydWN0VXJsKCByZXNvdXJjZS5wYXJlbnRSZXNvdXJjZSApICsgJy8nICsgcmVzb3VyY2UudXJsICsgaWRlbnRpdHlcbiAgICA6IHJlc291cmNlLnVybDtcbn07XG4iLCJpbXBvcnQgeyB1dGlscyB9IGZyb20gJy4vdXRpbHMuanMnO1xuXG4vKipcbiAqIEdFVCByZXF1ZXN0XG4gKlxuICog0JIgYWpheFNldHRpbmdzINC80L7QttC90L4g0YPQutCw0LfQsNGC0Ywg0L/QvtC70LUgZG9Ob3RTdG9yZSAtINGH0YLQvtCx0Ysg0L3QtSDRgdC+0YXRgNCw0L3Rj9GC0Ywg0L/QvtC70YPRh9C10L3QvdGL0Lkg0L7QsdGK0LXQutGCINCyIHN0b3JhZ2VcbiAqXG4gKiBAcGFyYW0gW2RhdGFdXG4gKiBAcGFyYW0gW2FqYXhTZXR0aW5nc11cbiAqIEBwYXJhbSBbZG9uZV1cbiAqIEByZXR1cm5zIHsqfVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UmVxdWVzdCggZGF0YSwgYWpheFNldHRpbmdzLCBkb25lICl7XG4gIHZhciByZXNvdXJjZSA9IHRoaXM7XG4gIHZhciBtZXRob2QgPSAnR0VUJztcbiAgdmFyIGtleTtcblxuICAvLyDQldGB0LvQuCBkYXRhIC0g0LXRgdGC0Ywg0YTRg9C90LrRhtC40Y8sINGC0L4g0Y3RgtC+IGRvbmVcbiAgaWYgKCB1dGlscy5pc0Z1bmN0aW9uKCBkYXRhICkgKXtcbiAgICBkb25lID0gZGF0YTtcbiAgICBkYXRhID0gdW5kZWZpbmVkO1xuICB9XG4gIGlmICggdXRpbHMuaXNGdW5jdGlvbiggYWpheFNldHRpbmdzICkgKXtcbiAgICBkb25lID0gYWpheFNldHRpbmdzO1xuICAgIGFqYXhTZXR0aW5ncyA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGFqYXhTZXR0aW5ncyA9IGFqYXhTZXR0aW5ncyB8fCB7fTtcbiAgYWpheFNldHRpbmdzLmRhdGEgPSBkYXRhO1xuXG4gIHZhciBkZmQgPSAkLkRlZmVycmVkKCk7XG4gIHRoaXMuX3Jlc291cmNlUmVxdWVzdCggbWV0aG9kLCBhamF4U2V0dGluZ3MgKS5kb25lKGZ1bmN0aW9uKCByZXNwb25zZSwgdGV4dFN0YXR1cywganFYSFIgKXtcbiAgICB2YXIgZmllbGRzO1xuXG4gICAgLy8gI2V4YW1wbGVcbiAgICAvLyBhcGkucGxhY2VzKHsgZmllbGRzOiAnbmFtZScsIHNraXA6IDEwMCB9KTtcbiAgICAvLyDQldGB0LvQuCDQsdGL0LvQsCDQstGL0LHQvtGA0LrQsCDQv9C+INC/0L7Qu9GP0LwsINC90YPQttC90L4g0L/RgNCw0LLQuNC70YzQvdC+INC+0LHRgNCw0LHQvtGC0LDRgtGMINC10ZEg0Lgg0L/QtdGA0LXQtNCw0YLRjCDQsiDQtNC+0LrRg9C80LXQvdGCXG4gICAgaWYgKCBkYXRhICYmIGRhdGEuZmllbGRzICl7XG4gICAgICBmaWVsZHMgPSB1dGlscy5zZWxlY3QoIGRhdGEuZmllbGRzICk7XG4gICAgfVxuXG4gICAgLy8g0JXRgdGC0Ywg0L7RgtCy0LXRgiDQvdCw0LTQviDRgdC+0YXRgNCw0L3QuNGC0Ywg0LIg0YXRgNCw0L3QuNC70LjRidC1XG4gICAgaWYgKCByZXNvdXJjZS5zdG9yYWdlICYmICFhamF4U2V0dGluZ3MuZG9Ob3RTdG9yZSApe1xuICAgICAgcmVzcG9uc2UgPSBzdG9yYWdlWyByZXNvdXJjZS5jb2xsZWN0aW9uTmFtZSBdLmFkZCggcmVzcG9uc2UsIGZpZWxkcywgdHJ1ZSApO1xuICAgIH1cblxuICAgIGRvbmUgJiYgZG9uZSggcmVzcG9uc2UsIHRleHRTdGF0dXMsIGpxWEhSICk7XG4gICAgZGZkLnJlc29sdmUoIHJlc3BvbnNlLCB0ZXh0U3RhdHVzLCBqcVhIUiApO1xuXG4gIH0pLmZhaWwoZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApe1xuICAgIGRmZC5yZWplY3QoIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApO1xuICB9KTtcblxuICAvL1RPRE86INCY0YHQv9C+0LvRjNC30L7QstCw0YLRjCDQuNC00LXQvtC70L7Qs9GOIHF1ZXJ5PyBxdWVyeSDQvtCx0YrQtdC60YIg0LTQu9GPINC/0L7RgdGC0YDQvtC10L3QuNGPINC30LDQv9GA0L7RgdC+0LJcblxuICAvLyBpZGVudGl0eSDRgdC+0YXRgNCw0L3Rj9C10YLRgdGPINC00LvRjyBjb25zdHJ1Y3RVcmwsINC10LPQviDQvdGD0LbQvdC+INC+0YfQuNGB0YLQuNGC0Ywg0LTQu9GPINC/0L7RgdC70LXQtNGD0Y7RidC40YUg0LfQsNC/0YDQvtGB0L7Qsi5cbiAgdXRpbHMuY2xlYXJJZGVudGl0eSggcmVzb3VyY2UgKTtcblxuICByZXR1cm4gZGZkO1xufVxuIiwiaW1wb3J0IHsgdXRpbHMgfSBmcm9tICcuL3V0aWxzLmpzJztcblxuXG5mdW5jdGlvbiBwb3N0TGlrZVJlcXVlc3QoIG1ldGhvZCwgZGF0YSwgYWpheFNldHRpbmdzLCBkb25lICl7XG4gIHZhciByZXNvdXJjZSA9IHRoaXM7XG4gIHZhciBpZGVudGl0eSA9IHRoaXMuaWRlbnRpdHk7XG4gIHZhciBkb2N1bWVudElkU3RyaW5nO1xuXG4gIC8vINCV0YHQu9C4IGRhdGEgLSDQtdGB0YLRjCDRhNGD0L3QutGG0LjRjywg0YLQviDRjdGC0L4gZG9uZVxuICBpZiAoIHV0aWxzLmlzRnVuY3Rpb24oIGRhdGEgKSApe1xuICAgIGRvbmUgPSBkYXRhO1xuICAgIGRhdGEgPSB1bmRlZmluZWQ7XG4gIH1cbiAgaWYgKCB1dGlscy5pc0Z1bmN0aW9uKCBhamF4U2V0dGluZ3MgKSApe1xuICAgIGRvbmUgPSBhamF4U2V0dGluZ3M7XG4gICAgYWpheFNldHRpbmdzID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgYWpheFNldHRpbmdzID0gYWpheFNldHRpbmdzIHx8IHt9O1xuXG4gIC8vINCf0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuCDQtNC+0LrRg9C80LXQvdGC0LAg0L3Rg9C20L3QviDRgdC+0YXRgNCw0L3Rj9GC0Ywg0YLQvtC70YzQutC+INC40LfQvNC10L3RkdC90L3Ri9C1INC/0L7Qu9GPXG4gIC8vINCY0L3QvtCz0LTQsCDQv9C10YDQtdC00LDRjtGCINC00L7QutGD0LzQtdC90YJcbiAgaWYgKCByZXNvdXJjZS5zdG9yYWdlICYmIGRhdGEgaW5zdGFuY2VvZiBzdG9yYWdlLkRvY3VtZW50ICkge1xuICAgIGRvY3VtZW50SWRTdHJpbmcgPSBkYXRhLl9pZC50b1N0cmluZygpO1xuICAgIGRhdGEgPSBkYXRhLiRfX2RlbHRhKCk7XG5cbiAgLy8g0KLQsNC6INC80L7QttC90L4g0L/QvtC90Y/RgtGMLCDRh9GC0L4g0LzRiyDRgdC+0YXRgNCw0L3Rj9C10Lwg0YHRg9GJ0LXRgtCy0YPRjtGJ0LjQuSDQvdCwINGB0LXRgNCy0LXRgNC1IERvY3VtZW50XG4gIH0gZWxzZSBpZiAoIHJlc291cmNlLnN0b3JhZ2UgJiYgc3RvcmFnZS5PYmplY3RJZC5pc1ZhbGlkKCBpZGVudGl0eSApICkge1xuICAgIGRvY3VtZW50SWRTdHJpbmcgPSBpZGVudGl0eTtcblxuICAvLyDQn9GA0Lgg0YHQvtGF0YDQsNC90LXQvdC40Lgg0YfQtdGA0LXQtyDQvNC10YLQvtC0IHNhdmUoKSDRgyDQtNC+0LrRg9C80LXQvdGC0LBcbiAgfSBlbHNlIGlmICggcmVzb3VyY2Uuc3RvcmFnZSAmJiBkYXRhLl9pZCAmJiBzdG9yYWdlLk9iamVjdElkLmlzVmFsaWQoIGRhdGEuX2lkICkgKSB7XG4gICAgZG9jdW1lbnRJZFN0cmluZyA9IGRhdGEuX2lkLnRvU3RyaW5nKCk7XG4gIH1cblxuICBhamF4U2V0dGluZ3MuZGF0YSA9IGRhdGE7XG5cbiAgdmFyIGRmZCA9ICQuRGVmZXJyZWQoKTtcbiAgdGhpcy5fcmVzb3VyY2VSZXF1ZXN0KCBtZXRob2QsIGFqYXhTZXR0aW5ncyApLmRvbmUoZnVuY3Rpb24oIHJlc3BvbnNlLCB0ZXh0U3RhdHVzLCBqcVhIUiApe1xuICAgIHZhciBkb2M7XG5cbiAgICAvLyDQldGB0YLRjCDQvtGC0LLQtdGCINC90LDQtNC+INGB0L7RhdGA0LDQvdC40YLRjCDQsiDRhdGA0LDQvdC40LvQuNGJ0LVcbiAgICBpZiAoIHJlc291cmNlLnN0b3JhZ2UgJiYgIWFqYXhTZXR0aW5ncy5kb05vdFN0b3JlICl7XG4gICAgICAvLyDQn9GA0Lgg0YHQvtGF0YDQsNC90LXQvdC40Lgg0L3Rg9C20L3QviDQvtCx0L3QvtCy0LvRj9GC0Ywg0LTQvtC60YPQvNC10L3RglxuICAgICAgLy8g0J/QvtC/0YDQvtCx0YPQtdC8INGB0L3QsNGH0LDQu9CwINC90LDQudGC0Lgg0LTQvtC60YPQvNC10L3RgiDQv9C+IGlkINC4INC+0LHQvdC+0LLQuNGC0Ywg0LXQs9C+XG4gICAgICBkb2MgPSBzdG9yYWdlWyByZXNvdXJjZS5jb2xsZWN0aW9uTmFtZSBdLmZpbmRCeUlkKCBkb2N1bWVudElkU3RyaW5nICk7XG5cbiAgICAgIGlmICggZG9jICl7XG4gICAgICAgIC8vINCe0LHQvdC+0LLQu9GP0LXQvCDQtNC+0LrRg9C80LXQvdGCXG4gICAgICAgIGRvYy5zZXQoIHJlc3BvbnNlICk7XG5cbiAgICAgICAgLy8g0KHQvtC30LTQsNGR0Lwg0YHRgdGL0LvQutGDINC/0L4g0L3QvtCy0L7QvNGDIGlkINCyINC60L7Qu9C70LXQutGG0LjQuFxuICAgICAgICBzdG9yYWdlWyByZXNvdXJjZS5jb2xsZWN0aW9uTmFtZSBdLnVwZGF0ZUlkTGluayggZG9jICk7XG5cbiAgICAgICAgLy8g0K3RgtC+0YIg0LTQvtC60YPQvNC10L3RgiDRgtC10L/QtdGA0Ywg0YHQvtGF0YDQsNC90ZHQvSDQvdCwINGB0LXRgNCy0LXRgNC1LCDQt9C90LDRh9C40YIg0L7QvSDRg9C20LUg0L3QtSDQvdC+0LLRi9C5LlxuICAgICAgICBkb2MuaXNOZXcgPSBmYWxzZTtcblxuICAgICAgICByZXNwb25zZSA9IGRvYztcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzcG9uc2UgPSBzdG9yYWdlWyByZXNvdXJjZS5jb2xsZWN0aW9uTmFtZSBdLmFkZCggcmVzcG9uc2UsIHVuZGVmaW5lZCwgdHJ1ZSApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGRvbmUgJiYgZG9uZSggcmVzcG9uc2UsIHRleHRTdGF0dXMsIGpxWEhSICk7XG4gICAgZGZkLnJlc29sdmUoIHJlc3BvbnNlLCB0ZXh0U3RhdHVzLCBqcVhIUiApO1xuXG4gIH0pLmZhaWwoZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApe1xuICAgIGRmZC5yZWplY3QoIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApO1xuICB9KTtcblxuICAvLyBpZGVudGl0eSDRgdC+0YXRgNCw0L3Rj9C10YLRgdGPINC00LvRjyBjb25zdHJ1Y3RVcmwsINC10LPQviDQvdGD0LbQvdC+INC+0YfQuNGB0YLQuNGC0Ywg0LTQu9GPINC/0L7RgdC70LXQtNGD0Y7RidC40YUg0LfQsNC/0YDQvtGB0L7Qsi5cbiAgdXRpbHMuY2xlYXJJZGVudGl0eSggcmVzb3VyY2UgKTtcblxuICByZXR1cm4gZGZkO1xufVxuXG4vLyBQYXJ0aWFsIEFwcGxpY2F0aW9uXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUG9zdExpa2VSZXF1ZXN0KCBtZXRob2QgKXtcbiAgcmV0dXJuIGZ1bmN0aW9uKCl7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCggYXJndW1lbnRzICk7XG5cbiAgICByZXR1cm4gcG9zdExpa2VSZXF1ZXN0LmFwcGx5KCB0aGlzLCBbIG1ldGhvZCBdLmNvbmNhdCggYXJncyApICk7XG4gIH07XG59XG4iLCJpbXBvcnQgeyB1dGlscyB9IGZyb20gJy4vdXRpbHMuanMnO1xuXG5leHBvcnQgZnVuY3Rpb24gZGVsZXRlUmVxdWVzdCggZGF0YSwgYWpheFNldHRpbmdzLCBkb25lICl7XG4gIHZhciByZXNvdXJjZSA9IHRoaXM7XG4gIHZhciBtZXRob2QgPSAnREVMRVRFJztcblxuICAvLyDQldGB0LvQuCBkYXRhIC0g0LXRgdGC0Ywg0YTRg9C90LrRhtC40Y8sINGC0L4g0Y3RgtC+IGRvbmVcbiAgaWYgKCB1dGlscy5pc0Z1bmN0aW9uKCBkYXRhICkgKXtcbiAgICBkb25lID0gZGF0YTtcbiAgICBkYXRhID0gdW5kZWZpbmVkO1xuICB9XG4gIGlmICggdXRpbHMuaXNGdW5jdGlvbiggYWpheFNldHRpbmdzICkgKXtcbiAgICBkb25lID0gYWpheFNldHRpbmdzO1xuICAgIGFqYXhTZXR0aW5ncyA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGFqYXhTZXR0aW5ncyA9IGFqYXhTZXR0aW5ncyB8fCB7fTtcbiAgYWpheFNldHRpbmdzLmRhdGEgPSBkYXRhO1xuXG4gIHZhciBkZmQgPSAkLkRlZmVycmVkKCk7XG4gIHRoaXMuX3Jlc291cmNlUmVxdWVzdCggbWV0aG9kLCBhamF4U2V0dGluZ3MgKS5kb25lKGZ1bmN0aW9uKCByZXNwb25zZSwgdGV4dFN0YXR1cywganFYSFIgKXtcbiAgICBkb25lICYmIGRvbmUoIHJlc3BvbnNlLCB0ZXh0U3RhdHVzLCBqcVhIUiApO1xuICAgIGRmZC5yZXNvbHZlKCByZXNwb25zZSwgdGV4dFN0YXR1cywganFYSFIgKTtcblxuICB9KS5mYWlsKGZ1bmN0aW9uKCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKXtcbiAgICBkZmQucmVqZWN0KCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKTtcbiAgfSk7XG5cbiAgLy8gaWRlbnRpdHkg0YHQvtGF0YDQsNC90Y/QtdGC0YHRjyDQtNC70Y8gY29uc3RydWN0VXJsLCDQtdCz0L4g0L3Rg9C20L3QviDQvtGH0LjRgdGC0LjRgtGMINC00LvRjyDQv9C+0YHQu9C10LTRg9GO0YnQuNGFINC30LDQv9GA0L7RgdC+0LIuXG4gIHV0aWxzLmNsZWFySWRlbnRpdHkoIHJlc291cmNlICk7XG5cbiAgcmV0dXJuIGRmZDtcbn1cbiIsIi8vIEFQSSBDbGllbnRcbi8vIC0tLS0tLS0tLS0tLS0tLVxuXG4vLyBFeGFtcGxlXG4vKlxuIHZhciBnaXRodWIgPSBBcGlDbGllbnQoJ2h0dHBzOi8vYXBpLmdpdGh1Yi5jb20nLCB7XG4gICBob29rczoge1xuICAgICBoZWFkZXJzOiB7XG4gICAgICAgQWNjZXB0OiAnYXBwbGljYXRpb24vdm5kLmdpdGh1Yi52Mytqc29uJyxcbiAgICAgICBBdXRob3JpemF0aW9uOiAndG9rZW4gOGZiZmM1NDBmMWVkMTQxNzA4M2M3MGE5OTBiNGRiM2M5YWE4NmVmZSdcbiAgICAgfVxuICAgfVxuIH0pO1xuXG4gZ2l0aHViLmFkZCgnc2VhcmNoJywge1xuICBzZWFyY2hNZXRob2Q6IGZ1bmN0aW9uKCl7XG4gICAgY29uc29sZS5sb2coICdzZWFyY2g6OnNlYXJjaE1ldGhvZCcgKTtcbiAgfVxuIH0pO1xuIGdpdGh1Yi5zZWFyY2guYWRkKCd1c2VycycsIHtcbiAgdXNlcnNNZXRob2Q6IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5wYXJlbnQuc2VhcmNoTWV0aG9kKCk7XG4gIH1cbiB9KTtcblxuIC8vINCU0L7QsdCw0LLQu9GP0LXQvCDRgNC10YHRg9GA0YHRi1xuIGdpdGh1Yi5hZGQoJ3VzZXInKTtcbiBnaXRodWIuYWRkKCd1c2VycycpO1xuIGdpdGh1Yi51c2Vycy5hZGQoJ3JlcG9zJyk7XG5cbiAvLyDQn9GA0L7Rh9C40YLQsNGC0Ywg0YDQtdC/0L7Qt9C40YLQvtGA0LjQuCAo0L7RgtC/0YDQsNCy0LjRgtGMINCz0LXRgiDQt9Cw0L/RgNC+0YEg0L3QsCBodHRwczovL2FwaS5naXRodWIuY29tL3VzZXJzL3JlcG9zLylcbiBnaXRodWIudXNlcnMucmVwb3MucmVhZCgpO1xuXG4gLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gLy8g0J3QtSDRgdC+0LLRgdC10LwgUkVTVCwg0LLRgdC1INC30LDQv9GA0L7RgdGLINC40LTRg9GCINC90LAg0L7QtNC40L0g0LDQtNGA0LXRgVxuIHZhciBzaW1wbGVBcGkgPSBBcGlDbGllbnQoJ2FwaS5leGFtcGxlLmNvbScsIHt9KTtcblxuIHNpbXBsZUFwaSgpLnJlYWQoe1xuICBlOiAnL0Jhc2UvRGVwYXJ0bWVudCdcbiB9KTtcblxuIHNpbXBsZUFwaS5wb3N0KHsgZGF0YSB9KTtcbiBzaW1wbGVBcGkoJ2lkZW50aXR5JykucG9zdCh7IGRhdGEgfSwgeyBhamF4U2V0dGluZ3MgfSk7XG4gc2ltcGxlQXBpKCdpZGVudGl0eScpLnBvc3QoIG51bGwsIHsgYWpheFNldHRpbmdzIH0pO1xuIHNpbXBsZUFwaS5wb3N0KHsgZGF0YSB9LCB7IGFqYXhTZXR0aW5ncyB9KTtcbiBzaW1wbGVBcGkucG9zdCggbnVsbCwgeyBhamF4U2V0dGluZ3MgfSk7XG5cbiBzaW1wbGVBcGkucmVhZCggZG9uZSApLmRvbmUoIGRvbmUgKS5mYWlsKCBmYWlsICk7XG5cbiDQoNCw0LHQvtGC0LAg0YEg0LTQvtC60YPQvNC10L3RgtCw0LzQuCAoc3RvcmFnZSksINC+0L0g0YHQsNC8INC/0YDQtdC+0LHRgNCw0LfRg9C10YLRgdGPINGH0LXRgNC10Lcg0LzQtdGC0L7QtCAkX19kZWx0YSgpXG4gc2ltcGxlQXBpLnBvc3QoIERvY3VtZW50ICk7XG4gc2ltcGxlQXBpLnNhdmUoIERvY3VtZW50ICk7XG5cblxuIC8vINCk0LjRh9C4XG4gYWpheFNldHRpbmdzINC00LvRjyDQutCw0LbQtNC+0LPQviDQt9Cw0L/RgNC+0YHQsFxuIElkZW50aXR5INC00LvRjyDQutCw0LbQtNC+0LPQviDQt9Cw0L/RgNC+0YHQsFxuXG4gKi9cblxuaW1wb3J0IHsgdXRpbHMgfSBmcm9tICcuL3V0aWxzLmpzJztcbmltcG9ydCB7IGdldFJlcXVlc3QgfSBmcm9tICcuL2dldC5qcyc7XG5pbXBvcnQgeyBjcmVhdGVQb3N0TGlrZVJlcXVlc3QgfSBmcm9tICcuL3Bvc3QuanMnO1xuaW1wb3J0IHsgZGVsZXRlUmVxdWVzdCB9IGZyb20gJy4vZGVsZXRlLmpzJztcblxuXG52YXIgcmVzb3VyY2VNaXhpbiA9IHtcbiAgcmVzb3VyY2VOYW1lOiAncmVzb3VyY2UnLFxuICB1cmw6ICcnLCAvLyA9IHJlc291cmNlTmFtZVxuXG4gIC8qKlxuICAgKiDQlNC+0LHQsNCy0LjRgtGMINC90L7QstGL0Lkg0YDQtdGB0YPRgNGBXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSByZXNvdXJjZU5hbWVcbiAgICogQHBhcmFtIHtvYmplY3R9IFtwYXJlbnRSZXNvdXJjZV0gLSDRgNC+0LTQuNGC0LXQu9GM0YHQutC40Lkg0YDQtdGB0YPRgNGBXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbdXNlcnNNaXhpbl0gLSDQv9C+0LvRjNC30L7QstCw0YLQtdC70YzRgdC60LDRjyDQv9GA0LjQvNC10YHRjFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGFkZDogZnVuY3Rpb24oIHJlc291cmNlTmFtZSwgcGFyZW50UmVzb3VyY2UsIHVzZXJzTWl4aW4gKXtcbiAgICBpZiAoICF1c2Vyc01peGluICkge1xuICAgICAgdXNlcnNNaXhpbiA9IHBhcmVudFJlc291cmNlIHx8IHt9O1xuICAgICAgcGFyZW50UmVzb3VyY2UgPSB0aGlzO1xuICAgIH1cblxuICAgIC8vINCR0YDQvtGB0LjRgtGMINC40YHQutC70Y7Rh9C10L3QuNC1LCDQtdGB0LvQuCDRgtCw0LrQvtC5INGA0LXRgdGD0YDRgSDRg9C20LUg0LXRgdGC0YxcbiAgICBpZiAoIHRoaXNbIHJlc291cmNlTmFtZSBdICl7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgcmVzb3VyY2UgbmFtZWQgJyArIHJlc291cmNlTmFtZSArICdhbHJlYWR5IGV4aXN0cy4nKTtcbiAgICB9XG5cbiAgICAvLyDQm9GO0LHQvtC5INC40Lcg0Y3RgtC40YUg0L/QsNGA0LDQvNC10YLRgNC+0LIg0YPQutCw0LfRi9Cy0LDQtdGCINC90LAg0L3QtdC+0LHRhdC+0LTQuNC80L7RgdGC0Ywg0LjRgdC/0L7Qu9GM0LfQvtCy0LDRgtGMINGF0YDQsNC90LjQu9C40YnQtVxuICAgIGlmICggdXNlcnNNaXhpbi5zY2hlbWFOYW1lIHx8IHVzZXJzTWl4aW4uY29sbGVjdGlvbk5hbWUgfHwgdXNlcnNNaXhpbi5zdG9yYWdlICkge1xuICAgICAgLy8g0J7Qv9GA0LXQtNC10LvQuNC8INC90LDQt9Cy0LDQvdC40LUg0YHQvtC30LTQsNCy0LDQtdC80L7QuSDQutC+0LvQu9C10LrRhtC40LhcbiAgICAgIHVzZXJzTWl4aW4uY29sbGVjdGlvbk5hbWUgPSB1c2Vyc01peGluLmNvbGxlY3Rpb25OYW1lIHx8IHJlc291cmNlTmFtZTtcbiAgICB9XG5cbiAgICAvLyDQn9C10YDQtdC0INGB0L7Qt9C00LDQvdC40LXQvCDQutC+0LvQu9C10LrRhtC40Lgg0L3Rg9C20L3QviDRgdC+0LfQtNCw0YLRjCDRgNC10YHRg9GA0YEsINGH0YLQvtCx0Ysg0YMg0LrQvtC70LvQtdC60YbQuNC4INCx0YvQu9CwINGB0YHRi9C70LrQsCDQvdCwINC90LXQs9C+XG4gICAgdGhpc1sgcmVzb3VyY2VOYW1lIF0gPSBuZXcgUmVzb3VyY2UoIHJlc291cmNlTmFtZSwgcGFyZW50UmVzb3VyY2UsIHVzZXJzTWl4aW4gKTtcblxuICAgIC8vINCh0L7Qt9C00LDRgtGMINC60L7Qu9C70LXQutGG0LjRjiwg0LXRgdC70Lgg0Y3RgtC+0LPQviDQtdGJ0LUg0L3QtSDRgdC00LXQu9Cw0LvQuFxuICAgIGlmICggdXNlcnNNaXhpbi5jb2xsZWN0aW9uTmFtZSAmJiAhc3RvcmFnZVsgdXNlcnNNaXhpbi5jb2xsZWN0aW9uTmFtZSBdICl7XG4gICAgICAvLyDQmNGJ0LXQvCDRgdGF0LXQvNGDLCDQtdGB0LvQuCDQvtC90LAg0YPQutCw0LfQsNC90LBcbiAgICAgIHZhciBzY2hlbWEgPSBzdG9yYWdlLnNjaGVtYXNbIHVzZXJzTWl4aW4uc2NoZW1hTmFtZSBdO1xuXG4gICAgICBpZiAoIHNjaGVtYSApe1xuICAgICAgICBzdG9yYWdlLmNyZWF0ZUNvbGxlY3Rpb24oIHVzZXJzTWl4aW4uY29sbGVjdGlvbk5hbWUsIHNjaGVtYSwgdGhpc1sgcmVzb3VyY2VOYW1lIF0gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Jlc291cmNlOjonICsgcmVzb3VyY2VOYW1lICsgJyBZb3UgY2Fubm90IHVzZSBzdG9yYWdlIChjcmVhdGUgY29sbGVjdGlvbiksIHdpdGhvdXQgc3BlY2lmeWluZyB0aGUgc2NoZW1hIG9mIHRoZSBkYXRhLicpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzWyByZXNvdXJjZU5hbWUgXTtcbiAgfSxcblxuICBfcmVzb3VyY2VSZXF1ZXN0OiBmdW5jdGlvbiggbWV0aG9kLCBhamF4U2V0dGluZ3MsIGRvbmUgKXtcbiAgICB2YXIgdXJsID0gdXRpbHMuY29uc3RydWN0VXJsKCB0aGlzICk7XG4gICAgdmFyIHVzZU5vdGlmaWNhdGlvbnMgPSB0aGlzLm5vdGlmaWNhdGlvbnM7XG5cbiAgICByZXR1cm4gdGhpcy5hcGlSb290Ll9yZXF1ZXN0KCBtZXRob2QsIHVybCwgYWpheFNldHRpbmdzLmRhdGEsIGFqYXhTZXR0aW5ncywgdXNlTm90aWZpY2F0aW9ucywgZG9uZSApO1xuICB9XG59O1xuXG4vLyBHRVRcbnJlc291cmNlTWl4aW4uZ2V0ID0gZ2V0UmVxdWVzdDtcbnJlc291cmNlTWl4aW4ucmVhZCA9IGdldFJlcXVlc3Q7XG5cbi8vIFBPU1RcbnJlc291cmNlTWl4aW4ucG9zdCA9IGNyZWF0ZVBvc3RMaWtlUmVxdWVzdCgnUE9TVCcpO1xucmVzb3VyY2VNaXhpbi5jcmVhdGUgPSByZXNvdXJjZU1peGluLnBvc3Q7XG5cbi8vIFBVVFxucmVzb3VyY2VNaXhpbi5wdXQgPSBjcmVhdGVQb3N0TGlrZVJlcXVlc3QoJ1BVVCcpO1xucmVzb3VyY2VNaXhpbi51cGRhdGUgPSByZXNvdXJjZU1peGluLnB1dDtcbnJlc291cmNlTWl4aW4uc2F2ZSA9IHJlc291cmNlTWl4aW4ucHV0O1xuXG4vLyBQQVRDSFxucmVzb3VyY2VNaXhpbi5wYXRjaCA9IGNyZWF0ZVBvc3RMaWtlUmVxdWVzdCgnUEFUQ0gnKTtcblxuLy8gREVMRVRFXG5yZXNvdXJjZU1peGluLmRlbGV0ZSA9IGRlbGV0ZVJlcXVlc3Q7XG5cbi8qKlxuICog0JrQvtC90YHRgtGA0YPQutGC0L7RgCDRgNC10YHRg9GA0YHQsCwg0L3QviDQstC+0LfQstGA0LDRidCw0LXRgiDRhNGD0L3QutGG0LjRjiDRgdC+INGB0LLQvtC50YHRgtCy0LDQvNC4XG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHJlc291cmNlTmFtZVxuICogQHBhcmFtIHtvYmplY3R9IHBhcmVudFJlc291cmNlXG4gKiBAcGFyYW0ge29iamVjdH0gdXNlcnNNaXhpblxuICogQHJldHVybnMge0Z1bmN0aW9ufSByZXNvdXJjZVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFJlc291cmNlKCByZXNvdXJjZU5hbWUsIHBhcmVudFJlc291cmNlLCB1c2Vyc01peGluICl7XG5cbiAgLyoqXG4gICAqINCt0YLRgyDRhNGD0L3QutGG0LjRjiDQvNGLINC+0YLQtNCw0ZHQvCDQv9C+0LvRjNC30L7QstCw0YLQtdC70Y4g0LIg0LrQsNGH0LXRgdGC0LLQtSDQtNC+0YHRgtGD0L/QsCDQuiDRgNC10YHRg9GA0YHRgy5cbiAgICog0J7QvdCwINC/0L7Qt9Cy0L7Qu9GP0LXRgiDQt9Cw0LTQsNGC0YwgaWRlbnRpdHkg0LTQu9GPINC30LDQv9GA0L7RgdCwLlxuICAgKlxuICAgKiBAcGFyYW0gW2lkZW50aXR5XVxuICAgKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gICAqL1xuICB2YXIgcmVzb3VyY2UgPSBmdW5jdGlvbiByZXNvdXJjZSggaWRlbnRpdHkgKXtcbiAgICBpZiAoIGlkZW50aXR5ID09IG51bGwgKXtcbiAgICAgIHJldHVybiByZXNvdXJjZTtcbiAgICB9XG5cbiAgICBpZiAoIGlkZW50aXR5ICYmICF1dGlscy5pc1N0cmluZyggaWRlbnRpdHkgKSApe1xuICAgICAgY29uc29sZS5lcnJvcignaWRlbnRpdHkg0LTQvtC70LbQtdC9INCx0YvRgtGMINGB0YLRgNC+0LrQvtC5LCDQsCDQvdC1JywgaWRlbnRpdHkgKTtcbiAgICB9XG5cbiAgICByZXNvdXJjZS5pZGVudGl0eSA9IGlkZW50aXR5IHx8ICcnO1xuXG4gICAgcmV0dXJuIHJlc291cmNlO1xuICB9O1xuXG4gICQuZXh0ZW5kKCByZXNvdXJjZSwgcmVzb3VyY2VNaXhpbiwge1xuICAgIHJlc291cmNlTmFtZTogcmVzb3VyY2VOYW1lLFxuICAgIHVybDogcmVzb3VyY2VOYW1lXG4gIH0sIHVzZXJzTWl4aW4gKTtcblxuICByZXNvdXJjZS5wYXJlbnRSZXNvdXJjZSA9IHBhcmVudFJlc291cmNlO1xuICByZXNvdXJjZS5hcGlSb290ID0gcGFyZW50UmVzb3VyY2UuYXBpUm9vdCB8fCBwYXJlbnRSZXNvdXJjZTtcblxuICByZXR1cm4gcmVzb3VyY2U7XG59XG5cbi8qKlxuICogQ3JlYXRlIG5ldyBhcGkgY2xpZW50XG4gKlxuICogQGV4YW1wbGVcbiAqIHZhciBhcGkgPSBuZXcgQXBpQ2xpZW50KCcvYXBpJywge1xuICogICBob29rczoge1xuICogICAgIGhlYWRlcnM6IHtcbiAqICAgICAgIHRva2VuOiAnWFhYWFhYJ1xuICogICAgIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogdmFyIGFwaSA9IG5ldyBBcGlDbGllbnQoJ2h0dHBzOi8vZG9tYWluLmNvbS9hcGknLCB7XG4gKiAgIGhvb2tzOiB7XG4gKiAgICAgaGVhZGVyczoge1xuICogICAgICAgdG9rZW46ICdYWFhYWFgnXG4gKiAgICAgfVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiB2YXIgYXBpID0gbmV3IEFwaUNsaWVudCh7XG4gKiAgIHVybDogJy9hcGknXG4gKiAgIGhvb2tzOiB7XG4gKiAgICAgaGVhZGVyczoge1xuICogICAgICAgdG9rZW46ICdYWFhYWFgnXG4gKiAgICAgfVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiBAcGFyYW0gdXJsIGFwaSByb290IHVybFxuICogQHBhcmFtIG9wdGlvbnMgYXBpIGNsaWVudCBvcHRpb25zXG4gKi9cbmZ1bmN0aW9uIEFwaUNsaWVudCggdXJsLCBvcHRpb25zICl7XG4gIGlmICggISh0aGlzIGluc3RhbmNlb2YgQXBpQ2xpZW50KSApIHtcbiAgICByZXR1cm4gbmV3IEFwaUNsaWVudCggdXJsLCBvcHRpb25zICk7XG4gIH1cblxuICB0aGlzLmRlZmF1bHRzID0ge1xuICAgIC8vIFN0cmlwIHNsYXNoZXMgYnkgZGVmYXVsdFxuICAgIHN0cmlwVHJhaWxpbmdTbGFzaGVzOiB0cnVlLFxuICB9O1xuXG4gIC8vIElmIGZpcnN0IGFyZyBpcyBvYmplY3RcbiAgaWYgKCB1dGlscy5pc09iamVjdCggdXJsICkgKXtcbiAgICBvcHRpb25zID0gdXJsO1xuICAgIHVybCA9IGxvY2F0aW9uLm9yaWdpbjtcbiAgfVxuXG4gIGlmICggdXJsID09IG51bGwgKXtcbiAgICB1cmwgPSBsb2NhdGlvbi5vcmlnaW47XG4gIH1cblxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgb3B0aW9ucy51cmwgPSB1cmw7XG5cbiAgLy8gRGVmYXVsdHMsIG5vdGlmaWNhdGlvbnMgaXMgb2ZmXG4gIHRoaXMubm90aWZpY2F0aW9ucyA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBob29rcyBmb3IgYWpheCBzZXR0aW5ncyAoYXMgYmFzZSBhamF4U2V0dGluZ3MpXG4gICAqIEBzZWUgaHR0cDovL2FwaS5qcXVlcnkuY29tL2pRdWVyeS5hamF4L1xuICAgKlxuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKi9cbiAgdGhpcy5ob29rcyA9IHtcbiAgICAvLyDQtNC+0L/QvtC70L3QuNGC0LXQu9GM0L3Ri9C1INC00LDQvdC90YvQtSDQt9Cw0L/RgNC+0YHQsFxuICAgIGRhdGE6IHt9LFxuICAgIC8vINCe0LHRitC10LrRgiDQtNC70Y8g0LTQvtCx0LDQstC70LXQvdC40Y8g0L/RgNC+0LjQt9Cy0L7Qu9GM0L3Ri9GFINC30LDQs9C+0LvQvtCy0LrQvtCyINC60L4g0LLRgdC10Lwg0LfQsNC/0YDQvtGB0LDQvFxuICAgIC8vINGD0LTQvtCx0L3QviDQtNC70Y8g0LDQstGC0L7RgNC40LfQsNGG0LjQuCDQv9C+INGC0L7QutC10L3QsNC8XG4gICAgaGVhZGVyczoge31cbiAgfTtcblxuICAvL3RvZG86IHRvIHV0aWxzIChkZWVwTWVyZ2UpINC00L7QsdCw0LLQuNGC0Ywg0LLQvtC30LzQvtC20L3QvtGB0YLRjCDRgNCw0YHRiNC40YDRj9GC0Ywg0L7QsdGK0LXQutGCLCDQsCDQvdC1INCy0L7Qt9Cy0YDQsNGJ0LDRgtGMINC90L7QstGL0LlcbiAgJC5leHRlbmQoIHRydWUsIHRoaXMsIG9wdGlvbnMgKTtcbn1cblxuQXBpQ2xpZW50LnByb3RvdHlwZSA9IHtcbiAgLyoqXG4gICAqINCU0L7QsdCw0LLQuNGC0Ywg0L3QvtCy0YvQuSDRgNC10YHRg9GA0YFcbiAgICogQHNlZSByZXNvdXJjZU1peGluLmFkZFxuICAgKi9cbiAgYWRkOiByZXNvdXJjZU1peGluLmFkZCxcblxuICBfbWV0aG9kczoge1xuICAgICdjcmVhdGUnOiAnUE9TVCcsXG4gICAgJ3JlYWQnOiAgICdHRVQnLFxuICAgICd1cGRhdGUnOiAnUFVUJyxcbiAgICAnZGVsZXRlJzogJ0RFTEVURScsXG4gICAgJ3BhdGNoJzogICdQQVRDSCcsXG5cbiAgICAncG9zdCc6ICAgJ1BPU1QnLFxuICAgICdnZXQnOiAgICAnR0VUJyxcbiAgICAnc2F2ZSc6ICAgJ1BVVCdcbiAgfSxcblxuICBfcHJlcGFyZUFqYXhTZXR0aW5nczogZnVuY3Rpb24oIG1ldGhvZCwgdXJsLCBkYXRhLCBhamF4U2V0dGluZ3MgKXtcbiAgICB2YXIgX2FqYXhTZXR0aW5ncyA9IHV0aWxzLmRlZXBNZXJnZSggdGhpcy5ob29rcywgYWpheFNldHRpbmdzICk7XG5cbiAgICBfYWpheFNldHRpbmdzLnR5cGUgPSBtZXRob2Q7XG5cbiAgICAvLyBzdHJpcCB0cmFpbGluZyBzbGFzaGVzIGFuZCBzZXQgdGhlIHVybCAodW5sZXNzIHRoaXMgYmVoYXZpb3IgaXMgc3BlY2lmaWNhbGx5IGRpc2FibGVkKVxuICAgIGlmICggdGhpcy5kZWZhdWx0cy5zdHJpcFRyYWlsaW5nU2xhc2hlcyApe1xuICAgICAgdXJsID0gdXJsLnJlcGxhY2UoL1xcLyskLywgJycpIHx8ICcvJztcbiAgICB9XG5cbiAgICBfYWpheFNldHRpbmdzLnVybCA9IHVybDtcblxuICAgIC8vINCU0L7QsdCw0LLQu9GP0LXQvCDQsNCy0YLQvtGA0LjQt9Cw0YbQuNGOINC/0L4g0YLQvtC60LXQvdGDXG4gICAgaWYgKCB0aGlzLnRva2VuICYmIGFqYXhTZXR0aW5ncy5oZWFkZXJzICYmIGFqYXhTZXR0aW5ncy5oZWFkZXJzLnRva2VuID09IG51bGwgKXtcbiAgICAgIF9hamF4U2V0dGluZ3MuaGVhZGVycy5BdXRob3JpemF0aW9uID0gJ3Rva2VuICcgKyB0aGlzLnRva2VuO1xuICAgIH1cblxuICAgIGlmICggbWV0aG9kID09PSAnR0VUJyApe1xuICAgICAgX2FqYXhTZXR0aW5ncy5kYXRhID0gdXRpbHMuZGVlcE1lcmdlKCBfYWpheFNldHRpbmdzLmRhdGEsIGRhdGEgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8g0JXRgdC70Lgg0YHQvtGF0YDQsNC90Y/QtdC8INC00L7QutGD0LzQtdC90YIsINC90YPQttC90L4g0YHQtNC10LvQsNGC0YwgdG9PYmplY3Qoe2RlcG9wdWxhdGU6IDF9KVxuICAgICAgaWYgKCBkYXRhICYmIGRhdGEuY29uc3RydWN0b3IgJiYgZGF0YS5jb25zdHJ1Y3Rvci5uYW1lICYmIGRhdGEuY29uc3RydWN0b3IubmFtZSA9PT0gJ0RvY3VtZW50JyApe1xuICAgICAgICBfYWpheFNldHRpbmdzLmRhdGEgPSB1dGlscy5kZWVwTWVyZ2UoIF9hamF4U2V0dGluZ3MuZGF0YSwgZGF0YS50b09iamVjdCh7ZGVwb3B1bGF0ZTogMX0pICk7XG5cbiAgICAgIH0gZWxzZSBpZiAoIGRhdGEgKSB7XG4gICAgICAgIF9hamF4U2V0dGluZ3MuZGF0YSA9IHV0aWxzLmRlZXBNZXJnZSggX2FqYXhTZXR0aW5ncy5kYXRhLCBkYXRhICk7XG4gICAgICB9XG5cbiAgICAgIGlmICggX2FqYXhTZXR0aW5ncy5kYXRhICYmIF9hamF4U2V0dGluZ3MuY29udGVudFR5cGUgPT09ICdhcHBsaWNhdGlvbi9qc29uJyApe1xuICAgICAgICBfYWpheFNldHRpbmdzLmRhdGEgPSBKU09OLnN0cmluZ2lmeSggX2FqYXhTZXR0aW5ncy5kYXRhICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gdG9kbyDQv9GA0L7QstC10YDRgtGMINC90LDQtNC+0LHQvdC+0YHRgtGMINC60L7QtNCwXG4gICAgLy8g0JjRgdC/0L7Qu9GM0LfRg9C10YLRgdGPINC00LvRjyDQsNC70LjQsNGB0L7Qsiwg0LIg0LrQvtGC0L7RgNGL0YUg0LLRgtC+0YDQvtC5INC/0LDRgNCw0LzQtdGC0YAgLSDQtdGB0YLRjCDQvtCx0YrQtdC60YIg0L3QsNGB0YLRgNC+0LXQulxuICAgIGlmICggdXRpbHMuaXNPYmplY3QoIHVybCApICl7XG4gICAgICBjb25zb2xlLmluZm8oJ9CQ0YVAKtGC0YwsINC90YPQttC90YvQuSDQutC+0LQhISEhJyk7XG4gICAgICBfYWpheFNldHRpbmdzID0gdXJsO1xuICAgICAgZGVidWdnZXI7XG4gICAgfVxuXG4gICAgcmV0dXJuIF9hamF4U2V0dGluZ3M7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNlbmQgcmVxdWVzdCBvbiBzZXJ2ZXJcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IG1ldGhvZCDQndCw0LfQstCw0L3QuNC1INC80LXRgtC+0LTQsCAoUE9TVCwgR0VULCBQVVQsIERFTEVURSwgUEFUQ0gpXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwg0J/QvtC70L3Ri9C5INGD0YDQuyDRgNC10YHRg9GA0YHQsFxuICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSDQntCx0YrQtdC60YIg0YEg0LTQsNC90L3Ri9C80Lgg0LTQu9GPINC30LDQv9GA0L7RgdCwXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBhamF4U2V0dGluZ3Mg0J7QsdGK0LXQutGCINGBINC90LDRgdGC0YDQvtC50LrQsNC80LhcbiAgICogQHBhcmFtIHtib29sZWFufSB1c2VOb3RpZmljYXRpb25zINCk0LvQsNCzLCDQuNGB0L/QvtC70YzQt9C+0LLQsNGC0Ywg0LvQuCDRg9Cy0LXQtNC+0LzQu9C10L3QuNGPXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGRvbmUg0KTRg9C90LrRhtC40Y8g0YPRgdC/0LXRiNC90L7Qs9C+INC+0LHRgNCw0YLQvdC+0LPQviDQstGL0LfQvtCy0LBcbiAgICogQHJldHVybnMgeyQuRGVmZXJyZWR9INCy0L7Qt9Cy0YDQsNGJ0LDQtdGCIGpxdWVyeSBhamF4INC+0LHRitC10LrRglxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3JlcXVlc3Q6IGZ1bmN0aW9uKCBtZXRob2QsIHVybCwgZGF0YSwgYWpheFNldHRpbmdzLCB1c2VOb3RpZmljYXRpb25zLCBkb25lICl7XG4gICAgaWYgKCAhdXRpbHMuaXNTdHJpbmcoIG1ldGhvZCApICl7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ9Cf0LDRgNCw0LzQtdGC0YAgYG1ldGhvZGAg0LTQvtC70LbQtdC9INCx0YvRgtGMINGB0YLRgNC+0LrQvtC5LCDQsCDQvdC1ICcsIG1ldGhvZCApO1xuICAgIH1cblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbm90aWZpY2F0aW9uVHlwZSA9IG1ldGhvZCA9PT0gJ0dFVCcgPyAnbG9hZCcgOiAoIG1ldGhvZCA9PT0gJ1BPU1QnIHx8IG1ldGhvZCA9PT0gJ1BVVCcgfHwgbWV0aG9kID09PSAnUEFUQ0gnICkgPyAnc2F2ZScgOiAnZGVsZXRlJztcbiAgICB2YXIgX2FqYXhTZXR0aW5ncyA9IHRoaXMuX3ByZXBhcmVBamF4U2V0dGluZ3MoIG1ldGhvZCwgdXJsLCBkYXRhLCBhamF4U2V0dGluZ3MgKTtcblxuICAgIC8vINCY0YHQv9C+0LvRjNC30L7QstCw0YLRjCDQt9C90LDRh9C10L3QuNC1INC/0L4g0YPQvNC+0LvRh9Cw0L3QuNGOLCDQtdGB0LvQuCB1c2VOb3RpZmljYXRpb25zINC90LUg0LfQsNC00LDQvVxuICAgIC8vINGC0YPRgiDQttC1INC/0L7RgNCy0LXRgNGP0LXQvCwg0L/QvtC00LrQu9GO0YfQtdC90Ysg0LvQuCDRg9Cy0LXQtNC+0LzQu9C10L3QuNGPXG4gICAgaWYgKCB1dGlscy5pc0Jvb2xlYW4oIHVzZU5vdGlmaWNhdGlvbnMgKSApe1xuICAgICAgdXNlTm90aWZpY2F0aW9ucyA9IHVzZU5vdGlmaWNhdGlvbnMgJiYgY2Yubm90aWZpY2F0aW9uO1xuICAgIH0gZWxzZSB7XG4gICAgICB1c2VOb3RpZmljYXRpb25zID0gdGhpcy5ub3RpZmljYXRpb25zICYmIGNmLm5vdGlmaWNhdGlvbjtcbiAgICB9XG5cbiAgICBpZiAoIHVzZU5vdGlmaWNhdGlvbnMgKXtcbiAgICAgIGNmLm5vdGlmaWNhdGlvblsgbm90aWZpY2F0aW9uVHlwZSBdLnNob3coKTtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyggbWV0aG9kICsgJyAnICsgX2FqYXhTZXR0aW5ncy51cmwgKTtcblxuICAgIHJldHVybiAkLmFqYXgoIF9hamF4U2V0dGluZ3MgKS5mYWlsKGZ1bmN0aW9uKCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKXtcbiAgICAgIGNvbnNvbGUud2FybigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICk7XG5cbiAgICAgIC8vIFVuYXV0aG9yaXplZCBDYWxsYmFja1xuICAgICAgaWYgKCBqcVhIUi5zdGF0dXMgPT09IDQwMSAmJiBzZWxmLnVuYXV0aG9yaXplZENhbGxiYWNrICl7XG4gICAgICAgIHNlbGYudW5hdXRob3JpemVkQ2FsbGJhY2soIGpxWEhSLCBtZXRob2QsIHVybCwgZGF0YSwgYWpheFNldHRpbmdzLCBkb25lICk7XG5cbiAgICAgICAgLy8g0J3QtSDQv9C+0LrQsNC30YvQstCw0YLRjCDRgdC+0L7QsdGJ0LXQvdC40LUg0YEg0L7RiNC40LHQutC+0Lkg0L/RgNC4IDQwMSwg0LXRgdC70Lgg0LLRgdGRINC/0LvQvtGF0L4sINGC0L4g0YDQvtGD0YLQtdGAINGB0LDQvCDQv9C10YDQtdC60LjQvdC10YIg0L3QsCDRhNC+0YDQvNGDINCy0YXQvtC00LBcbiAgICAgICAgaWYgKCB1c2VOb3RpZmljYXRpb25zICl7XG4gICAgICAgICAgY2Yubm90aWZpY2F0aW9uWyBub3RpZmljYXRpb25UeXBlIF0uaGlkZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoIHVzZU5vdGlmaWNhdGlvbnMgKXtcbiAgICAgICAgY2Yubm90aWZpY2F0aW9uWyBub3RpZmljYXRpb25UeXBlIF0uZmFpbCgpO1xuICAgICAgfVxuXG4gICAgfSkuZG9uZShmdW5jdGlvbigpe1xuICAgICAgaWYgKCB1c2VOb3RpZmljYXRpb25zICl7XG4gICAgICAgIGNmLm5vdGlmaWNhdGlvblsgbm90aWZpY2F0aW9uVHlwZSBdLmhpZGUoKTtcbiAgICAgIH1cbiAgICB9KS5kb25lKCBkb25lICk7XG4gIH1cbn07XG5cbi8qKlxuICogTWV0aG9kIGZvciBnZXQgcmVxdWVzdCB0byBhcGkgcm9vdFxuICpcbiAqIEBwYXJhbSBhamF4U2V0dGluZ3NcbiAqIEBwYXJhbSBkb25lXG4gKiBAcmV0dXJucyB7JC5EZWZlcnJlZH1cbiAqL1xuQXBpQ2xpZW50LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiggYWpheFNldHRpbmdzLCBkb25lICl7XG4gIGNvbnNvbGUubG9nKCAnYXBpOjpnZXQnICk7XG4gIGlmICggdXRpbHMuaXNGdW5jdGlvbiggYWpheFNldHRpbmdzICkgKXtcbiAgICBkb25lID0gYWpheFNldHRpbmdzO1xuICAgIGFqYXhTZXR0aW5ncyA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGFqYXhTZXR0aW5ncyA9IGFqYXhTZXR0aW5ncyB8fCB7fTtcblxuICByZXR1cm4gdGhpcy5fcmVxdWVzdCgnR0VUJywgdGhpcy51cmwsIHVuZGVmaW5lZCwgYWpheFNldHRpbmdzLCBmYWxzZSwgZG9uZSApO1xufTtcbi8qKlxuICogQGFsaWFzIEFwaUNsaWVudC5wcm90b3R5cGUuZ2V0XG4gKiBAdHlwZSB7RnVuY3Rpb259XG4gKi9cbkFwaUNsaWVudC5wcm90b3R5cGUucmVhZCA9IEFwaUNsaWVudC5wcm90b3R5cGUuZ2V0O1xuXG5BcGlDbGllbnQudmVyc2lvbiA9ICcwLjMuMCc7XG5cbkFwaUNsaWVudC51dGlscyA9IHV0aWxzO1xuXG5leHBvcnQgeyBBcGlDbGllbnQgfTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBTyxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7QUFDeEIsQUFJQSxJQUFJLE9BQU8sR0FBRyxrQkFBa0IsQ0FBQztBQUNqQyxBQU1BLElBQUksU0FBUyxHQUFHLGlCQUFpQixDQUFDO0FBQ2xDLEFBR0EsSUFBSSxXQUFXLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQzs7Ozs7OztBQU9uQyxJQUFJLFdBQVcsR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDOzs7Ozs7Ozs7QUFTdkMsU0FBUyxZQUFZLENBQUMsS0FBSyxFQUFFO0VBQzNCLE9BQU8sQ0FBQyxLQUFLLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxLQUFLLEtBQUssQ0FBQztDQUN0RDs7Ozs7Ozs7Ozs7Ozs7OztBQWdCRCxLQUFLLENBQUMsUUFBUSxHQUFHLFNBQVMsUUFBUSxFQUFFLEtBQUssR0FBRztFQUMxQyxPQUFPLE9BQU8sS0FBSyxLQUFLLFFBQVEsS0FBSyxZQUFZLENBQUMsS0FBSyxDQUFDLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxTQUFTLENBQUMsSUFBSSxLQUFLLENBQUM7Q0FDN0csQ0FB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
