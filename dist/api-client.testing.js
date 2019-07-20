/**
 * Rest-Api-Client v0.3.0
 * https://github.com/archangel-irk/rest-api-client
 * (c) Constantine Melnikov 2013 - 2019
 * MIT License
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = global || self, factory(global.ApiClient = {}));
}(this, function (exports) { 'use strict';

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

  exports.ApiClient = ApiClient;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLWNsaWVudC50ZXN0aW5nLmpzIiwic291cmNlcyI6WyIuLi9zcmMvdXRpbHMuanMiLCIuLi9zcmMvZ2V0LmpzIiwiLi4vc3JjL3Bvc3QuanMiLCIuLi9zcmMvZGVsZXRlLmpzIiwiLi4vc3JjL2NhY2hlLmpzIiwiLi4vc3JjL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjb25zdCB1dGlscyA9IHt9O1xuXG4vKiogYE9iamVjdCN0b1N0cmluZ2AgcmVzdWx0IHJlZmVyZW5jZXMuICovXG52YXIgYXJnc1RhZyA9ICdbb2JqZWN0IEFyZ3VtZW50c10nO1xudmFyIGFycmF5VGFnID0gJ1tvYmplY3QgQXJyYXldJztcbnZhciBib29sVGFnID0gJ1tvYmplY3QgQm9vbGVhbl0nO1xudmFyIGRhdGVUYWcgPSAnW29iamVjdCBEYXRlXSc7XG52YXIgZXJyb3JUYWcgPSAnW29iamVjdCBFcnJvcl0nO1xudmFyIGZ1bmNUYWcgPSAnW29iamVjdCBGdW5jdGlvbl0nO1xudmFyIG51bWJlclRhZyA9ICdbb2JqZWN0IE51bWJlcl0nO1xudmFyIG9iamVjdFRhZyA9ICdbb2JqZWN0IE9iamVjdF0nO1xudmFyIHJlZ2V4cFRhZyA9ICdbb2JqZWN0IFJlZ0V4cF0nO1xudmFyIHN0cmluZ1RhZyA9ICdbb2JqZWN0IFN0cmluZ10nO1xuXG4vKiogVXNlZCBmb3IgbmF0aXZlIG1ldGhvZCByZWZlcmVuY2VzLiAqL1xudmFyIGFycmF5UHJvdG8gPSBBcnJheS5wcm90b3R5cGU7XG52YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKipcbiAqIFVzZWQgdG8gcmVzb2x2ZSB0aGUgYHRvU3RyaW5nVGFnYCBvZiB2YWx1ZXMuXG4gKiBTZWUgdGhlIFtFUyBzcGVjXShodHRwczovL3Blb3BsZS5tb3ppbGxhLm9yZy9+am9yZW5kb3JmZi9lczYtZHJhZnQuaHRtbCNzZWMtb2JqZWN0LnByb3RvdHlwZS50b3N0cmluZylcbiAqIGZvciBtb3JlIGRldGFpbHMuXG4gKi9cbnZhciBvYmpUb1N0cmluZyA9IG9iamVjdFByb3RvLnRvU3RyaW5nO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0TGlrZSh2YWx1ZSkge1xuICByZXR1cm4gKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHx8IGZhbHNlO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGNsYXNzaWZpZWQgYXMgYSBgU3RyaW5nYCBwcmltaXRpdmUgb3Igb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgY29ycmVjdGx5IGNsYXNzaWZpZWQsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogdXRpbHMuaXNTdHJpbmcoJ2FiYycpO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIHV0aWxzLmlzU3RyaW5nKDEpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xudXRpbHMuaXNTdHJpbmcgPSBmdW5jdGlvbiBpc1N0cmluZyggdmFsdWUgKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnIHx8IChpc09iamVjdExpa2UodmFsdWUpICYmIG9ialRvU3RyaW5nLmNhbGwodmFsdWUpID09PSBzdHJpbmdUYWcpIHx8IGZhbHNlO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBjbGFzc2lmaWVkIGFzIGEgYm9vbGVhbiBwcmltaXRpdmUgb3Igb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgY29ycmVjdGx5IGNsYXNzaWZpZWQsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogdXRpbHMuaXNCb29sZWFuKGZhbHNlKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiB1dGlscy5pc0Jvb2xlYW4obnVsbCk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG51dGlscy5pc0Jvb2xlYW4gPSBmdW5jdGlvbiBpc0Jvb2xlYW4odmFsdWUpIHtcbiAgcmV0dXJuICh2YWx1ZSA9PT0gdHJ1ZSB8fCB2YWx1ZSA9PT0gZmFsc2UgfHwgaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBvYmpUb1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gYm9vbFRhZykgfHwgZmFsc2U7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIHRoZSBsYW5ndWFnZSB0eXBlIG9mIGBPYmplY3RgLlxuICogKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXG4gKlxuICogKipOb3RlOioqIFNlZSB0aGUgW0VTNSBzcGVjXShodHRwczovL2VzNS5naXRodWIuaW8vI3g4KSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gb2JqZWN0LCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIHV0aWxzLmlzT2JqZWN0KHt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiB1dGlscy5pc09iamVjdChbMSwgMiwgM10pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIHV0aWxzLmlzT2JqZWN0KDEpO1xuICogLy8gPT4gZmFsc2VcbiAqXG4gKiB1dGlscy5pc09iamVjdChmdW5jdGlvbigpe30pO1xuICogLy8gPT4gZmFsc2VcbiAqL1xudXRpbHMuaXNPYmplY3QgPSBmdW5jdGlvbiBpc09iamVjdCggdmFsdWUgKSB7XG4gIC8vIEF2b2lkIGEgVjggSklUIGJ1ZyBpbiBDaHJvbWUgMTktMjAuXG4gIC8vIFNlZSBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MjI5MSBmb3IgbW9yZSBkZXRhaWxzLlxuICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcbiAgcmV0dXJuICh2YWx1ZSAmJiB2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlID09PSAnb2JqZWN0JykgfHwgZmFsc2U7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGNsYXNzaWZpZWQgYXMgYSBgRnVuY3Rpb25gIG9iamVjdC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGNvcnJlY3RseSBjbGFzc2lmaWVkLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIHV0aWxzLmlzRnVuY3Rpb24oZnVuY3Rpb24oKXt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiB1dGlscy5pc0Z1bmN0aW9uKC9hYmMvKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbnV0aWxzLmlzRnVuY3Rpb24gPSBmdW5jdGlvbiBpc0Z1bmN0aW9uKHZhbHVlKSB7XG4gIC8vIEF2b2lkIGEgQ2hha3JhIEpJVCBidWcgaW4gY29tcGF0aWJpbGl0eSBtb2RlcyBvZiBJRSAxMS5cbiAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9qYXNoa2VuYXMvdW5kZXJzY29yZS9pc3N1ZXMvMTYyMSBmb3IgbW9yZSBkZXRhaWxzLlxuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nIHx8IGZhbHNlO1xufTtcblxuLy8gaHR0cHM6Ly9naXRodWIuY29tL25yZjExMC9kZWVwbWVyZ2Vcbi8qKlxuICogTWVyZ2UgdHdvIG9iamVjdHMgYHhgIGFuZCBgeWAgZGVlcGx5LCByZXR1cm5pbmcgYSBuZXcgbWVyZ2VkIG9iamVjdCB3aXRoIHRoZSBlbGVtZW50cyBmcm9tIGJvdGggYHhgIGFuZCBgeWAuXG4gKlxuICogSWYgYW4gZWxlbWVudCBhdCB0aGUgc2FtZSBrZXkgaXMgcHJlc2VudCBmb3IgYm90aCBgeGAgYW5kIGB5YCwgdGhlIHZhbHVlIGZyb20gYHlgIHdpbGwgYXBwZWFyIGluIHRoZSByZXN1bHQuXG4gKlxuICogVGhlIG1lcmdlIGlzIGltbXV0YWJsZSwgc28gbmVpdGhlciBgeGAgbm9yIGB5YCB3aWxsIGJlIG1vZGlmaWVkLlxuICpcbiAqIFRoZSBtZXJnZSB3aWxsIGFsc28gbWVyZ2UgYXJyYXlzIGFuZCBhcnJheSB2YWx1ZXMuXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogQHBhcmFtIHNyY1xuICogQHJldHVybnMge2Jvb2xlYW58QXJyYXl8e319XG4gKi9cbnV0aWxzLmRlZXBNZXJnZSA9IGZ1bmN0aW9uIGRlZXBNZXJnZSggdGFyZ2V0LCBzcmMgKXtcbiAgdmFyIGFycmF5ID0gQXJyYXkuaXNBcnJheShzcmMpO1xuICB2YXIgZHN0ID0gYXJyYXkgJiYgW10gfHwge307XG5cbiAgaWYgKGFycmF5KSB7XG4gICAgdGFyZ2V0ID0gdGFyZ2V0IHx8IFtdO1xuICAgIGRzdCA9IGRzdC5jb25jYXQodGFyZ2V0KTtcbiAgICBzcmMuZm9yRWFjaChmdW5jdGlvbihlLCBpKSB7XG4gICAgICBpZiAodHlwZW9mIGRzdFtpXSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgZHN0W2ldID0gZTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGRzdFtpXSA9IGRlZXBNZXJnZSh0YXJnZXRbaV0sIGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRhcmdldC5pbmRleE9mKGUpID09PSAtMSkge1xuICAgICAgICAgIGRzdC5wdXNoKGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKHRhcmdldCAmJiB0eXBlb2YgdGFyZ2V0ID09PSAnb2JqZWN0Jykge1xuICAgICAgT2JqZWN0LmtleXModGFyZ2V0KS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgZHN0W2tleV0gPSB0YXJnZXRba2V5XTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICggc3JjID09IG51bGwgKXtcbiAgICAgIHJldHVybiBkc3Q7XG4gICAgfVxuXG4gICAgT2JqZWN0LmtleXMoc3JjKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgIGlmICh0eXBlb2Ygc3JjW2tleV0gIT09ICdvYmplY3QnIHx8ICFzcmNba2V5XSkge1xuICAgICAgICBkc3Rba2V5XSA9IHNyY1trZXldO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGlmICghdGFyZ2V0W2tleV0pIHtcbiAgICAgICAgICBkc3Rba2V5XSA9IHNyY1trZXldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRzdFtrZXldID0gZGVlcE1lcmdlKHRhcmdldFtrZXldLCBzcmNba2V5XSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBkc3Q7XG59O1xuXG4vKipcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9haGVja21hbm4vbXF1ZXJ5L2Jsb2IvbWFzdGVyL2xpYi9tcXVlcnkuanNcbiAqIG1xdWVyeS5zZWxlY3RcbiAqXG4gKiBTcGVjaWZpZXMgd2hpY2ggZG9jdW1lbnQgZmllbGRzIHRvIGluY2x1ZGUgb3IgZXhjbHVkZVxuICpcbiAqICMjIyNTdHJpbmcgc3ludGF4XG4gKlxuICogV2hlbiBwYXNzaW5nIGEgc3RyaW5nLCBwcmVmaXhpbmcgYSBwYXRoIHdpdGggYC1gIHdpbGwgZmxhZyB0aGF0IHBhdGggYXMgZXhjbHVkZWQuXG4gKiBXaGVuIGEgcGF0aCBkb2VzIG5vdCBoYXZlIHRoZSBgLWAgcHJlZml4LCBpdCBpcyBpbmNsdWRlZC5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICAvLyBpbmNsdWRlIGEgYW5kIGIsIGV4Y2x1ZGUgY1xuICogICAgIHV0aWxzLnNlbGVjdCgnYSBiIC1jJyk7XG4gKlxuICogICAgIC8vIG9yIHlvdSBtYXkgdXNlIG9iamVjdCBub3RhdGlvbiwgdXNlZnVsIHdoZW5cbiAqICAgICAvLyB5b3UgaGF2ZSBrZXlzIGFscmVhZHkgcHJlZml4ZWQgd2l0aCBhIFwiLVwiXG4gKiAgICAgdXRpbHMuc2VsZWN0KHthOiAxLCBiOiAxLCBjOiAwfSk7XG4gKlxuICogQHBhcmFtIHtPYmplY3R8U3RyaW5nfSBzZWxlY3Rpb25cbiAqIEByZXR1cm4ge09iamVjdHx1bmRlZmluZWR9XG4gKiBAYXBpIHB1YmxpY1xuICovXG51dGlscy5zZWxlY3QgPSBmdW5jdGlvbiBzZWxlY3QoIHNlbGVjdGlvbiApe1xuICBpZiAoIXNlbGVjdGlvbikgcmV0dXJuO1xuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHNlbGVjdDogc2VsZWN0IG9ubHkgdGFrZXMgMSBhcmd1bWVudCcpO1xuICB9XG5cbiAgdmFyIGZpZWxkcyA9IHt9O1xuICB2YXIgdHlwZSA9IHR5cGVvZiBzZWxlY3Rpb247XG5cbiAgaWYgKCdzdHJpbmcnID09PSB0eXBlIHx8ICdvYmplY3QnID09PSB0eXBlICYmICdudW1iZXInID09PSB0eXBlb2Ygc2VsZWN0aW9uLmxlbmd0aCAmJiAhQXJyYXkuaXNBcnJheSggc2VsZWN0aW9uICkpIHtcbiAgICBpZiAoJ3N0cmluZycgPT09IHR5cGUpe1xuICAgICAgc2VsZWN0aW9uID0gc2VsZWN0aW9uLnNwbGl0KC9cXHMrLyk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHNlbGVjdGlvbi5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgdmFyIGZpZWxkID0gc2VsZWN0aW9uWyBpIF07XG4gICAgICBpZiAoICFmaWVsZCApIGNvbnRpbnVlO1xuICAgICAgdmFyIGluY2x1ZGUgPSAnLScgPT09IGZpZWxkWyAwIF0gPyAwIDogMTtcbiAgICAgIGlmIChpbmNsdWRlID09PSAwKSBmaWVsZCA9IGZpZWxkLnN1YnN0cmluZyggMSApO1xuICAgICAgZmllbGRzWyBmaWVsZCBdID0gaW5jbHVkZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmllbGRzO1xuICB9XG5cbiAgaWYgKCB1dGlscy5pc09iamVjdCggc2VsZWN0aW9uICkgJiYgIUFycmF5LmlzQXJyYXkoIHNlbGVjdGlvbiApKSB7XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyggc2VsZWN0aW9uICk7XG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBrZXlzLmxlbmd0aDsgKytqKSB7XG4gICAgICBmaWVsZHNbIGtleXNbIGogXSBdID0gc2VsZWN0aW9uWyBrZXlzWyBqIF0gXTtcbiAgICB9XG4gICAgcmV0dXJuIGZpZWxkcztcbiAgfVxuXG4gIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgc2VsZWN0KCkgYXJndW1lbnQuIE11c3QgYmUgc3RyaW5nIG9yIG9iamVjdC4nKTtcbn07XG5cbi8vINCe0YfQuNGB0YLQuNGC0YwgaWRlbnRpdHkg0YMg0YDQtdGB0YPRgNGB0LAg0Lgg0LXQs9C+INGA0L7QtNC40YLQtdC70YzRgdC60LjRhSDRgNC10YHRg9GA0YHQvtCyINGC0L7QttC1XG51dGlscy5jbGVhcklkZW50aXR5ID0gZnVuY3Rpb24gY2xlYXJJZGVudGl0eSggcmVzb3VyY2UgKXtcbiAgd2hpbGUgKCByZXNvdXJjZS5wYXJlbnRSZXNvdXJjZSApIHtcbiAgICByZXNvdXJjZS5pZGVudGl0eSA9ICcnO1xuICAgIHJlc291cmNlID0gcmVzb3VyY2UucGFyZW50UmVzb3VyY2U7XG4gIH1cbn07XG5cbi8vINCh0L7QsdGA0LDRgtGMIHVybCAo0LHQtdC3IHF1ZXJ5IHN0cmluZylcbnV0aWxzLmNvbnN0cnVjdFVybCA9IGZ1bmN0aW9uIGNvbnN0cnVjdFVybCggcmVzb3VyY2UgKXtcbiAgdmFyIGlkZW50aXR5ID0gcmVzb3VyY2UuaWRlbnRpdHkgPyAnLycgKyByZXNvdXJjZS5pZGVudGl0eSA6ICcvJztcblxuICAvLyDQn9GA0L7QsdC10LbQsNGC0YzRgdGPINC/0L4g0LLRgdC10Lwg0YDQtdGB0YPRgNGB0LDQvCwg0LIg0YLQvtC8INGH0LjRgdC70LUg0LIg0LrQvtGA0LXQvdGMINCw0L/QuCwg0YfRgtC+0LHRiyDRgdC+0LHRgNCw0YLRjCB1cmxcbiAgcmV0dXJuIHJlc291cmNlLnBhcmVudFJlc291cmNlXG4gICAgPyBjb25zdHJ1Y3RVcmwoIHJlc291cmNlLnBhcmVudFJlc291cmNlICkgKyAnLycgKyByZXNvdXJjZS51cmwgKyBpZGVudGl0eVxuICAgIDogcmVzb3VyY2UudXJsO1xufTtcbiIsImltcG9ydCB7IHV0aWxzIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbi8qKlxuICogR0VUIHJlcXVlc3RcbiAqXG4gKiDQkiBhamF4U2V0dGluZ3Mg0LzQvtC20L3QviDRg9C60LDQt9Cw0YLRjCDQv9C+0LvQtSBkb05vdFN0b3JlIC0g0YfRgtC+0LHRiyDQvdC1INGB0L7RhdGA0LDQvdGP0YLRjCDQv9C+0LvRg9GH0LXQvdC90YvQuSDQvtCx0YrQtdC60YIg0LIgc3RvcmFnZVxuICpcbiAqIEBwYXJhbSBbZGF0YV1cbiAqIEBwYXJhbSBbYWpheFNldHRpbmdzXVxuICogQHBhcmFtIFtkb25lXVxuICogQHJldHVybnMgeyp9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRSZXF1ZXN0KCBkYXRhLCBhamF4U2V0dGluZ3MsIGRvbmUgKXtcbiAgdmFyIHJlc291cmNlID0gdGhpcztcbiAgdmFyIG1ldGhvZCA9ICdHRVQnO1xuICB2YXIga2V5O1xuXG4gIC8vINCV0YHQu9C4IGRhdGEgLSDQtdGB0YLRjCDRhNGD0L3QutGG0LjRjywg0YLQviDRjdGC0L4gZG9uZVxuICBpZiAoIHV0aWxzLmlzRnVuY3Rpb24oIGRhdGEgKSApe1xuICAgIGRvbmUgPSBkYXRhO1xuICAgIGRhdGEgPSB1bmRlZmluZWQ7XG4gIH1cbiAgaWYgKCB1dGlscy5pc0Z1bmN0aW9uKCBhamF4U2V0dGluZ3MgKSApe1xuICAgIGRvbmUgPSBhamF4U2V0dGluZ3M7XG4gICAgYWpheFNldHRpbmdzID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgYWpheFNldHRpbmdzID0gYWpheFNldHRpbmdzIHx8IHt9O1xuICBhamF4U2V0dGluZ3MuZGF0YSA9IGRhdGE7XG5cbiAgaWYgKCByZXNvdXJjZS5hcGlSb290LmRlZmF1bHRzLmNhY2hlICl7XG4gICAgYWpheFNldHRpbmdzLnVybCA9IHV0aWxzLmNvbnN0cnVjdFVybCggcmVzb3VyY2UgKTtcblxuICAgIGtleSA9IHJlc291cmNlLmFwaVJvb3QuY2FjaGUuZ2V0S2V5KCBhamF4U2V0dGluZ3MgKTtcbiAgICB2YXIgcmVxID0gcmVzb3VyY2UuYXBpUm9vdC5jYWNoZS5nZXQoIGtleSApO1xuXG4gICAgaWYgKCByZXEgKXtcbiAgICAgIGRvbmUgJiYgZG9uZSggcmVxLnJlc3BvbnNlLCByZXEudGV4dFN0YXR1cywgcmVxLmpxWEhSICk7XG4gICAgICB1dGlscy5jbGVhcklkZW50aXR5KCByZXNvdXJjZSApO1xuICAgICAgcmV0dXJuICQuRGVmZXJyZWQoKS5yZXNvbHZlKCByZXEucmVzcG9uc2UsIHJlcS50ZXh0U3RhdHVzLCByZXEuanFYSFIgKTtcbiAgICB9XG4gIH1cblxuICB2YXIgZGZkID0gJC5EZWZlcnJlZCgpO1xuICB0aGlzLl9yZXNvdXJjZVJlcXVlc3QoIG1ldGhvZCwgYWpheFNldHRpbmdzICkuZG9uZShmdW5jdGlvbiggcmVzcG9uc2UsIHRleHRTdGF0dXMsIGpxWEhSICl7XG4gICAgdmFyIGZpZWxkcztcblxuICAgIC8vICNleGFtcGxlXG4gICAgLy8gYXBpLnBsYWNlcyh7IGZpZWxkczogJ25hbWUnLCBza2lwOiAxMDAgfSk7XG4gICAgLy8g0JXRgdC70Lgg0LHRi9C70LAg0LLRi9Cx0L7RgNC60LAg0L/QviDQv9C+0LvRj9C8LCDQvdGD0LbQvdC+INC/0YDQsNCy0LjQu9GM0L3QviDQvtCx0YDQsNCx0L7RgtCw0YLRjCDQtdGRINC4INC/0LXRgNC10LTQsNGC0Ywg0LIg0LTQvtC60YPQvNC10L3RglxuICAgIGlmICggZGF0YSAmJiBkYXRhLmZpZWxkcyApe1xuICAgICAgZmllbGRzID0gdXRpbHMuc2VsZWN0KCBkYXRhLmZpZWxkcyApO1xuICAgIH1cblxuICAgIC8vINCV0YHRgtGMINC+0YLQstC10YIg0L3QsNC00L4g0YHQvtGF0YDQsNC90LjRgtGMINCyINGF0YDQsNC90LjQu9C40YnQtVxuICAgIGlmICggcmVzb3VyY2Uuc3RvcmFnZSAmJiAhYWpheFNldHRpbmdzLmRvTm90U3RvcmUgKXtcbiAgICAgIHJlc3BvbnNlID0gc3RvcmFnZVsgcmVzb3VyY2UuY29sbGVjdGlvbk5hbWUgXS5hZGQoIHJlc3BvbnNlLCBmaWVsZHMsIHRydWUgKTtcbiAgICB9XG5cbiAgICBpZiAoIHJlc291cmNlLmFwaVJvb3QuZGVmYXVsdHMuY2FjaGUgKXtcbiAgICAgIHJlc291cmNlLmFwaVJvb3QuY2FjaGUucHV0KCBrZXksIHtcbiAgICAgICAgcmVzcG9uc2U6IHJlc3BvbnNlLFxuICAgICAgICB0ZXh0U3RhdHVzOiB0ZXh0U3RhdHVzLFxuICAgICAgICBqcVhIUjoganFYSFJcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGRvbmUgJiYgZG9uZSggcmVzcG9uc2UsIHRleHRTdGF0dXMsIGpxWEhSICk7XG4gICAgZGZkLnJlc29sdmUoIHJlc3BvbnNlLCB0ZXh0U3RhdHVzLCBqcVhIUiApO1xuXG4gIH0pLmZhaWwoZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApe1xuICAgIGRmZC5yZWplY3QoIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApO1xuICB9KTtcblxuICAvL1RPRE86INCY0YHQv9C+0LvRjNC30L7QstCw0YLRjCDQuNC00LXQvtC70L7Qs9GOIHF1ZXJ5PyBxdWVyeSDQvtCx0YrQtdC60YIg0LTQu9GPINC/0L7RgdGC0YDQvtC10L3QuNGPINC30LDQv9GA0L7RgdC+0LJcblxuICAvLyBpZGVudGl0eSDRgdC+0YXRgNCw0L3Rj9C10YLRgdGPINC00LvRjyBjb25zdHJ1Y3RVcmwsINC10LPQviDQvdGD0LbQvdC+INC+0YfQuNGB0YLQuNGC0Ywg0LTQu9GPINC/0L7RgdC70LXQtNGD0Y7RidC40YUg0LfQsNC/0YDQvtGB0L7Qsi5cbiAgdXRpbHMuY2xlYXJJZGVudGl0eSggcmVzb3VyY2UgKTtcblxuICByZXR1cm4gZGZkO1xufVxuIiwiaW1wb3J0IHsgdXRpbHMgfSBmcm9tICcuL3V0aWxzLmpzJztcblxuXG5mdW5jdGlvbiBwb3N0TGlrZVJlcXVlc3QoIG1ldGhvZCwgZGF0YSwgYWpheFNldHRpbmdzLCBkb25lICl7XG4gIHZhciByZXNvdXJjZSA9IHRoaXM7XG4gIHZhciBpZGVudGl0eSA9IHRoaXMuaWRlbnRpdHk7XG4gIHZhciBkb2N1bWVudElkU3RyaW5nO1xuXG4gIC8vINCV0YHQu9C4IGRhdGEgLSDQtdGB0YLRjCDRhNGD0L3QutGG0LjRjywg0YLQviDRjdGC0L4gZG9uZVxuICBpZiAoIHV0aWxzLmlzRnVuY3Rpb24oIGRhdGEgKSApe1xuICAgIGRvbmUgPSBkYXRhO1xuICAgIGRhdGEgPSB1bmRlZmluZWQ7XG4gIH1cbiAgaWYgKCB1dGlscy5pc0Z1bmN0aW9uKCBhamF4U2V0dGluZ3MgKSApe1xuICAgIGRvbmUgPSBhamF4U2V0dGluZ3M7XG4gICAgYWpheFNldHRpbmdzID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgYWpheFNldHRpbmdzID0gYWpheFNldHRpbmdzIHx8IHt9O1xuXG4gIC8vINCf0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuCDQtNC+0LrRg9C80LXQvdGC0LAg0L3Rg9C20L3QviDRgdC+0YXRgNCw0L3Rj9GC0Ywg0YLQvtC70YzQutC+INC40LfQvNC10L3RkdC90L3Ri9C1INC/0L7Qu9GPXG4gIC8vINCY0L3QvtCz0LTQsCDQv9C10YDQtdC00LDRjtGCINC00L7QutGD0LzQtdC90YJcbiAgaWYgKCByZXNvdXJjZS5zdG9yYWdlICYmIGRhdGEgaW5zdGFuY2VvZiBzdG9yYWdlLkRvY3VtZW50ICkge1xuICAgIGRvY3VtZW50SWRTdHJpbmcgPSBkYXRhLl9pZC50b1N0cmluZygpO1xuICAgIGRhdGEgPSBkYXRhLiRfX2RlbHRhKCk7XG5cbiAgLy8g0KLQsNC6INC80L7QttC90L4g0L/QvtC90Y/RgtGMLCDRh9GC0L4g0LzRiyDRgdC+0YXRgNCw0L3Rj9C10Lwg0YHRg9GJ0LXRgtCy0YPRjtGJ0LjQuSDQvdCwINGB0LXRgNCy0LXRgNC1IERvY3VtZW50XG4gIH0gZWxzZSBpZiAoIHJlc291cmNlLnN0b3JhZ2UgJiYgc3RvcmFnZS5PYmplY3RJZC5pc1ZhbGlkKCBpZGVudGl0eSApICkge1xuICAgIGRvY3VtZW50SWRTdHJpbmcgPSBpZGVudGl0eTtcblxuICAvLyDQn9GA0Lgg0YHQvtGF0YDQsNC90LXQvdC40Lgg0YfQtdGA0LXQtyDQvNC10YLQvtC0IHNhdmUoKSDRgyDQtNC+0LrRg9C80LXQvdGC0LBcbiAgfSBlbHNlIGlmICggcmVzb3VyY2Uuc3RvcmFnZSAmJiBkYXRhLl9pZCAmJiBzdG9yYWdlLk9iamVjdElkLmlzVmFsaWQoIGRhdGEuX2lkICkgKSB7XG4gICAgZG9jdW1lbnRJZFN0cmluZyA9IGRhdGEuX2lkLnRvU3RyaW5nKCk7XG4gIH1cblxuICBhamF4U2V0dGluZ3MuZGF0YSA9IGRhdGE7XG5cbiAgdmFyIGRmZCA9ICQuRGVmZXJyZWQoKTtcbiAgdGhpcy5fcmVzb3VyY2VSZXF1ZXN0KCBtZXRob2QsIGFqYXhTZXR0aW5ncyApLmRvbmUoZnVuY3Rpb24oIHJlc3BvbnNlLCB0ZXh0U3RhdHVzLCBqcVhIUiApe1xuICAgIHZhciBkb2M7XG5cbiAgICAvLyDQldGB0YLRjCDQvtGC0LLQtdGCINC90LDQtNC+INGB0L7RhdGA0LDQvdC40YLRjCDQsiDRhdGA0LDQvdC40LvQuNGJ0LVcbiAgICBpZiAoIHJlc291cmNlLnN0b3JhZ2UgJiYgIWFqYXhTZXR0aW5ncy5kb05vdFN0b3JlICl7XG4gICAgICAvLyDQn9GA0Lgg0YHQvtGF0YDQsNC90LXQvdC40Lgg0L3Rg9C20L3QviDQvtCx0L3QvtCy0LvRj9GC0Ywg0LTQvtC60YPQvNC10L3RglxuICAgICAgLy8g0J/QvtC/0YDQvtCx0YPQtdC8INGB0L3QsNGH0LDQu9CwINC90LDQudGC0Lgg0LTQvtC60YPQvNC10L3RgiDQv9C+IGlkINC4INC+0LHQvdC+0LLQuNGC0Ywg0LXQs9C+XG4gICAgICBkb2MgPSBzdG9yYWdlWyByZXNvdXJjZS5jb2xsZWN0aW9uTmFtZSBdLmZpbmRCeUlkKCBkb2N1bWVudElkU3RyaW5nICk7XG5cbiAgICAgIGlmICggZG9jICl7XG4gICAgICAgIC8vINCe0LHQvdC+0LLQu9GP0LXQvCDQtNC+0LrRg9C80LXQvdGCXG4gICAgICAgIGRvYy5zZXQoIHJlc3BvbnNlICk7XG5cbiAgICAgICAgLy8g0KHQvtC30LTQsNGR0Lwg0YHRgdGL0LvQutGDINC/0L4g0L3QvtCy0L7QvNGDIGlkINCyINC60L7Qu9C70LXQutGG0LjQuFxuICAgICAgICBzdG9yYWdlWyByZXNvdXJjZS5jb2xsZWN0aW9uTmFtZSBdLnVwZGF0ZUlkTGluayggZG9jICk7XG5cbiAgICAgICAgLy8g0K3RgtC+0YIg0LTQvtC60YPQvNC10L3RgiDRgtC10L/QtdGA0Ywg0YHQvtGF0YDQsNC90ZHQvSDQvdCwINGB0LXRgNCy0LXRgNC1LCDQt9C90LDRh9C40YIg0L7QvSDRg9C20LUg0L3QtSDQvdC+0LLRi9C5LlxuICAgICAgICBkb2MuaXNOZXcgPSBmYWxzZTtcblxuICAgICAgICByZXNwb25zZSA9IGRvYztcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzcG9uc2UgPSBzdG9yYWdlWyByZXNvdXJjZS5jb2xsZWN0aW9uTmFtZSBdLmFkZCggcmVzcG9uc2UsIHVuZGVmaW5lZCwgdHJ1ZSApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGRvbmUgJiYgZG9uZSggcmVzcG9uc2UsIHRleHRTdGF0dXMsIGpxWEhSICk7XG4gICAgZGZkLnJlc29sdmUoIHJlc3BvbnNlLCB0ZXh0U3RhdHVzLCBqcVhIUiApO1xuXG4gIH0pLmZhaWwoZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApe1xuICAgIGRmZC5yZWplY3QoIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApO1xuICB9KTtcblxuICAvLyBpZGVudGl0eSDRgdC+0YXRgNCw0L3Rj9C10YLRgdGPINC00LvRjyBjb25zdHJ1Y3RVcmwsINC10LPQviDQvdGD0LbQvdC+INC+0YfQuNGB0YLQuNGC0Ywg0LTQu9GPINC/0L7RgdC70LXQtNGD0Y7RidC40YUg0LfQsNC/0YDQvtGB0L7Qsi5cbiAgdXRpbHMuY2xlYXJJZGVudGl0eSggcmVzb3VyY2UgKTtcblxuICByZXR1cm4gZGZkO1xufVxuXG4vLyBQYXJ0aWFsIEFwcGxpY2F0aW9uXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUG9zdExpa2VSZXF1ZXN0KCBtZXRob2QgKXtcbiAgcmV0dXJuIGZ1bmN0aW9uKCl7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCggYXJndW1lbnRzICk7XG5cbiAgICByZXR1cm4gcG9zdExpa2VSZXF1ZXN0LmFwcGx5KCB0aGlzLCBbIG1ldGhvZCBdLmNvbmNhdCggYXJncyApICk7XG4gIH07XG59XG4iLCJpbXBvcnQgeyB1dGlscyB9IGZyb20gJy4vdXRpbHMuanMnO1xuXG5leHBvcnQgZnVuY3Rpb24gZGVsZXRlUmVxdWVzdCggZGF0YSwgYWpheFNldHRpbmdzLCBkb25lICl7XG4gIHZhciByZXNvdXJjZSA9IHRoaXM7XG4gIHZhciBtZXRob2QgPSAnREVMRVRFJztcblxuICAvLyDQldGB0LvQuCBkYXRhIC0g0LXRgdGC0Ywg0YTRg9C90LrRhtC40Y8sINGC0L4g0Y3RgtC+IGRvbmVcbiAgaWYgKCB1dGlscy5pc0Z1bmN0aW9uKCBkYXRhICkgKXtcbiAgICBkb25lID0gZGF0YTtcbiAgICBkYXRhID0gdW5kZWZpbmVkO1xuICB9XG4gIGlmICggdXRpbHMuaXNGdW5jdGlvbiggYWpheFNldHRpbmdzICkgKXtcbiAgICBkb25lID0gYWpheFNldHRpbmdzO1xuICAgIGFqYXhTZXR0aW5ncyA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGFqYXhTZXR0aW5ncyA9IGFqYXhTZXR0aW5ncyB8fCB7fTtcbiAgYWpheFNldHRpbmdzLmRhdGEgPSBkYXRhO1xuXG4gIHZhciBkZmQgPSAkLkRlZmVycmVkKCk7XG4gIHRoaXMuX3Jlc291cmNlUmVxdWVzdCggbWV0aG9kLCBhamF4U2V0dGluZ3MgKS5kb25lKGZ1bmN0aW9uKCByZXNwb25zZSwgdGV4dFN0YXR1cywganFYSFIgKXtcbiAgICBkb25lICYmIGRvbmUoIHJlc3BvbnNlLCB0ZXh0U3RhdHVzLCBqcVhIUiApO1xuICAgIGRmZC5yZXNvbHZlKCByZXNwb25zZSwgdGV4dFN0YXR1cywganFYSFIgKTtcblxuICB9KS5mYWlsKGZ1bmN0aW9uKCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKXtcbiAgICBkZmQucmVqZWN0KCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKTtcbiAgfSk7XG5cbiAgLy8gaWRlbnRpdHkg0YHQvtGF0YDQsNC90Y/QtdGC0YHRjyDQtNC70Y8gY29uc3RydWN0VXJsLCDQtdCz0L4g0L3Rg9C20L3QviDQvtGH0LjRgdGC0LjRgtGMINC00LvRjyDQv9C+0YHQu9C10LTRg9GO0YnQuNGFINC30LDQv9GA0L7RgdC+0LIuXG4gIHV0aWxzLmNsZWFySWRlbnRpdHkoIHJlc291cmNlICk7XG5cbiAgcmV0dXJuIGRmZDtcbn1cbiIsImltcG9ydCB7IHV0aWxzIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBDYWNoZSgpe1xuICB0aGlzLmRhdGEgPSB7fTtcbn1cblxuQ2FjaGUucHJvdG90eXBlLmdldEtleSA9IGZ1bmN0aW9uKCBhamF4U2V0dGluZ3MgKXtcbiAgdmFyIGtleSA9ICcnO1xuICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gIE9iamVjdC5rZXlzKCBhamF4U2V0dGluZ3MgKS5mb3JFYWNoKGZ1bmN0aW9uKCBrICl7XG4gICAgdmFyIHZhbHVlID0gYWpheFNldHRpbmdzWyBrIF07XG5cbiAgICBrZXkgKz0gayArICc9JyArICh1dGlscy5pc09iamVjdCggdmFsdWUgKSA/ICd7JyArIF90aGlzLmdldEtleSggdmFsdWUgKSArICd9JyA6IHZhbHVlKSArICd8JztcbiAgfSk7XG5cbiAgcmV0dXJuIGtleTtcbn07XG5cbkNhY2hlLnByb3RvdHlwZS5wdXQgPSBmdW5jdGlvbigga2V5LCBkYXRhICl7XG4gIHRoaXMuZGF0YVsga2V5IF0gPSB7XG4gICAgY3JlYXRlZDogbmV3IERhdGUoKSxcbiAgICBkYXRhOiBkYXRhXG4gIH07XG59O1xuXG5DYWNoZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24oIGtleSApe1xuICB2YXIgcmVzdWx0O1xuICByZXN1bHQgPSB0aGlzLmRhdGFbIGtleSBdO1xuICBpZiAoICFyZXN1bHQgKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gY2FjaGVkIGZsYWdcbiAgcmVzdWx0LmRhdGEucmVzcG9uc2UuX19jYWNoZWQgPSB0cnVlO1xuXG4gIC8vaWYgKCB0aGlzLnZhbGlkKHJlc3VsdC5jcmVhdGVkKSApe1xuICAgIHJldHVybiByZXN1bHQuZGF0YTtcbiAgLy99XG59O1xuXG5DYWNoZS5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiggICl7XG4gIHRoaXMuZGF0YSA9IHt9O1xufTtcbiIsIi8vIEFQSSBDbGllbnRcbi8vIC0tLS0tLS0tLS0tLS0tLVxuXG4vLyBFeGFtcGxlXG4vKlxuIHZhciBnaXRodWIgPSBBcGlDbGllbnQoJ2h0dHBzOi8vYXBpLmdpdGh1Yi5jb20nLCB7XG4gICBob29rczoge1xuICAgICBoZWFkZXJzOiB7XG4gICAgICAgQWNjZXB0OiAnYXBwbGljYXRpb24vdm5kLmdpdGh1Yi52Mytqc29uJyxcbiAgICAgICBBdXRob3JpemF0aW9uOiAndG9rZW4gOGZiZmM1NDBmMWVkMTQxNzA4M2M3MGE5OTBiNGRiM2M5YWE4NmVmZSdcbiAgICAgfVxuICAgfVxuIH0pO1xuXG4gZ2l0aHViLmFkZCgnc2VhcmNoJywge1xuICBzZWFyY2hNZXRob2Q6IGZ1bmN0aW9uKCl7XG4gICAgY29uc29sZS5sb2coICdzZWFyY2g6OnNlYXJjaE1ldGhvZCcgKTtcbiAgfVxuIH0pO1xuIGdpdGh1Yi5zZWFyY2guYWRkKCd1c2VycycsIHtcbiAgdXNlcnNNZXRob2Q6IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5wYXJlbnQuc2VhcmNoTWV0aG9kKCk7XG4gIH1cbiB9KTtcblxuIC8vINCU0L7QsdCw0LLQu9GP0LXQvCDRgNC10YHRg9GA0YHRi1xuIGdpdGh1Yi5hZGQoJ3VzZXInKTtcbiBnaXRodWIuYWRkKCd1c2VycycpO1xuIGdpdGh1Yi51c2Vycy5hZGQoJ3JlcG9zJyk7XG5cbiAvLyDQn9GA0L7Rh9C40YLQsNGC0Ywg0YDQtdC/0L7Qt9C40YLQvtGA0LjQuCAo0L7RgtC/0YDQsNCy0LjRgtGMINCz0LXRgiDQt9Cw0L/RgNC+0YEg0L3QsCBodHRwczovL2FwaS5naXRodWIuY29tL3VzZXJzL3JlcG9zLylcbiBnaXRodWIudXNlcnMucmVwb3MucmVhZCgpO1xuXG4gLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gLy8g0J3QtSDRgdC+0LLRgdC10LwgUkVTVCwg0LLRgdC1INC30LDQv9GA0L7RgdGLINC40LTRg9GCINC90LAg0L7QtNC40L0g0LDQtNGA0LXRgVxuIHZhciBzaW1wbGVBcGkgPSBBcGlDbGllbnQoJ2FwaS5leGFtcGxlLmNvbScsIHt9KTtcblxuIHNpbXBsZUFwaSgpLnJlYWQoe1xuICBlOiAnL0Jhc2UvRGVwYXJ0bWVudCdcbiB9KTtcblxuIHNpbXBsZUFwaS5wb3N0KHsgZGF0YSB9KTtcbiBzaW1wbGVBcGkoJ2lkZW50aXR5JykucG9zdCh7IGRhdGEgfSwgeyBhamF4U2V0dGluZ3MgfSk7XG4gc2ltcGxlQXBpKCdpZGVudGl0eScpLnBvc3QoIG51bGwsIHsgYWpheFNldHRpbmdzIH0pO1xuIHNpbXBsZUFwaS5wb3N0KHsgZGF0YSB9LCB7IGFqYXhTZXR0aW5ncyB9KTtcbiBzaW1wbGVBcGkucG9zdCggbnVsbCwgeyBhamF4U2V0dGluZ3MgfSk7XG5cbiBzaW1wbGVBcGkucmVhZCggZG9uZSApLmRvbmUoIGRvbmUgKS5mYWlsKCBmYWlsICk7XG5cbiDQoNCw0LHQvtGC0LAg0YEg0LTQvtC60YPQvNC10L3RgtCw0LzQuCAoc3RvcmFnZSksINC+0L0g0YHQsNC8INC/0YDQtdC+0LHRgNCw0LfRg9C10YLRgdGPINGH0LXRgNC10Lcg0LzQtdGC0L7QtCAkX19kZWx0YSgpXG4gc2ltcGxlQXBpLnBvc3QoIERvY3VtZW50ICk7XG4gc2ltcGxlQXBpLnNhdmUoIERvY3VtZW50ICk7XG5cblxuIC8vINCk0LjRh9C4XG4gYWpheFNldHRpbmdzINC00LvRjyDQutCw0LbQtNC+0LPQviDQt9Cw0L/RgNC+0YHQsFxuIElkZW50aXR5INC00LvRjyDQutCw0LbQtNC+0LPQviDQt9Cw0L/RgNC+0YHQsFxuXG4gKi9cblxuaW1wb3J0IHsgdXRpbHMgfSBmcm9tICcuL3V0aWxzLmpzJztcbmltcG9ydCB7IGdldFJlcXVlc3QgfSBmcm9tICcuL2dldC5qcyc7XG5pbXBvcnQgeyBjcmVhdGVQb3N0TGlrZVJlcXVlc3QgfSBmcm9tICcuL3Bvc3QuanMnO1xuaW1wb3J0IHsgZGVsZXRlUmVxdWVzdCB9IGZyb20gJy4vZGVsZXRlLmpzJztcbmltcG9ydCB7IENhY2hlIH0gZnJvbSAnLi9jYWNoZS5qcyc7XG5cbnZhciByZXNvdXJjZU1peGluID0ge1xuICByZXNvdXJjZU5hbWU6ICdyZXNvdXJjZScsXG4gIHVybDogJycsIC8vID0gcmVzb3VyY2VOYW1lXG5cbiAgLyoqXG4gICAqINCU0L7QsdCw0LLQuNGC0Ywg0L3QvtCy0YvQuSDRgNC10YHRg9GA0YFcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHJlc291cmNlTmFtZVxuICAgKiBAcGFyYW0ge29iamVjdH0gW3BhcmVudFJlc291cmNlXSAtINGA0L7QtNC40YLQtdC70YzRgdC60LjQuSDRgNC10YHRg9GA0YFcbiAgICogQHBhcmFtIHtvYmplY3R9IFt1c2Vyc01peGluXSAtINC/0L7Qu9GM0LfQvtCy0LDRgtC10LvRjNGB0LrQsNGPINC/0YDQuNC80LXRgdGMXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgYWRkOiBmdW5jdGlvbiggcmVzb3VyY2VOYW1lLCBwYXJlbnRSZXNvdXJjZSwgdXNlcnNNaXhpbiApe1xuICAgIGlmICggIXVzZXJzTWl4aW4gKSB7XG4gICAgICB1c2Vyc01peGluID0gcGFyZW50UmVzb3VyY2UgfHwge307XG4gICAgICBwYXJlbnRSZXNvdXJjZSA9IHRoaXM7XG4gICAgfVxuXG4gICAgLy8g0JHRgNC+0YHQuNGC0Ywg0LjRgdC60LvRjtGH0LXQvdC40LUsINC10YHQu9C4INGC0LDQutC+0Lkg0YDQtdGB0YPRgNGBINGD0LbQtSDQtdGB0YLRjFxuICAgIGlmICggdGhpc1sgcmVzb3VyY2VOYW1lIF0gKXtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSByZXNvdXJjZSBuYW1lZCAnICsgcmVzb3VyY2VOYW1lICsgJ2FscmVhZHkgZXhpc3RzLicpO1xuICAgIH1cblxuICAgIC8vINCb0Y7QsdC+0Lkg0LjQtyDRjdGC0LjRhSDQv9Cw0YDQsNC80LXRgtGA0L7QsiDRg9C60LDQt9GL0LLQsNC10YIg0L3QsCDQvdC10L7QsdGF0L7QtNC40LzQvtGB0YLRjCDQuNGB0L/QvtC70YzQt9C+0LLQsNGC0Ywg0YXRgNCw0L3QuNC70LjRidC1XG4gICAgaWYgKCB1c2Vyc01peGluLnNjaGVtYU5hbWUgfHwgdXNlcnNNaXhpbi5jb2xsZWN0aW9uTmFtZSB8fCB1c2Vyc01peGluLnN0b3JhZ2UgKSB7XG4gICAgICAvLyDQntC/0YDQtdC00LXQu9C40Lwg0L3QsNC30LLQsNC90LjQtSDRgdC+0LfQtNCw0LLQsNC10LzQvtC5INC60L7Qu9C70LXQutGG0LjQuFxuICAgICAgdXNlcnNNaXhpbi5jb2xsZWN0aW9uTmFtZSA9IHVzZXJzTWl4aW4uY29sbGVjdGlvbk5hbWUgfHwgcmVzb3VyY2VOYW1lO1xuICAgIH1cblxuICAgIC8vINCf0LXRgNC10LQg0YHQvtC30LTQsNC90LjQtdC8INC60L7Qu9C70LXQutGG0LjQuCDQvdGD0LbQvdC+INGB0L7Qt9C00LDRgtGMINGA0LXRgdGD0YDRgSwg0YfRgtC+0LHRiyDRgyDQutC+0LvQu9C10LrRhtC40Lgg0LHRi9C70LAg0YHRgdGL0LvQutCwINC90LAg0L3QtdCz0L5cbiAgICB0aGlzWyByZXNvdXJjZU5hbWUgXSA9IG5ldyBSZXNvdXJjZSggcmVzb3VyY2VOYW1lLCBwYXJlbnRSZXNvdXJjZSwgdXNlcnNNaXhpbiApO1xuXG4gICAgLy8g0KHQvtC30LTQsNGC0Ywg0LrQvtC70LvQtdC60YbQuNGOLCDQtdGB0LvQuCDRjdGC0L7Qs9C+INC10YnQtSDQvdC1INGB0LTQtdC70LDQu9C4XG4gICAgaWYgKCB1c2Vyc01peGluLmNvbGxlY3Rpb25OYW1lICYmICFzdG9yYWdlWyB1c2Vyc01peGluLmNvbGxlY3Rpb25OYW1lIF0gKXtcbiAgICAgIC8vINCY0YnQtdC8INGB0YXQtdC80YMsINC10YHQu9C4INC+0L3QsCDRg9C60LDQt9Cw0L3QsFxuICAgICAgdmFyIHNjaGVtYSA9IHN0b3JhZ2Uuc2NoZW1hc1sgdXNlcnNNaXhpbi5zY2hlbWFOYW1lIF07XG5cbiAgICAgIGlmICggc2NoZW1hICl7XG4gICAgICAgIHN0b3JhZ2UuY3JlYXRlQ29sbGVjdGlvbiggdXNlcnNNaXhpbi5jb2xsZWN0aW9uTmFtZSwgc2NoZW1hLCB0aGlzWyByZXNvdXJjZU5hbWUgXSApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignUmVzb3VyY2U6OicgKyByZXNvdXJjZU5hbWUgKyAnIFlvdSBjYW5ub3QgdXNlIHN0b3JhZ2UgKGNyZWF0ZSBjb2xsZWN0aW9uKSwgd2l0aG91dCBzcGVjaWZ5aW5nIHRoZSBzY2hlbWEgb2YgdGhlIGRhdGEuJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXNbIHJlc291cmNlTmFtZSBdO1xuICB9LFxuXG4gIF9yZXNvdXJjZVJlcXVlc3Q6IGZ1bmN0aW9uKCBtZXRob2QsIGFqYXhTZXR0aW5ncywgZG9uZSApe1xuICAgIHZhciB1cmwgPSB1dGlscy5jb25zdHJ1Y3RVcmwoIHRoaXMgKTtcbiAgICB2YXIgdXNlTm90aWZpY2F0aW9ucyA9IHRoaXMubm90aWZpY2F0aW9ucztcblxuICAgIHJldHVybiB0aGlzLmFwaVJvb3QuX3JlcXVlc3QoIG1ldGhvZCwgdXJsLCBhamF4U2V0dGluZ3MuZGF0YSwgYWpheFNldHRpbmdzLCB1c2VOb3RpZmljYXRpb25zLCBkb25lICk7XG4gIH1cbn07XG5cbi8vIEdFVFxucmVzb3VyY2VNaXhpbi5nZXQgPSBnZXRSZXF1ZXN0O1xucmVzb3VyY2VNaXhpbi5yZWFkID0gZ2V0UmVxdWVzdDtcblxuLy8gUE9TVFxucmVzb3VyY2VNaXhpbi5wb3N0ID0gY3JlYXRlUG9zdExpa2VSZXF1ZXN0KCdQT1NUJyk7XG5yZXNvdXJjZU1peGluLmNyZWF0ZSA9IHJlc291cmNlTWl4aW4ucG9zdDtcblxuLy8gUFVUXG5yZXNvdXJjZU1peGluLnB1dCA9IGNyZWF0ZVBvc3RMaWtlUmVxdWVzdCgnUFVUJyk7XG5yZXNvdXJjZU1peGluLnVwZGF0ZSA9IHJlc291cmNlTWl4aW4ucHV0O1xucmVzb3VyY2VNaXhpbi5zYXZlID0gcmVzb3VyY2VNaXhpbi5wdXQ7XG5cbi8vIFBBVENIXG5yZXNvdXJjZU1peGluLnBhdGNoID0gY3JlYXRlUG9zdExpa2VSZXF1ZXN0KCdQQVRDSCcpO1xuXG4vLyBERUxFVEVcbnJlc291cmNlTWl4aW4uZGVsZXRlID0gZGVsZXRlUmVxdWVzdDtcblxuLyoqXG4gKiDQmtC+0L3RgdGC0YDRg9C60YLQvtGAINGA0LXRgdGD0YDRgdCwLCDQvdC+INCy0L7Qt9Cy0YDQsNGJ0LDQtdGCINGE0YPQvdC60YbQuNGOINGB0L4g0YHQstC+0LnRgdGC0LLQsNC80LhcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gcmVzb3VyY2VOYW1lXG4gKiBAcGFyYW0ge29iamVjdH0gcGFyZW50UmVzb3VyY2VcbiAqIEBwYXJhbSB7b2JqZWN0fSB1c2Vyc01peGluXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IHJlc291cmNlXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gUmVzb3VyY2UoIHJlc291cmNlTmFtZSwgcGFyZW50UmVzb3VyY2UsIHVzZXJzTWl4aW4gKXtcblxuICAvKipcbiAgICog0K3RgtGDINGE0YPQvdC60YbQuNGOINC80Ysg0L7RgtC00LDRkdC8INC/0L7Qu9GM0LfQvtCy0LDRgtC10LvRjiDQsiDQutCw0YfQtdGB0YLQstC1INC00L7RgdGC0YPQv9CwINC6INGA0LXRgdGD0YDRgdGDLlxuICAgKiDQntC90LAg0L/QvtC30LLQvtC70Y/QtdGCINC30LDQtNCw0YLRjCBpZGVudGl0eSDQtNC70Y8g0LfQsNC/0YDQvtGB0LAuXG4gICAqXG4gICAqIEBwYXJhbSBbaWRlbnRpdHldXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn1cbiAgICovXG4gIHZhciByZXNvdXJjZSA9IGZ1bmN0aW9uIHJlc291cmNlKCBpZGVudGl0eSApe1xuICAgIGlmICggaWRlbnRpdHkgPT0gbnVsbCApe1xuICAgICAgcmV0dXJuIHJlc291cmNlO1xuICAgIH1cblxuICAgIGlmICggaWRlbnRpdHkgJiYgIXV0aWxzLmlzU3RyaW5nKCBpZGVudGl0eSApICl7XG4gICAgICBjb25zb2xlLmVycm9yKCdpZGVudGl0eSDQtNC+0LvQttC10L0g0LHRi9GC0Ywg0YHRgtGA0L7QutC+0LksINCwINC90LUnLCBpZGVudGl0eSApO1xuICAgIH1cblxuICAgIHJlc291cmNlLmlkZW50aXR5ID0gaWRlbnRpdHkgfHwgJyc7XG5cbiAgICByZXR1cm4gcmVzb3VyY2U7XG4gIH07XG5cbiAgJC5leHRlbmQoIHJlc291cmNlLCByZXNvdXJjZU1peGluLCB7XG4gICAgcmVzb3VyY2VOYW1lOiByZXNvdXJjZU5hbWUsXG4gICAgdXJsOiByZXNvdXJjZU5hbWVcbiAgfSwgdXNlcnNNaXhpbiApO1xuXG4gIHJlc291cmNlLnBhcmVudFJlc291cmNlID0gcGFyZW50UmVzb3VyY2U7XG4gIHJlc291cmNlLmFwaVJvb3QgPSBwYXJlbnRSZXNvdXJjZS5hcGlSb290IHx8IHBhcmVudFJlc291cmNlO1xuXG4gIHJldHVybiByZXNvdXJjZTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgbmV3IGFwaSBjbGllbnRcbiAqXG4gKiBAZXhhbXBsZVxuICogdmFyIGFwaSA9IG5ldyBBcGlDbGllbnQoJy9hcGknLCB7XG4gKiAgIGhvb2tzOiB7XG4gKiAgICAgaGVhZGVyczoge1xuICogICAgICAgdG9rZW46ICdYWFhYWFgnXG4gKiAgICAgfVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiB2YXIgYXBpID0gbmV3IEFwaUNsaWVudCgnaHR0cHM6Ly9kb21haW4uY29tL2FwaScsIHtcbiAqICAgaG9va3M6IHtcbiAqICAgICBoZWFkZXJzOiB7XG4gKiAgICAgICB0b2tlbjogJ1hYWFhYWCdcbiAqICAgICB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIHZhciBhcGkgPSBuZXcgQXBpQ2xpZW50KHtcbiAqICAgdXJsOiAnL2FwaSdcbiAqICAgaG9va3M6IHtcbiAqICAgICBoZWFkZXJzOiB7XG4gKiAgICAgICB0b2tlbjogJ1hYWFhYWCdcbiAqICAgICB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIEBwYXJhbSB1cmwgYXBpIHJvb3QgdXJsXG4gKiBAcGFyYW0gb3B0aW9ucyBhcGkgY2xpZW50IG9wdGlvbnNcbiAqL1xuZnVuY3Rpb24gQXBpQ2xpZW50KCB1cmwsIG9wdGlvbnMgKXtcbiAgaWYgKCAhKHRoaXMgaW5zdGFuY2VvZiBBcGlDbGllbnQpICkge1xuICAgIHJldHVybiBuZXcgQXBpQ2xpZW50KCB1cmwsIG9wdGlvbnMgKTtcbiAgfVxuXG4gIHRoaXMuZGVmYXVsdHMgPSB7XG4gICAgLy8gU3RyaXAgc2xhc2hlcyBieSBkZWZhdWx0XG4gICAgc3RyaXBUcmFpbGluZ1NsYXNoZXM6IHRydWUsXG4gICAgLy8gVXNlIGNhY2hlIGZvciBHRVQgcmVxdWVzdHNcbiAgICBjYWNoZTogdHJ1ZVxuICB9O1xuXG4gIC8vIElmIGZpcnN0IGFyZyBpcyBvYmplY3RcbiAgaWYgKCB1dGlscy5pc09iamVjdCggdXJsICkgKXtcbiAgICBvcHRpb25zID0gdXJsO1xuICAgIHVybCA9IGxvY2F0aW9uLm9yaWdpbjtcbiAgfVxuXG4gIGlmICggdXJsID09IG51bGwgKXtcbiAgICB1cmwgPSBsb2NhdGlvbi5vcmlnaW47XG4gIH1cblxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgb3B0aW9ucy51cmwgPSB1cmw7XG5cbiAgLy8gRGVmYXVsdHMsIG5vdGlmaWNhdGlvbnMgaXMgb2ZmXG4gIHRoaXMubm90aWZpY2F0aW9ucyA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBob29rcyBmb3IgYWpheCBzZXR0aW5ncyAoYXMgYmFzZSBhamF4U2V0dGluZ3MpXG4gICAqIEBzZWUgaHR0cDovL2FwaS5qcXVlcnkuY29tL2pRdWVyeS5hamF4L1xuICAgKlxuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKi9cbiAgdGhpcy5ob29rcyA9IHtcbiAgICAvLyDQtNC+0L/QvtC70L3QuNGC0LXQu9GM0L3Ri9C1INC00LDQvdC90YvQtSDQt9Cw0L/RgNC+0YHQsFxuICAgIGRhdGE6IHt9LFxuICAgIC8vINCe0LHRitC10LrRgiDQtNC70Y8g0LTQvtCx0LDQstC70LXQvdC40Y8g0L/RgNC+0LjQt9Cy0L7Qu9GM0L3Ri9GFINC30LDQs9C+0LvQvtCy0LrQvtCyINC60L4g0LLRgdC10Lwg0LfQsNC/0YDQvtGB0LDQvFxuICAgIC8vINGD0LTQvtCx0L3QviDQtNC70Y8g0LDQstGC0L7RgNC40LfQsNGG0LjQuCDQv9C+INGC0L7QutC10L3QsNC8XG4gICAgaGVhZGVyczoge31cbiAgfTtcblxuICAvL3RvZG86IHRvIHV0aWxzIChkZWVwTWVyZ2UpINC00L7QsdCw0LLQuNGC0Ywg0LLQvtC30LzQvtC20L3QvtGB0YLRjCDRgNCw0YHRiNC40YDRj9GC0Ywg0L7QsdGK0LXQutGCLCDQsCDQvdC1INCy0L7Qt9Cy0YDQsNGJ0LDRgtGMINC90L7QstGL0LlcbiAgJC5leHRlbmQoIHRydWUsIHRoaXMsIG9wdGlvbnMgKTtcblxuICAvLyBJbml0IGNhY2hlXG4gIGlmICggdGhpcy5kZWZhdWx0cy5jYWNoZSApe1xuICAgIHRoaXMuY2FjaGUgPSBuZXcgQ2FjaGUoKTtcbiAgfVxufVxuXG5BcGlDbGllbnQucHJvdG90eXBlID0ge1xuICAvKipcbiAgICog0JTQvtCx0LDQstC40YLRjCDQvdC+0LLRi9C5INGA0LXRgdGD0YDRgVxuICAgKiBAc2VlIHJlc291cmNlTWl4aW4uYWRkXG4gICAqL1xuICBhZGQ6IHJlc291cmNlTWl4aW4uYWRkLFxuXG4gIF9tZXRob2RzOiB7XG4gICAgJ2NyZWF0ZSc6ICdQT1NUJyxcbiAgICAncmVhZCc6ICAgJ0dFVCcsXG4gICAgJ3VwZGF0ZSc6ICdQVVQnLFxuICAgICdkZWxldGUnOiAnREVMRVRFJyxcbiAgICAncGF0Y2gnOiAgJ1BBVENIJyxcblxuICAgICdwb3N0JzogICAnUE9TVCcsXG4gICAgJ2dldCc6ICAgICdHRVQnLFxuICAgICdzYXZlJzogICAnUFVUJ1xuICB9LFxuXG4gIF9wcmVwYXJlQWpheFNldHRpbmdzOiBmdW5jdGlvbiggbWV0aG9kLCB1cmwsIGRhdGEsIGFqYXhTZXR0aW5ncyApe1xuICAgIHZhciBfYWpheFNldHRpbmdzID0gdXRpbHMuZGVlcE1lcmdlKCB0aGlzLmhvb2tzLCBhamF4U2V0dGluZ3MgKTtcblxuICAgIF9hamF4U2V0dGluZ3MudHlwZSA9IG1ldGhvZDtcblxuICAgIC8vIHN0cmlwIHRyYWlsaW5nIHNsYXNoZXMgYW5kIHNldCB0aGUgdXJsICh1bmxlc3MgdGhpcyBiZWhhdmlvciBpcyBzcGVjaWZpY2FsbHkgZGlzYWJsZWQpXG4gICAgaWYgKCB0aGlzLmRlZmF1bHRzLnN0cmlwVHJhaWxpbmdTbGFzaGVzICl7XG4gICAgICB1cmwgPSB1cmwucmVwbGFjZSgvXFwvKyQvLCAnJykgfHwgJy8nO1xuICAgIH1cblxuICAgIF9hamF4U2V0dGluZ3MudXJsID0gdXJsO1xuXG4gICAgLy8g0JTQvtCx0LDQstC70Y/QtdC8INCw0LLRgtC+0YDQuNC30LDRhtC40Y4g0L/QviDRgtC+0LrQtdC90YNcbiAgICBpZiAoIHRoaXMudG9rZW4gJiYgYWpheFNldHRpbmdzLmhlYWRlcnMgJiYgYWpheFNldHRpbmdzLmhlYWRlcnMudG9rZW4gPT0gbnVsbCApe1xuICAgICAgX2FqYXhTZXR0aW5ncy5oZWFkZXJzLkF1dGhvcml6YXRpb24gPSAndG9rZW4gJyArIHRoaXMudG9rZW47XG4gICAgfVxuXG4gICAgaWYgKCBtZXRob2QgPT09ICdHRVQnICl7XG4gICAgICBfYWpheFNldHRpbmdzLmRhdGEgPSB1dGlscy5kZWVwTWVyZ2UoIF9hamF4U2V0dGluZ3MuZGF0YSwgZGF0YSApO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyDQldGB0LvQuCDRgdC+0YXRgNCw0L3Rj9C10Lwg0LTQvtC60YPQvNC10L3Rgiwg0L3Rg9C20L3QviDRgdC00LXQu9Cw0YLRjCB0b09iamVjdCh7ZGVwb3B1bGF0ZTogMX0pXG4gICAgICBpZiAoIGRhdGEgJiYgZGF0YS5jb25zdHJ1Y3RvciAmJiBkYXRhLmNvbnN0cnVjdG9yLm5hbWUgJiYgZGF0YS5jb25zdHJ1Y3Rvci5uYW1lID09PSAnRG9jdW1lbnQnICl7XG4gICAgICAgIF9hamF4U2V0dGluZ3MuZGF0YSA9IHV0aWxzLmRlZXBNZXJnZSggX2FqYXhTZXR0aW5ncy5kYXRhLCBkYXRhLnRvT2JqZWN0KHtkZXBvcHVsYXRlOiAxfSkgKTtcblxuICAgICAgfSBlbHNlIGlmICggZGF0YSApIHtcbiAgICAgICAgX2FqYXhTZXR0aW5ncy5kYXRhID0gdXRpbHMuZGVlcE1lcmdlKCBfYWpheFNldHRpbmdzLmRhdGEsIGRhdGEgKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCBfYWpheFNldHRpbmdzLmRhdGEgJiYgX2FqYXhTZXR0aW5ncy5jb250ZW50VHlwZSA9PT0gJ2FwcGxpY2F0aW9uL2pzb24nICl7XG4gICAgICAgIF9hamF4U2V0dGluZ3MuZGF0YSA9IEpTT04uc3RyaW5naWZ5KCBfYWpheFNldHRpbmdzLmRhdGEgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyB0b2RvINC/0YDQvtCy0LXRgNGC0Ywg0L3QsNC00L7QsdC90L7RgdGC0Ywg0LrQvtC00LBcbiAgICAvLyDQmNGB0L/QvtC70YzQt9GD0LXRgtGB0Y8g0LTQu9GPINCw0LvQuNCw0YHQvtCyLCDQsiDQutC+0YLQvtGA0YvRhSDQstGC0L7RgNC+0Lkg0L/QsNGA0LDQvNC10YLRgCAtINC10YHRgtGMINC+0LHRitC10LrRgiDQvdCw0YHRgtGA0L7QtdC6XG4gICAgaWYgKCB1dGlscy5pc09iamVjdCggdXJsICkgKXtcbiAgICAgIGNvbnNvbGUuaW5mbygn0JDRhUAq0YLRjCwg0L3Rg9C20L3Ri9C5INC60L7QtCEhISEnKTtcbiAgICAgIF9hamF4U2V0dGluZ3MgPSB1cmw7XG4gICAgICBkZWJ1Z2dlcjtcbiAgICB9XG5cbiAgICByZXR1cm4gX2FqYXhTZXR0aW5ncztcbiAgfSxcblxuICAvKipcbiAgICogU2VuZCByZXF1ZXN0IG9uIHNlcnZlclxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbWV0aG9kINCd0LDQt9Cy0LDQvdC40LUg0LzQtdGC0L7QtNCwIChQT1NULCBHRVQsIFBVVCwgREVMRVRFLCBQQVRDSClcbiAgICogQHBhcmFtIHtzdHJpbmd9IHVybCDQn9C+0LvQvdGL0Lkg0YPRgNC7INGA0LXRgdGD0YDRgdCwXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhINCe0LHRitC10LrRgiDRgSDQtNCw0L3QvdGL0LzQuCDQtNC70Y8g0LfQsNC/0YDQvtGB0LBcbiAgICogQHBhcmFtIHtvYmplY3R9IGFqYXhTZXR0aW5ncyDQntCx0YrQtdC60YIg0YEg0L3QsNGB0YLRgNC+0LnQutCw0LzQuFxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IHVzZU5vdGlmaWNhdGlvbnMg0KTQu9Cw0LMsINC40YHQv9C+0LvRjNC30L7QstCw0YLRjCDQu9C4INGD0LLQtdC00L7QvNC70LXQvdC40Y9cbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gZG9uZSDQpNGD0L3QutGG0LjRjyDRg9GB0L/QtdGI0L3QvtCz0L4g0L7QsdGA0LDRgtC90L7Qs9C+INCy0YvQt9C+0LLQsFxuICAgKiBAcmV0dXJucyB7JC5EZWZlcnJlZH0g0LLQvtC30LLRgNCw0YnQsNC10YIganF1ZXJ5IGFqYXgg0L7QsdGK0LXQutGCXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcmVxdWVzdDogZnVuY3Rpb24oIG1ldGhvZCwgdXJsLCBkYXRhLCBhamF4U2V0dGluZ3MsIHVzZU5vdGlmaWNhdGlvbnMsIGRvbmUgKXtcbiAgICBpZiAoICF1dGlscy5pc1N0cmluZyggbWV0aG9kICkgKXtcbiAgICAgIHRocm93IG5ldyBFcnJvcign0J/QsNGA0LDQvNC10YLRgCBgbWV0aG9kYCDQtNC+0LvQttC10L0g0LHRi9GC0Ywg0YHRgtGA0L7QutC+0LksINCwINC90LUgJywgbWV0aG9kICk7XG4gICAgfVxuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBub3RpZmljYXRpb25UeXBlID0gbWV0aG9kID09PSAnR0VUJyA/ICdsb2FkJyA6ICggbWV0aG9kID09PSAnUE9TVCcgfHwgbWV0aG9kID09PSAnUFVUJyB8fCBtZXRob2QgPT09ICdQQVRDSCcgKSA/ICdzYXZlJyA6ICdkZWxldGUnO1xuICAgIHZhciBfYWpheFNldHRpbmdzID0gdGhpcy5fcHJlcGFyZUFqYXhTZXR0aW5ncyggbWV0aG9kLCB1cmwsIGRhdGEsIGFqYXhTZXR0aW5ncyApO1xuXG4gICAgLy8g0JjRgdC/0L7Qu9GM0LfQvtCy0LDRgtGMINC30L3QsNGH0LXQvdC40LUg0L/QviDRg9C80L7Qu9GH0LDQvdC40Y4sINC10YHQu9C4IHVzZU5vdGlmaWNhdGlvbnMg0L3QtSDQt9Cw0LTQsNC9XG4gICAgLy8g0YLRg9GCINC20LUg0L/QvtGA0LLQtdGA0Y/QtdC8LCDQv9C+0LTQutC70Y7Rh9C10L3RiyDQu9C4INGD0LLQtdC00L7QvNC70LXQvdC40Y9cbiAgICBpZiAoIHV0aWxzLmlzQm9vbGVhbiggdXNlTm90aWZpY2F0aW9ucyApICl7XG4gICAgICB1c2VOb3RpZmljYXRpb25zID0gdXNlTm90aWZpY2F0aW9ucyAmJiBjZi5ub3RpZmljYXRpb247XG4gICAgfSBlbHNlIHtcbiAgICAgIHVzZU5vdGlmaWNhdGlvbnMgPSB0aGlzLm5vdGlmaWNhdGlvbnMgJiYgY2Yubm90aWZpY2F0aW9uO1xuICAgIH1cblxuICAgIGlmICggdXNlTm90aWZpY2F0aW9ucyApe1xuICAgICAgY2Yubm90aWZpY2F0aW9uWyBub3RpZmljYXRpb25UeXBlIF0uc2hvdygpO1xuICAgIH1cblxuICAgIGNvbnNvbGUubG9nKCBtZXRob2QgKyAnICcgKyBfYWpheFNldHRpbmdzLnVybCApO1xuXG4gICAgcmV0dXJuICQuYWpheCggX2FqYXhTZXR0aW5ncyApLmZhaWwoZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApe1xuICAgICAgY29uc29sZS53YXJuKCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKTtcblxuICAgICAgLy8gVW5hdXRob3JpemVkIENhbGxiYWNrXG4gICAgICBpZiAoIGpxWEhSLnN0YXR1cyA9PT0gNDAxICYmIHNlbGYudW5hdXRob3JpemVkQ2FsbGJhY2sgKXtcbiAgICAgICAgc2VsZi51bmF1dGhvcml6ZWRDYWxsYmFjaygganFYSFIsIG1ldGhvZCwgdXJsLCBkYXRhLCBhamF4U2V0dGluZ3MsIGRvbmUgKTtcblxuICAgICAgICAvLyDQndC1INC/0L7QutCw0LfRi9Cy0LDRgtGMINGB0L7QvtCx0YnQtdC90LjQtSDRgSDQvtGI0LjQsdC60L7QuSDQv9GA0LggNDAxLCDQtdGB0LvQuCDQstGB0ZEg0L/Qu9C+0YXQviwg0YLQviDRgNC+0YPRgtC10YAg0YHQsNC8INC/0LXRgNC10LrQuNC90LXRgiDQvdCwINGE0L7RgNC80YMg0LLRhdC+0LTQsFxuICAgICAgICBpZiAoIHVzZU5vdGlmaWNhdGlvbnMgKXtcbiAgICAgICAgICBjZi5ub3RpZmljYXRpb25bIG5vdGlmaWNhdGlvblR5cGUgXS5oaWRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICggdXNlTm90aWZpY2F0aW9ucyApe1xuICAgICAgICBjZi5ub3RpZmljYXRpb25bIG5vdGlmaWNhdGlvblR5cGUgXS5mYWlsKCk7XG4gICAgICB9XG5cbiAgICB9KS5kb25lKGZ1bmN0aW9uKCl7XG4gICAgICBpZiAoIHVzZU5vdGlmaWNhdGlvbnMgKXtcbiAgICAgICAgY2Yubm90aWZpY2F0aW9uWyBub3RpZmljYXRpb25UeXBlIF0uaGlkZSgpO1xuICAgICAgfVxuICAgIH0pLmRvbmUoIGRvbmUgKTtcbiAgfVxufTtcblxuLyoqXG4gKiBNZXRob2QgZm9yIGdldCByZXF1ZXN0IHRvIGFwaSByb290XG4gKlxuICogQHBhcmFtIGFqYXhTZXR0aW5nc1xuICogQHBhcmFtIGRvbmVcbiAqIEByZXR1cm5zIHskLkRlZmVycmVkfVxuICovXG5BcGlDbGllbnQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKCBhamF4U2V0dGluZ3MsIGRvbmUgKXtcbiAgY29uc29sZS5sb2coICdhcGk6OmdldCcgKTtcbiAgaWYgKCB1dGlscy5pc0Z1bmN0aW9uKCBhamF4U2V0dGluZ3MgKSApe1xuICAgIGRvbmUgPSBhamF4U2V0dGluZ3M7XG4gICAgYWpheFNldHRpbmdzID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgYWpheFNldHRpbmdzID0gYWpheFNldHRpbmdzIHx8IHt9O1xuXG4gIHJldHVybiB0aGlzLl9yZXF1ZXN0KCdHRVQnLCB0aGlzLnVybCwgdW5kZWZpbmVkLCBhamF4U2V0dGluZ3MsIGZhbHNlLCBkb25lICk7XG59O1xuLyoqXG4gKiBAYWxpYXMgQXBpQ2xpZW50LnByb3RvdHlwZS5nZXRcbiAqIEB0eXBlIHtGdW5jdGlvbn1cbiAqL1xuQXBpQ2xpZW50LnByb3RvdHlwZS5yZWFkID0gQXBpQ2xpZW50LnByb3RvdHlwZS5nZXQ7XG5cbkFwaUNsaWVudC52ZXJzaW9uID0gJzAuMy4wJztcblxuQXBpQ2xpZW50LnV0aWxzID0gdXRpbHM7XG5cbmV4cG9ydCB7IEFwaUNsaWVudCB9O1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztFQUFPLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQztBQUN4QixFQUlBLElBQUksT0FBTyxHQUFHLGtCQUFrQixDQUFDO0FBQ2pDLEVBTUEsSUFBSSxTQUFTLEdBQUcsaUJBQWlCLENBQUM7QUFDbEMsRUFHQSxJQUFJLFdBQVcsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDOztFQUVuQztFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsSUFBSSxXQUFXLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQzs7RUFFdkM7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxTQUFTLFlBQVksQ0FBQyxLQUFLLEVBQUU7RUFDN0IsRUFBRSxPQUFPLENBQUMsS0FBSyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsS0FBSyxLQUFLLENBQUM7RUFDdkQsQ0FBQzs7RUFFRDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsS0FBSyxDQUFDLFFBQVEsR0FBRyxTQUFTLFFBQVEsRUFBRSxLQUFLLEdBQUc7RUFDNUMsRUFBRSxPQUFPLE9BQU8sS0FBSyxLQUFLLFFBQVEsS0FBSyxZQUFZLENBQUMsS0FBSyxDQUFDLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxTQUFTLENBQUMsSUFBSSxLQUFLLENBQUM7RUFDOUcsQ0FBQyxDQUFDOztFQUVGO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxLQUFLLENBQUMsU0FBUyxHQUFHLFNBQVMsU0FBUyxDQUFDLEtBQUssRUFBRTtFQUM1QyxFQUFFLE9BQU8sQ0FBQyxLQUFLLEtBQUssSUFBSSxJQUFJLEtBQUssS0FBSyxLQUFLLElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssT0FBTyxLQUFLLEtBQUssQ0FBQztFQUNwSCxDQUFDLENBQUM7O0VBRUY7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLEtBQUssQ0FBQyxRQUFRLEdBQUcsU0FBUyxRQUFRLEVBQUUsS0FBSyxHQUFHO0VBQzVDO0VBQ0E7RUFDQSxFQUFFLElBQUksSUFBSSxHQUFHLE9BQU8sS0FBSyxDQUFDO0VBQzFCLEVBQUUsT0FBTyxDQUFDLEtBQUssSUFBSSxLQUFLLEtBQUssSUFBSSxJQUFJLElBQUksS0FBSyxRQUFRLEtBQUssS0FBSyxDQUFDO0VBQ2pFLENBQUMsQ0FBQzs7RUFFRjtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsS0FBSyxDQUFDLFVBQVUsR0FBRyxTQUFTLFVBQVUsQ0FBQyxLQUFLLEVBQUU7RUFDOUM7RUFDQTtFQUNBLEVBQUUsT0FBTyxPQUFPLEtBQUssS0FBSyxVQUFVLElBQUksS0FBSyxDQUFDO0VBQzlDLENBQUMsQ0FBQzs7RUFFRjtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsS0FBSyxDQUFDLFNBQVMsR0FBRyxTQUFTLFNBQVMsRUFBRSxNQUFNLEVBQUUs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
