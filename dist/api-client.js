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

_.forEach( Object.keys( methodsMap ), function( verb ){
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
  resourceMixin[ verb ] = function( data, ajaxSettings, done ){
    var resource = this,
      identity = this.identity,
      method = this.instance.methodsMap[ verb],
      documentIdString;

    // Если data - есть функция, то это done
    if ( $.isFunction( data ) ){
      done = data;
      data = undefined;
    }
    if ( $.isFunction( ajaxSettings ) ){
      done = ajaxSettings;
      ajaxSettings = undefined;
    }

    ajaxSettings = ajaxSettings || {};

    // При сохранении документа нужно сохранять только изменённые поля
    if ( method === 'POST' || method === 'PUT' ){
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
    }

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
    this._resourceRequest( verb, ajaxSettings ).done(function( response, textStatus, jqXHR ){
      var result, fields;

      // #example
      // api.places({ fields: 'name', skip: 100 });
      // Если была выборка по полям, нужно правильно обработать её и передать в документ
      if ( data && data.fields ){
        fields = utils.select( data.fields );
      }

      // Есть ответ надо сохранить в хранилище
      if ( resource.storage && !ajaxSettings.doNotStore ){
        // При сохранении и обновлении нужно обновлять документ
        if ( method === 'POST' || method === 'PUT' ){
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

        } else if ( method === 'GET' ){
          // Не добавлять в хранилище результат запросов с выборкой полей
          if ( fields ){
            result = response.result;
          } else {
            result = storage[ resource.collectionName ].add( response.result || response, fields, true );
          }
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
});

// Очистить identity у ресурса и его родительских ресурсов тоже
function clearIdentity( resource ){
  while ( resource.parentResource ) {
    resource.identity = '';
    resource = resource.parentResource;
  }
}

/**
 * Как бы конструктор ресурса, но возвращает функцию-объект с примесями
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
    if ( identity && !_.isString( identity ) ){
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
  if ( _.isObject( url ) ){
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
    var type = this.methodsMap[ method ]
      , _ajaxSettings = $.extend( true, {}, this.hooks, ajaxSettings, {
        type: type,
        url: url
      });

    // Добавляем авторизацию по токену
    if ( this.token && ajaxSettings.headers && ajaxSettings.headers.token == null ){
      _ajaxSettings.headers.Authorization = 'token ' + this.token;
    }

    if ( type === 'GET' ){
      _.assign( _ajaxSettings.data, data );
    } else {
      // Если сохраняем документ, нужно сделать toObject({depopulate: 1})
      if ( data && data.constructor && data.constructor.name && data.constructor.name === 'Document' ){
        _.assign( _ajaxSettings.data, data.toObject({depopulate: 1}) );

      } else if ( data ) {
        _.assign( _ajaxSettings.data, data );
      }

      if ( _ajaxSettings.data && _ajaxSettings.contentType === 'application/json' ){
        _ajaxSettings.data = JSON.stringify( _ajaxSettings.data );
      }
    }

    // todo проверть надобность кода
    // Используется для алиасов, в которых второй параметр - есть объект настроек
    if ( $.isPlainObject( url ) ){
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
    if ( !_.isString( method ) ){
      throw new Error('Параметр `method` должен быть строкой, а не ', method );
    }

    var self = this
      , type = this.methodsMap[ method ]
      , notificationType = type === 'GET' ? 'load' : ( type === 'POST' || type === 'PUT' || type === 'PATCH' ) ? 'save' : 'delete'
      , _ajaxSettings = this._prepareAjaxSettings( method, url, data, ajaxSettings );

    // Использовать значение по умолчанию, если useNotifications не задан
    // тут же порверяем, подключены ли уведомления
    if ( _.isBoolean( useNotifications ) ){
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
  if ( $.isFunction( ajaxSettings ) ){
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

ApiClient.version = '0.2.0';

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
utils.select = function( selection ){
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

  if (_.isPlainObject( selection ) && !Array.isArray( selection )) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9yZXN0LWFwaS1jbGllbnQvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3Jlc3QtYXBpLWNsaWVudC9zcmMvZmFrZV80ZjZlNDQ1Zi5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9yZXN0LWFwaS1jbGllbnQvc3JjL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3aEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIEFQSSBDbGllbnRcbi8vIC0tLS0tLS0tLS0tLS0tLVxuXG4vLyBFeGFtcGxlXG4vKlxuIHZhciBnaXRodWIgPSBBcGlDbGllbnQoJ2h0dHBzOi8vYXBpLmdpdGh1Yi5jb20nLCB7XG4gICBob29rczoge1xuICAgICBoZWFkZXJzOiB7XG4gICAgICAgQWNjZXB0OiAnYXBwbGljYXRpb24vdm5kLmdpdGh1Yi52Mytqc29uJyxcbiAgICAgICBBdXRob3JpemF0aW9uOiAndG9rZW4gOGZiZmM1NDBmMWVkMTQxNzA4M2M3MGE5OTBiNGRiM2M5YWE4NmVmZSdcbiAgICAgfVxuICAgfVxuIH0pO1xuXG4gZ2l0aHViLmFkZCgnc2VhcmNoJywge1xuICBzZWFyY2hNZXRob2Q6IGZ1bmN0aW9uKCl7XG4gICAgY29uc29sZS5sb2coICdzZWFyY2g6OnNlYXJjaE1ldGhvZCcgKTtcbiAgfVxuIH0pO1xuIGdpdGh1Yi5zZWFyY2guYWRkKCd1c2VycycsIHtcbiAgdXNlcnNNZXRob2Q6IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5wYXJlbnQuc2VhcmNoTWV0aG9kKCk7XG4gIH1cbiB9KTtcblxuIC8vINCU0L7QsdCw0LLQu9GP0LXQvCDRgNC10YHRg9GA0YHRi1xuIGdpdGh1Yi5hZGQoJ3VzZXInKTtcbiBnaXRodWIuYWRkKCd1c2VycycpO1xuIGdpdGh1Yi51c2Vycy5hZGQoJ3JlcG9zJyk7XG5cbiAvLyDQn9GA0L7Rh9C40YLQsNGC0Ywg0YDQtdC/0L7Qt9C40YLQvtGA0LjQuCAo0L7RgtC/0YDQsNCy0LjRgtGMINCz0LXRgiDQt9Cw0L/RgNC+0YEg0L3QsCBodHRwczovL2FwaS5naXRodWIuY29tL3VzZXJzL3JlcG9zLylcbiBnaXRodWIudXNlcnMucmVwb3MucmVhZCgpO1xuXG4gLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gLy8g0J3QtSDRgdC+0LLRgdC10LwgUkVTVCwg0LLRgdC1INC30LDQv9GA0L7RgdGLINC40LTRg9GCINC90LAg0L7QtNC40L0g0LDQtNGA0LXRgVxuIHZhciBzaW1wbGVBcGkgPSBBcGlDbGllbnQoJ2FwaS5leGFtcGxlLmNvbScsIHt9KTtcblxuIHNpbXBsZUFwaSgpLnJlYWQoe1xuICBlOiAnL0Jhc2UvRGVwYXJ0bWVudCdcbiB9KTtcblxuIHNpbXBsZUFwaS5wb3N0KHsgZGF0YSB9KTtcbiBzaW1wbGVBcGkoJ2lkZW50aXR5JykucG9zdCh7IGRhdGEgfSwgeyBhamF4U2V0dGluZ3MgfSk7XG4gc2ltcGxlQXBpKCdpZGVudGl0eScpLnBvc3QoIG51bGwsIHsgYWpheFNldHRpbmdzIH0pO1xuIHNpbXBsZUFwaS5wb3N0KHsgZGF0YSB9LCB7IGFqYXhTZXR0aW5ncyB9KTtcbiBzaW1wbGVBcGkucG9zdCggbnVsbCwgeyBhamF4U2V0dGluZ3MgfSk7XG5cbiBzaW1wbGVBcGkucmVhZCggZG9uZSApLmRvbmUoIGRvbmUgKS5mYWlsKCBmYWlsICk7XG5cbiDQoNCw0LHQvtGC0LAg0YEg0LTQvtC60YPQvNC10L3RgtCw0LzQuCAoc3RvcmFnZSksINC+0L0g0YHQsNC8INC/0YDQtdC+0LHRgNCw0LfRg9C10YLRgdGPINGH0LXRgNC10Lcg0LzQtdGC0L7QtCAkX19kZWx0YSgpXG4gc2ltcGxlQXBpLnBvc3QoIERvY3VtZW50ICk7XG4gc2ltcGxlQXBpLnNhdmUoIERvY3VtZW50ICk7XG5cblxuIC8vINCk0LjRh9C4XG4gYWpheFNldHRpbmdzINC00LvRjyDQutCw0LbQtNC+0LPQviDQt9Cw0L/RgNC+0YHQsFxuIElkZW50aXR5INC00LvRjyDQutCw0LbQtNC+0LPQviDQt9Cw0L/RgNC+0YHQsFxuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciByZXNvdXJjZU1peGluID0ge1xuICByZXNvdXJjZU5hbWU6ICdyZXNvdXJjZScsXG4gIHVybDogJycsIC8vID0gcmVzb3VyY2VOYW1lXG5cbiAgLyoqXG4gICAqINCU0L7QsdCw0LLQuNGC0Ywg0L3QvtCy0YvQuSDRgNC10YHRg9GA0YFcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHJlc291cmNlTmFtZVxuICAgKiBAcGFyYW0ge29iamVjdH0gW3BhcmVudFJlc291cmNlXSAtINGA0L7QtNC40YLQtdC70YzRgdC60LjQuSDRgNC10YHRg9GA0YFcbiAgICogQHBhcmFtIHtvYmplY3R9IFt1c2Vyc01peGluXSAtINC/0L7Qu9GM0LfQvtCy0LDRgtC10LvRjNGB0LrQsNGPINC/0YDQuNC80LXRgdGMXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgYWRkOiBmdW5jdGlvbiggcmVzb3VyY2VOYW1lLCBwYXJlbnRSZXNvdXJjZSwgdXNlcnNNaXhpbiApe1xuICAgIGlmICggIXVzZXJzTWl4aW4gKSB7XG4gICAgICB1c2Vyc01peGluID0gcGFyZW50UmVzb3VyY2UgfHwge307XG4gICAgICBwYXJlbnRSZXNvdXJjZSA9IHRoaXM7XG4gICAgfVxuXG4gICAgLy8g0JHRgNC+0YHQuNGC0Ywg0LjRgdC60LvRjtGH0LXQvdC40LUsINC10YHQu9C4INGC0LDQutC+0Lkg0YDQtdGB0YPRgNGBINGD0LbQtSDQtdGB0YLRjFxuICAgIGlmICggdGhpc1sgcmVzb3VyY2VOYW1lIF0gKXtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSByZXNvdXJjZSBuYW1lZCAnICsgcmVzb3VyY2VOYW1lICsgJ2FscmVhZHkgZXhpc3RzLicpO1xuICAgIH1cblxuICAgIC8vINCb0Y7QsdC+0Lkg0LjQtyDRjdGC0LjRhSDQv9Cw0YDQsNC80LXRgtGA0L7QsiDRg9C60LDQt9GL0LLQsNC10YIg0L3QsCDQvdC10L7QsdGF0L7QtNC40LzQvtGB0YLRjCDQuNGB0L/QvtC70YzQt9C+0LLQsNGC0Ywg0YXRgNCw0L3QuNC70LjRidC1XG4gICAgaWYgKCB1c2Vyc01peGluLnNjaGVtYU5hbWUgfHwgdXNlcnNNaXhpbi5jb2xsZWN0aW9uTmFtZSB8fCB1c2Vyc01peGluLnN0b3JhZ2UgKSB7XG4gICAgICAvLyDQntC/0YDQtdC00LXQu9C40Lwg0L3QsNC30LLQsNC90LjQtSDRgdC+0LfQtNCw0LLQsNC10LzQvtC5INC60L7Qu9C70LXQutGG0LjQuFxuICAgICAgdXNlcnNNaXhpbi5jb2xsZWN0aW9uTmFtZSA9IHVzZXJzTWl4aW4uY29sbGVjdGlvbk5hbWUgfHwgcmVzb3VyY2VOYW1lO1xuICAgIH1cblxuICAgIC8vINCf0LXRgNC10LQg0YHQvtC30LTQsNC90LjQtdC8INC60L7Qu9C70LXQutGG0LjQuCDQvdGD0LbQvdC+INGB0L7Qt9C00LDRgtGMINGA0LXRgdGD0YDRgSwg0YfRgtC+0LHRiyDRgyDQutC+0LvQu9C10LrRhtC40Lgg0LHRi9C70LAg0YHRgdGL0LvQutCwINC90LAg0L3QtdCz0L5cbiAgICB0aGlzWyByZXNvdXJjZU5hbWUgXSA9IG5ldyBSZXNvdXJjZSggcmVzb3VyY2VOYW1lLCBwYXJlbnRSZXNvdXJjZSwgdXNlcnNNaXhpbiApO1xuXG4gICAgLy8g0KHQvtC30LTQsNGC0Ywg0LrQvtC70LvQtdC60YbQuNGOLCDQtdGB0LvQuCDRjdGC0L7Qs9C+INC10YnQtSDQvdC1INGB0LTQtdC70LDQu9C4XG4gICAgaWYgKCB1c2Vyc01peGluLmNvbGxlY3Rpb25OYW1lICYmICFzdG9yYWdlWyB1c2Vyc01peGluLmNvbGxlY3Rpb25OYW1lIF0gKXtcbiAgICAgIC8vINCY0YnQtdC8INGB0YXQtdC80YMsINC10YHQu9C4INC+0L3QsCDRg9C60LDQt9Cw0L3QsFxuICAgICAgdmFyIHNjaGVtYSA9IHN0b3JhZ2Uuc2NoZW1hc1sgdXNlcnNNaXhpbi5zY2hlbWFOYW1lIF07XG5cbiAgICAgIGlmICggc2NoZW1hICl7XG4gICAgICAgIHN0b3JhZ2UuY3JlYXRlQ29sbGVjdGlvbiggdXNlcnNNaXhpbi5jb2xsZWN0aW9uTmFtZSwgc2NoZW1hLCB0aGlzWyByZXNvdXJjZU5hbWUgXSApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignUmVzb3VyY2U6OicgKyByZXNvdXJjZU5hbWUgKyAnIFlvdSBjYW5ub3QgdXNlIHN0b3JhZ2UgKGNyZWF0ZSBjb2xsZWN0aW9uKSwgd2l0aG91dCBzcGVjaWZ5aW5nIHRoZSBzY2hlbWEgb2YgdGhlIGRhdGEuJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXNbIHJlc291cmNlTmFtZSBdO1xuICB9LFxuXG4gIC8vINCf0YDQvtCx0LXQttCw0YLRjNGB0Y8g0L/QviDQstGB0LXQvCDRgNC+0LTQuNGC0LXQu9GM0YHQutC40Lwg0YDQtdGB0YPRgNGB0LDQvCDQuCDRgdC+0LHRgNCw0YLRjCB1cmwgKNCx0LXQtyBxdWVyeSBzdHJpbmcpXG4gIGNvbnN0cnVjdFVybDogZnVuY3Rpb24gY29uc3RydWN0VXJsKCByZWN1cnNpb25DYWxsICl7XG4gICAgLy8gdG9kbzog0L/RgNC+0LLQtdGA0LjRgtGMINC90LDQtNC+0LHQvdC+0YHRgtGMINC30LDQutC+0LzQvNC10L3RgtC40YDQvtCy0LDQvdC90L7Qs9C+INC60L7QtNCwXG4gICAgLy8gdHJhaWxpbmdTbGFzaCAtINC+0L0g0LjQvdC+0LPQtNCwINC90YPQttC10L0sINGB0LTQtdC70LDRgtGMINC60L7QvdGE0LjQs1xuICAgIC8vINGD0YHQu9C+0LLQuNC1INGBIHJlY3Vyc2lvbkNhbGwg0LTQvtCx0LDQstC70Y/QtdGCINGB0LvRjdGIINCyINGD0YDQuyDQv9C10YDQtdC0INC30L3QsNC60L7QvCDQstC+0L/RgNC+0YHQsFxuICAgIC8vdmFyIGlkZW50aXR5ID0gdGhpcy5pZGVudGl0eSA/ICcvJyArIHRoaXMuaWRlbnRpdHkgOiByZWN1cnNpb25DYWxsID8gJycgOiAnLyc7XG4gICAgdmFyIGlkZW50aXR5ID0gdGhpcy5pZGVudGl0eSA/ICcvJyArIHRoaXMuaWRlbnRpdHkgOiAnJztcblxuICAgIC8vINCf0YDQvtCx0LXQttCw0YLRjNGB0Y8g0L/QviDQstGB0LXQvCDRgNC10YHRg9GA0YHQsNC8INC4INC30LDQs9C70Y/QvdGD0YLRjCDQsiDQutC+0YDQtdC90Ywg0LDQv9C4LCDRh9GC0L7QsdGLINGB0L7QsdGA0LDRgtGMIHVybFxuICAgIHJldHVybiB0aGlzLnBhcmVudFJlc291cmNlXG4gICAgICA/IGNvbnN0cnVjdFVybC5jYWxsKCB0aGlzLnBhcmVudFJlc291cmNlLCB0cnVlICkgKyAnLycgKyB0aGlzLnVybCArIGlkZW50aXR5XG4gICAgICA6IHRoaXMudXJsO1xuICB9LFxuXG4gIF9yZXNvdXJjZVJlcXVlc3Q6IGZ1bmN0aW9uKCBtZXRob2QsIGFqYXhTZXR0aW5ncywgZG9uZSApe1xuICAgIHZhciB1cmwgPSB0aGlzLmNvbnN0cnVjdFVybCgpXG4gICAgICAsIHVzZU5vdGlmaWNhdGlvbnMgPSB0aGlzLm5vdGlmaWNhdGlvbnM7XG5cbiAgICBjb25zb2xlLmxvZyggdGhpcy5yZXNvdXJjZU5hbWUgKyAnOjonICsgbWV0aG9kICsgJyAnICsgdXJsICk7XG4gICAgcmV0dXJuIHRoaXMuaW5zdGFuY2UuX3JlcXVlc3QoIG1ldGhvZCwgdXJsLCBhamF4U2V0dGluZ3MuZGF0YSwgYWpheFNldHRpbmdzLCB1c2VOb3RpZmljYXRpb25zLCBkb25lICk7XG4gIH1cbn07XG5cbnZhciByZXF1ZXN0c1RhYmxlID0gW107XG5cbnZhciBtZXRob2RzTWFwID0ge1xuICAnY3JlYXRlJzogJ1BPU1QnLFxuICAncmVhZCc6ICAgJ0dFVCcsXG4gICd1cGRhdGUnOiAnUFVUJyxcbiAgJ2RlbGV0ZSc6ICdERUxFVEUnLFxuICAncGF0Y2gnOiAgJ1BBVENIJyxcblxuICAncG9zdCc6ICAgJ1BPU1QnLFxuICAnZ2V0JzogICAgJ0dFVCcsXG4gICdzYXZlJzogICAnUFVUJ1xufTtcblxuXy5mb3JFYWNoKCBPYmplY3Qua2V5cyggbWV0aG9kc01hcCApLCBmdW5jdGlvbiggdmVyYiApe1xuICAvKipcbiAgICog0JfQsNC/0YDQvtGB0YsgY3JlYXRlIHJlYWQgdXBkYXRlIGRlbGV0ZSBwYXRjaCBnZXQgcG9zdFxuICAgKlxuICAgKiDQkiBhamF4U2V0dGluZ3Mg0LzQvtC20L3QviDRg9C60LDQt9Cw0YLRjCDQv9C+0LvQtSBkb05vdFN0b3JlIC0g0YfRgtC+0LHRiyDQvdC1INGB0L7RhdGA0LDQvdGP0YLRjCDQv9C+0LvRg9GH0LXQvdC90YvQuSDQvtCx0YrQtdC60YIg0LIgc3RvcmFnZVxuICAgKlxuICAgKiBAcGFyYW0gW2RhdGFdXG4gICAqIEBwYXJhbSBbYWpheFNldHRpbmdzXVxuICAgKiBAcGFyYW0gW2RvbmVdXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgcmVzb3VyY2VNaXhpblsgdmVyYiBdID0gZnVuY3Rpb24oIGRhdGEsIGFqYXhTZXR0aW5ncywgZG9uZSApe1xuICAgIHZhciByZXNvdXJjZSA9IHRoaXMsXG4gICAgICBpZGVudGl0eSA9IHRoaXMuaWRlbnRpdHksXG4gICAgICBtZXRob2QgPSB0aGlzLmluc3RhbmNlLm1ldGhvZHNNYXBbIHZlcmJdLFxuICAgICAgZG9jdW1lbnRJZFN0cmluZztcblxuICAgIC8vINCV0YHQu9C4IGRhdGEgLSDQtdGB0YLRjCDRhNGD0L3QutGG0LjRjywg0YLQviDRjdGC0L4gZG9uZVxuICAgIGlmICggJC5pc0Z1bmN0aW9uKCBkYXRhICkgKXtcbiAgICAgIGRvbmUgPSBkYXRhO1xuICAgICAgZGF0YSA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgaWYgKCAkLmlzRnVuY3Rpb24oIGFqYXhTZXR0aW5ncyApICl7XG4gICAgICBkb25lID0gYWpheFNldHRpbmdzO1xuICAgICAgYWpheFNldHRpbmdzID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGFqYXhTZXR0aW5ncyA9IGFqYXhTZXR0aW5ncyB8fCB7fTtcblxuICAgIC8vINCf0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuCDQtNC+0LrRg9C80LXQvdGC0LAg0L3Rg9C20L3QviDRgdC+0YXRgNCw0L3Rj9GC0Ywg0YLQvtC70YzQutC+INC40LfQvNC10L3RkdC90L3Ri9C1INC/0L7Qu9GPXG4gICAgaWYgKCBtZXRob2QgPT09ICdQT1NUJyB8fCBtZXRob2QgPT09ICdQVVQnICl7XG4gICAgICAvLyDQmNC90L7Qs9C00LAg0L/QtdGA0LXQtNCw0Y7RgiDQtNC+0LrRg9C80LXQvdGCXG4gICAgICBpZiAoIGRhdGEgaW5zdGFuY2VvZiBzdG9yYWdlLkRvY3VtZW50ICkge1xuICAgICAgICBkb2N1bWVudElkU3RyaW5nID0gZGF0YS5faWQudG9TdHJpbmcoKTtcbiAgICAgICAgZGF0YSA9IGRhdGEuJF9fZGVsdGEoKTtcblxuICAgICAgICAvLyDQotCw0Log0LzQvtC20L3QviDQv9C+0L3Rj9GC0YwsINGH0YLQviDQvNGLINGB0L7RhdGA0LDQvdGP0LXQvCDRgdGD0YnQtdGC0LLRg9GO0YnQuNC5INC90LAg0YHQtdGA0LLQtdGA0LUgRG9jdW1lbnRcbiAgICAgIH0gZWxzZSBpZiAoIHN0b3JhZ2UuT2JqZWN0SWQuaXNWYWxpZCggaWRlbnRpdHkgKSApIHtcbiAgICAgICAgZG9jdW1lbnRJZFN0cmluZyA9IGlkZW50aXR5O1xuXG4gICAgICAgIC8vINCf0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuCDRh9C10YDQtdC3INC80LXRgtC+0LQgc2F2ZSgpINGDINC00L7QutGD0LzQtdC90YLQsFxuICAgICAgfSBlbHNlIGlmICggZGF0YS5faWQgJiYgc3RvcmFnZS5PYmplY3RJZC5pc1ZhbGlkKCBkYXRhLl9pZCApICkge1xuICAgICAgICBkb2N1bWVudElkU3RyaW5nID0gZGF0YS5faWQudG9TdHJpbmcoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBhamF4U2V0dGluZ3MuZGF0YSA9IGRhdGE7XG5cbiAgICB2YXIgcmVxSW5mbyA9IHtcbiAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgdXJsOiB0aGlzLmNvbnN0cnVjdFVybCgpLFxuICAgICAgYWpheFNldHRpbmdzOiBhamF4U2V0dGluZ3MsXG4gICAgICByZXN1bHQ6IG51bGwsXG4gICAgICBtZXRhOiBudWxsXG4gICAgfTtcblxuICAgIC8vVE9ETzog0LTQvtC00LXQu9Cw0YLRjCDQutGN0YjQuNGA0L7QstCw0L3QuNC1XG4gICAgLy8g0JrRjdGI0LjRgNC+0LLQsNC90LjQtSDQvdCwINGH0YLQtdC90LjQtVxuICAgIGlmICggbWV0aG9kID09PSAnR0VUJyApe1xuICAgICAgdmFyIGluQ2FjaGUgPSBfLmZpbmQoIHJlcXVlc3RzVGFibGUsIHJlcUluZm8gKTtcblxuICAgICAgaWYgKCByZXNvdXJjZS5zdG9yYWdlICYmIGlkZW50aXR5ICYmIGluQ2FjaGUgKXtcbiAgICAgICAgLy8g0JXRgdC70Lgg0LTQsNC90L3QvtC1INC10YHRgtGMIC0g0LLQtdGA0L3Rg9GC0Ywg0LXQs9C+XG4gICAgICAgIGlmICggaW5DYWNoZS5yZXN1bHQgKXtcbiAgICAgICAgICBkb25lICYmIGRvbmUoIGluQ2FjaGUucmVzdWx0LCBpbkNhY2hlLm1ldGEgKTtcbiAgICAgICAgICBjbGVhcklkZW50aXR5KCByZXNvdXJjZSApO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBkZmQgPSAkLkRlZmVycmVkKCk7XG4gICAgdGhpcy5fcmVzb3VyY2VSZXF1ZXN0KCB2ZXJiLCBhamF4U2V0dGluZ3MgKS5kb25lKGZ1bmN0aW9uKCByZXNwb25zZSwgdGV4dFN0YXR1cywganFYSFIgKXtcbiAgICAgIHZhciByZXN1bHQsIGZpZWxkcztcblxuICAgICAgLy8gI2V4YW1wbGVcbiAgICAgIC8vIGFwaS5wbGFjZXMoeyBmaWVsZHM6ICduYW1lJywgc2tpcDogMTAwIH0pO1xuICAgICAgLy8g0JXRgdC70Lgg0LHRi9C70LAg0LLRi9Cx0L7RgNC60LAg0L/QviDQv9C+0LvRj9C8LCDQvdGD0LbQvdC+INC/0YDQsNCy0LjQu9GM0L3QviDQvtCx0YDQsNCx0L7RgtCw0YLRjCDQtdGRINC4INC/0LXRgNC10LTQsNGC0Ywg0LIg0LTQvtC60YPQvNC10L3RglxuICAgICAgaWYgKCBkYXRhICYmIGRhdGEuZmllbGRzICl7XG4gICAgICAgIGZpZWxkcyA9IHV0aWxzLnNlbGVjdCggZGF0YS5maWVsZHMgKTtcbiAgICAgIH1cblxuICAgICAgLy8g0JXRgdGC0Ywg0L7RgtCy0LXRgiDQvdCw0LTQviDRgdC+0YXRgNCw0L3QuNGC0Ywg0LIg0YXRgNCw0L3QuNC70LjRidC1XG4gICAgICBpZiAoIHJlc291cmNlLnN0b3JhZ2UgJiYgIWFqYXhTZXR0aW5ncy5kb05vdFN0b3JlICl7XG4gICAgICAgIC8vINCf0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuCDQuCDQvtCx0L3QvtCy0LvQtdC90LjQuCDQvdGD0LbQvdC+INC+0LHQvdC+0LLQu9GP0YLRjCDQtNC+0LrRg9C80LXQvdGCXG4gICAgICAgIGlmICggbWV0aG9kID09PSAnUE9TVCcgfHwgbWV0aG9kID09PSAnUFVUJyApe1xuICAgICAgICAgIC8vINCf0L7Qv9GA0L7QsdGD0LXQvCDRgdC90LDRh9Cw0LvQsCDQvdCw0LnRgtC4INC00L7QutGD0LzQtdC90YIg0L/QviBpZCDQuCDQvtCx0L3QvtCy0LjRgtGMINC10LPQvlxuICAgICAgICAgIHJlc3VsdCA9IHN0b3JhZ2VbIHJlc291cmNlLmNvbGxlY3Rpb25OYW1lIF0uZmluZEJ5SWQoIGRvY3VtZW50SWRTdHJpbmcgKTtcblxuICAgICAgICAgIGlmICggcmVzdWx0ICl7XG4gICAgICAgICAgICAvLyDQntCx0L3QvtCy0LvRj9C10Lwg0LTQvtC60YPQvNC10L3RglxuICAgICAgICAgICAgcmVzdWx0LnNldCggcmVzcG9uc2UucmVzdWx0ICk7XG5cbiAgICAgICAgICAgIC8vINCh0L7Qt9C00LDRkdC8INGB0YHRi9C70LrRgyDQv9C+INC90L7QstC+0LzRgyBpZCDQsiDQutC+0LvQu9C10LrRhtC40LhcbiAgICAgICAgICAgIHN0b3JhZ2VbIHJlc291cmNlLmNvbGxlY3Rpb25OYW1lIF0udXBkYXRlSWRMaW5rKCByZXN1bHQgKTtcblxuICAgICAgICAgICAgLy8g0K3RgtC+0YIg0LTQvtC60YPQvNC10L3RgiDRgtC10L/QtdGA0Ywg0YHQvtGF0YDQsNC90ZHQvSDQvdCwINGB0LXRgNCy0LXRgNC1LCDQt9C90LDRh9C40YIg0L7QvSDRg9C20LUg0L3QtSDQvdC+0LLRi9C5LlxuICAgICAgICAgICAgcmVzdWx0LmlzTmV3ID0gZmFsc2U7XG5cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0ID0gc3RvcmFnZVsgcmVzb3VyY2UuY29sbGVjdGlvbk5hbWUgXS5hZGQoIHJlc3BvbnNlLnJlc3VsdCB8fCByZXNwb25zZSwgdW5kZWZpbmVkLCB0cnVlICk7XG4gICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAoIG1ldGhvZCA9PT0gJ0dFVCcgKXtcbiAgICAgICAgICAvLyDQndC1INC00L7QsdCw0LLQu9GP0YLRjCDQsiDRhdGA0LDQvdC40LvQuNGJ0LUg0YDQtdC30YPQu9GM0YLQsNGCINC30LDQv9GA0L7RgdC+0LIg0YEg0LLRi9Cx0L7RgNC60L7QuSDQv9C+0LvQtdC5XG4gICAgICAgICAgaWYgKCBmaWVsZHMgKXtcbiAgICAgICAgICAgIHJlc3VsdCA9IHJlc3BvbnNlLnJlc3VsdDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0ID0gc3RvcmFnZVsgcmVzb3VyY2UuY29sbGVjdGlvbk5hbWUgXS5hZGQoIHJlc3BvbnNlLnJlc3VsdCB8fCByZXNwb25zZSwgZmllbGRzLCB0cnVlICk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHQgPSByZXNwb25zZS5yZXN1bHQgfHwgcmVzcG9uc2U7XG4gICAgICB9XG5cbiAgICAgIC8vINCh0L7RhdGA0LDQvdC40YLRjCDQv9Cw0YDQsNC80LXRgtGA0Ysg0LfQsNC/0YDQvtGB0LAg0Lgg0L7RgtCy0LXRgiDQtNC70Y8g0LrRjdGI0LjRgNC+0LLQsNC90LjRj1xuICAgICAgcmVxSW5mby5yZXN1bHQgPSByZXN1bHQ7XG4gICAgICByZXFJbmZvLm1ldGEgPSByZXNwb25zZS5tZXRhO1xuICAgICAgcmVxdWVzdHNUYWJsZS5wdXNoKCByZXFJbmZvICk7XG5cbiAgICAgIGRvbmUgJiYgZG9uZSggcmVzdWx0LCByZXNwb25zZS5tZXRhICk7XG4gICAgICBkZmQucmVzb2x2ZSggcmVzdWx0LCByZXNwb25zZS5tZXRhLCB0ZXh0U3RhdHVzLCBqcVhIUiApO1xuXG4gICAgfSkuZmFpbChmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICl7XG4gICAgICBkZmQucmVqZWN0KCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKTtcbiAgICB9KTtcblxuICAgIC8vVE9ETzog0JjRgdC/0L7Qu9GM0LfQvtCy0LDRgtGMINC40LTQtdC+0LvQvtCz0Y4gcXVlcnk/IHF1ZXJ5INC+0LHRitC10LrRgiDQtNC70Y8g0L/QvtGB0YLRgNC+0LXQvdC40Y8g0LfQsNC/0YDQvtGB0L7QslxuXG4gICAgLy8gaWRlbnRpdHkg0YHQvtGF0YDQsNC90Y/QtdGC0YHRjyDQtNC70Y8gY29uc3RydWN0VXJsLCDQtdCz0L4g0L3Rg9C20L3QviDQvtGH0LjRgdGC0LjRgtGMINC00LvRjyDQv9C+0YHQu9C10LTRg9GO0YnQuNGFINC30LDQv9GA0L7RgdC+0LIuXG4gICAgY2xlYXJJZGVudGl0eSggcmVzb3VyY2UgKTtcblxuICAgIHJldHVybiBkZmQ7XG4gIH07XG59KTtcblxuLy8g0J7Rh9C40YHRgtC40YLRjCBpZGVudGl0eSDRgyDRgNC10YHRg9GA0YHQsCDQuCDQtdCz0L4g0YDQvtC00LjRgtC10LvRjNGB0LrQuNGFINGA0LXRgdGD0YDRgdC+0LIg0YLQvtC20LVcbmZ1bmN0aW9uIGNsZWFySWRlbnRpdHkoIHJlc291cmNlICl7XG4gIHdoaWxlICggcmVzb3VyY2UucGFyZW50UmVzb3VyY2UgKSB7XG4gICAgcmVzb3VyY2UuaWRlbnRpdHkgPSAnJztcbiAgICByZXNvdXJjZSA9IHJlc291cmNlLnBhcmVudFJlc291cmNlO1xuICB9XG59XG5cbi8qKlxuICog0JrQsNC6INCx0Ysg0LrQvtC90YHRgtGA0YPQutGC0L7RgCDRgNC10YHRg9GA0YHQsCwg0L3QviDQstC+0LfQstGA0LDRidCw0LXRgiDRhNGD0L3QutGG0LjRji3QvtCx0YrQtdC60YIg0YEg0L/RgNC40LzQtdGB0Y/QvNC4XG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHJlc291cmNlTmFtZVxuICogQHBhcmFtIHtvYmplY3R9IHBhcmVudFJlc291cmNlXG4gKiBAcGFyYW0ge29iamVjdH0gdXNlcnNNaXhpblxuICogQHJldHVybnMge0Z1bmN0aW9ufSByZXNvdXJjZVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFJlc291cmNlKCByZXNvdXJjZU5hbWUsIHBhcmVudFJlc291cmNlLCB1c2Vyc01peGluICl7XG5cbiAgLyoqXG4gICAqINCt0YLRgyDRhNGD0L3QutGG0LjRjiDQvNGLINC+0YLQtNCw0ZHQvCDQv9C+0LvRjNC30L7QstCw0YLQtdC70Y4g0LIg0LrQsNGH0LXRgdGC0LLQtSDQtNC+0YHRgtGD0L/QsCDQuiDRgNC10YHRg9GA0YHRgy5cbiAgICog0J7QvdCwINC/0L7Qt9Cy0L7Qu9GP0LXRgiDQt9Cw0LTQsNGC0YwgaWRlbnRpdHkg0LTQu9GPINC30LDQv9GA0L7RgdCwLlxuICAgKlxuICAgKiBAcGFyYW0gW2lkZW50aXR5XVxuICAgKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gICAqL1xuICB2YXIgcmVzb3VyY2UgPSBmdW5jdGlvbiByZXNvdXJjZSggaWRlbnRpdHkgKXtcbiAgICBpZiAoIGlkZW50aXR5ICYmICFfLmlzU3RyaW5nKCBpZGVudGl0eSApICl7XG4gICAgICBjb25zb2xlLmVycm9yKCdpZGVudGl0eSDQtNC+0LvQttC10L0g0LHRi9GC0Ywg0YHRgtGA0L7QutC+0LksINCwINC90LUnLCBpZGVudGl0eSApO1xuICAgIH1cblxuICAgIHJlc291cmNlLmlkZW50aXR5ID0gaWRlbnRpdHkgfHwgJyc7XG5cbiAgICByZXR1cm4gcmVzb3VyY2U7XG4gIH07XG5cbiAgJC5leHRlbmQoIHJlc291cmNlLCByZXNvdXJjZU1peGluLCB7XG4gICAgcmVzb3VyY2VOYW1lOiByZXNvdXJjZU5hbWUsXG4gICAgdXJsOiByZXNvdXJjZU5hbWVcbiAgfSwgdXNlcnNNaXhpbiApO1xuXG4gIHJlc291cmNlLnBhcmVudFJlc291cmNlID0gcGFyZW50UmVzb3VyY2U7XG4gIHJlc291cmNlLmluc3RhbmNlID0gcGFyZW50UmVzb3VyY2UuaW5zdGFuY2UgfHwgcGFyZW50UmVzb3VyY2U7XG5cbiAgcmV0dXJuIHJlc291cmNlO1xufVxuXG4vKipcbiAqIENyZWF0ZSBuZXcgYXBpIGNsaWVudFxuICpcbiAqIEBleGFtcGxlXG4gKiB2YXIgYXBpID0gbmV3IEFwaUNsaWVudCgnL2FwaScsIHtcbiAqICAgaG9va3M6IHtcbiAqICAgICBoZWFkZXJzOiB7XG4gKiAgICAgICB0b2tlbjogJ1hYWFhYWCdcbiAqICAgICB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIHZhciBhcGkgPSBuZXcgQXBpQ2xpZW50KCdodHRwczovL2RvbWFpbi5jb20vYXBpJywge1xuICogICBob29rczoge1xuICogICAgIGhlYWRlcnM6IHtcbiAqICAgICAgIHRva2VuOiAnWFhYWFhYJ1xuICogICAgIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogdmFyIGFwaSA9IG5ldyBBcGlDbGllbnQoe1xuICogICB1cmw6ICcvYXBpJ1xuICogICBob29rczoge1xuICogICAgIGhlYWRlcnM6IHtcbiAqICAgICAgIHRva2VuOiAnWFhYWFhYJ1xuICogICAgIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogQHBhcmFtIHVybCBhcGkgcm9vdCB1cmxcbiAqIEBwYXJhbSBvcHRpb25zIGFwaSBjbGllbnQgb3B0aW9uc1xuICovXG5mdW5jdGlvbiBBcGlDbGllbnQoIHVybCwgb3B0aW9ucyApe1xuICBpZiAoICEodGhpcyBpbnN0YW5jZW9mIEFwaUNsaWVudCkgKSB7XG4gICAgcmV0dXJuIG5ldyBBcGlDbGllbnQoIHVybCwgb3B0aW9ucyApO1xuICB9XG5cbiAgLy8gSWYgZmlyc3QgYXJnIGlzIG9iamVjdFxuICBpZiAoIF8uaXNPYmplY3QoIHVybCApICl7XG4gICAgb3B0aW9ucyA9IHVybDtcbiAgICB1cmwgPSBsb2NhdGlvbi5vcmlnaW47XG4gIH1cblxuICBpZiAoIHVybCA9PSBudWxsICl7XG4gICAgdXJsID0gbG9jYXRpb24ub3JpZ2luO1xuICB9XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIG9wdGlvbnMudXJsID0gdXJsO1xuXG4gIC8vIERlZmF1bHRzLCBub3RpZmljYXRpb25zIGlzIG9mZlxuICB0aGlzLm5vdGlmaWNhdGlvbnMgPSBmYWxzZTtcblxuICAvKipcbiAgICogaG9va3MgZm9yIGFqYXggc2V0dGluZ3MgKGFzIGJhc2UgYWpheFNldHRpbmdzKVxuICAgKiBAc2VlIGh0dHA6Ly9hcGkuanF1ZXJ5LmNvbS9qUXVlcnkuYWpheC9cbiAgICpcbiAgICogQHR5cGUge09iamVjdH1cbiAgICovXG4gIHRoaXMuaG9va3MgPSB7XG4gICAgLy8g0LTQvtC/0L7Qu9C90LjRgtC10LvRjNC90YvQtSDQtNCw0L3QvdGL0LUg0LfQsNC/0YDQvtGB0LBcbiAgICBkYXRhOiB7fSxcbiAgICAvLyDQntCx0YrQtdC60YIg0LTQu9GPINC00L7QsdCw0LLQu9C10L3QuNGPINC/0YDQvtC40LfQstC+0LvRjNC90YvRhSDQt9Cw0LPQvtC70L7QstC60L7QsiDQutC+INCy0YHQtdC8INC30LDQv9GA0L7RgdCw0LxcbiAgICAvLyDRg9C00L7QsdC90L4g0LTQu9GPINCw0LLRgtC+0YDQuNC30LDRhtC40Lgg0L/QviDRgtC+0LrQtdC90LDQvFxuICAgIGhlYWRlcnM6IHt9XG4gIH07XG5cbiAgJC5leHRlbmQoIHRydWUsIHRoaXMsIG9wdGlvbnMgKTtcbn1cblxuQXBpQ2xpZW50LnByb3RvdHlwZSA9IHtcbiAgLyoqXG4gICAqINCU0L7QsdCw0LLQuNGC0Ywg0L3QvtCy0YvQuSDRgNC10YHRg9GA0YFcbiAgICogQHNlZSByZXNvdXJjZU1peGluLmFkZFxuICAgKi9cbiAgYWRkOiByZXNvdXJjZU1peGluLmFkZCxcblxuICBtZXRob2RzTWFwOiBtZXRob2RzTWFwLFxuXG4gIF9wcmVwYXJlQWpheFNldHRpbmdzOiBmdW5jdGlvbiggbWV0aG9kLCB1cmwsIGRhdGEsIGFqYXhTZXR0aW5ncyApe1xuICAgIHZhciB0eXBlID0gdGhpcy5tZXRob2RzTWFwWyBtZXRob2QgXVxuICAgICAgLCBfYWpheFNldHRpbmdzID0gJC5leHRlbmQoIHRydWUsIHt9LCB0aGlzLmhvb2tzLCBhamF4U2V0dGluZ3MsIHtcbiAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgdXJsOiB1cmxcbiAgICAgIH0pO1xuXG4gICAgLy8g0JTQvtCx0LDQstC70Y/QtdC8INCw0LLRgtC+0YDQuNC30LDRhtC40Y4g0L/QviDRgtC+0LrQtdC90YNcbiAgICBpZiAoIHRoaXMudG9rZW4gJiYgYWpheFNldHRpbmdzLmhlYWRlcnMgJiYgYWpheFNldHRpbmdzLmhlYWRlcnMudG9rZW4gPT0gbnVsbCApe1xuICAgICAgX2FqYXhTZXR0aW5ncy5oZWFkZXJzLkF1dGhvcml6YXRpb24gPSAndG9rZW4gJyArIHRoaXMudG9rZW47XG4gICAgfVxuXG4gICAgaWYgKCB0eXBlID09PSAnR0VUJyApe1xuICAgICAgXy5hc3NpZ24oIF9hamF4U2V0dGluZ3MuZGF0YSwgZGF0YSApO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyDQldGB0LvQuCDRgdC+0YXRgNCw0L3Rj9C10Lwg0LTQvtC60YPQvNC10L3Rgiwg0L3Rg9C20L3QviDRgdC00LXQu9Cw0YLRjCB0b09iamVjdCh7ZGVwb3B1bGF0ZTogMX0pXG4gICAgICBpZiAoIGRhdGEgJiYgZGF0YS5jb25zdHJ1Y3RvciAmJiBkYXRhLmNvbnN0cnVjdG9yLm5hbWUgJiYgZGF0YS5jb25zdHJ1Y3Rvci5uYW1lID09PSAnRG9jdW1lbnQnICl7XG4gICAgICAgIF8uYXNzaWduKCBfYWpheFNldHRpbmdzLmRhdGEsIGRhdGEudG9PYmplY3Qoe2RlcG9wdWxhdGU6IDF9KSApO1xuXG4gICAgICB9IGVsc2UgaWYgKCBkYXRhICkge1xuICAgICAgICBfLmFzc2lnbiggX2FqYXhTZXR0aW5ncy5kYXRhLCBkYXRhICk7XG4gICAgICB9XG5cbiAgICAgIGlmICggX2FqYXhTZXR0aW5ncy5kYXRhICYmIF9hamF4U2V0dGluZ3MuY29udGVudFR5cGUgPT09ICdhcHBsaWNhdGlvbi9qc29uJyApe1xuICAgICAgICBfYWpheFNldHRpbmdzLmRhdGEgPSBKU09OLnN0cmluZ2lmeSggX2FqYXhTZXR0aW5ncy5kYXRhICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gdG9kbyDQv9GA0L7QstC10YDRgtGMINC90LDQtNC+0LHQvdC+0YHRgtGMINC60L7QtNCwXG4gICAgLy8g0JjRgdC/0L7Qu9GM0LfRg9C10YLRgdGPINC00LvRjyDQsNC70LjQsNGB0L7Qsiwg0LIg0LrQvtGC0L7RgNGL0YUg0LLRgtC+0YDQvtC5INC/0LDRgNCw0LzQtdGC0YAgLSDQtdGB0YLRjCDQvtCx0YrQtdC60YIg0L3QsNGB0YLRgNC+0LXQulxuICAgIGlmICggJC5pc1BsYWluT2JqZWN0KCB1cmwgKSApe1xuICAgICAgY29uc29sZS5pbmZvKCfQkNGFQCrRgtGMLCDQvdGD0LbQvdGL0Lkg0LrQvtC0ISEhIScpO1xuICAgICAgX2FqYXhTZXR0aW5ncyA9IHVybDtcbiAgICAgIGRlYnVnZ2VyO1xuICAgIH1cblxuICAgIHJldHVybiBfYWpheFNldHRpbmdzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZW5kIHJlcXVlc3Qgb24gc2VydmVyXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtZXRob2Qg0J3QsNC30LLQsNC90LjQtSDQvNC10YLQvtC00LAgKFBPU1QsIEdFVCwgUFVULCBERUxFVEUsIFBBVENIKVxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXJsINCf0L7Qu9C90YvQuSDRg9GA0Lsg0YDQtdGB0YPRgNGB0LBcbiAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEg0J7QsdGK0LXQutGCINGBINC00LDQvdC90YvQvNC4INC00LvRjyDQt9Cw0L/RgNC+0YHQsFxuICAgKiBAcGFyYW0ge29iamVjdH0gYWpheFNldHRpbmdzINCe0LHRitC10LrRgiDRgSDQvdCw0YHRgtGA0L7QudC60LDQvNC4XG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gdXNlTm90aWZpY2F0aW9ucyDQpNC70LDQsywg0LjRgdC/0L7Qu9GM0LfQvtCy0LDRgtGMINC70Lgg0YPQstC10LTQvtC80LvQtdC90LjRj1xuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBkb25lINCk0YPQvdC60YbQuNGPINGD0YHQv9C10YjQvdC+0LPQviDQvtCx0YDQsNGC0L3QvtCz0L4g0LLRi9C30L7QstCwXG4gICAqIEByZXR1cm5zIHskLkRlZmVycmVkfSDQstC+0LfQstGA0LDRidCw0LXRgiBqcXVlcnkgYWpheCDQvtCx0YrQtdC60YJcbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9yZXF1ZXN0OiBmdW5jdGlvbiggbWV0aG9kLCB1cmwsIGRhdGEsIGFqYXhTZXR0aW5ncywgdXNlTm90aWZpY2F0aW9ucywgZG9uZSApe1xuICAgIGlmICggIV8uaXNTdHJpbmcoIG1ldGhvZCApICl7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ9Cf0LDRgNCw0LzQtdGC0YAgYG1ldGhvZGAg0LTQvtC70LbQtdC9INCx0YvRgtGMINGB0YLRgNC+0LrQvtC5LCDQsCDQvdC1ICcsIG1ldGhvZCApO1xuICAgIH1cblxuICAgIHZhciBzZWxmID0gdGhpc1xuICAgICAgLCB0eXBlID0gdGhpcy5tZXRob2RzTWFwWyBtZXRob2QgXVxuICAgICAgLCBub3RpZmljYXRpb25UeXBlID0gdHlwZSA9PT0gJ0dFVCcgPyAnbG9hZCcgOiAoIHR5cGUgPT09ICdQT1NUJyB8fCB0eXBlID09PSAnUFVUJyB8fCB0eXBlID09PSAnUEFUQ0gnICkgPyAnc2F2ZScgOiAnZGVsZXRlJ1xuICAgICAgLCBfYWpheFNldHRpbmdzID0gdGhpcy5fcHJlcGFyZUFqYXhTZXR0aW5ncyggbWV0aG9kLCB1cmwsIGRhdGEsIGFqYXhTZXR0aW5ncyApO1xuXG4gICAgLy8g0JjRgdC/0L7Qu9GM0LfQvtCy0LDRgtGMINC30L3QsNGH0LXQvdC40LUg0L/QviDRg9C80L7Qu9GH0LDQvdC40Y4sINC10YHQu9C4IHVzZU5vdGlmaWNhdGlvbnMg0L3QtSDQt9Cw0LTQsNC9XG4gICAgLy8g0YLRg9GCINC20LUg0L/QvtGA0LLQtdGA0Y/QtdC8LCDQv9C+0LTQutC70Y7Rh9C10L3RiyDQu9C4INGD0LLQtdC00L7QvNC70LXQvdC40Y9cbiAgICBpZiAoIF8uaXNCb29sZWFuKCB1c2VOb3RpZmljYXRpb25zICkgKXtcbiAgICAgIHVzZU5vdGlmaWNhdGlvbnMgPSB1c2VOb3RpZmljYXRpb25zICYmIGNmLm5vdGlmaWNhdGlvbjtcbiAgICB9IGVsc2Uge1xuICAgICAgdXNlTm90aWZpY2F0aW9ucyA9IHRoaXMubm90aWZpY2F0aW9ucyAmJiBjZi5ub3RpZmljYXRpb247XG4gICAgfVxuXG4gICAgaWYgKCB1c2VOb3RpZmljYXRpb25zICl7XG4gICAgICBjZi5ub3RpZmljYXRpb25bIG5vdGlmaWNhdGlvblR5cGUgXS5zaG93KCk7XG4gICAgfVxuXG4gICAgcmV0dXJuICQuYWpheCggX2FqYXhTZXR0aW5ncyApLmZhaWwoZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApe1xuICAgICAgY29uc29sZS53YXJuKCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKTtcblxuICAgICAgLy8gVW5hdXRob3JpemVkIENhbGxiYWNrXG4gICAgICBpZiAoIGpxWEhSLnN0YXR1cyA9PT0gNDAxICYmIHNlbGYudW5hdXRob3JpemVkQ2FsbGJhY2sgKXtcbiAgICAgICAgc2VsZi51bmF1dGhvcml6ZWRDYWxsYmFjaygganFYSFIsIG1ldGhvZCwgdXJsLCBkYXRhLCBhamF4U2V0dGluZ3MsIGRvbmUgKTtcblxuICAgICAgICAvLyDQndC1INC/0L7QutCw0LfRi9Cy0LDRgtGMINGB0L7QvtCx0YnQtdC90LjQtSDRgSDQvtGI0LjQsdC60L7QuSDQv9GA0LggNDAxLCDQtdGB0LvQuCDQstGB0ZEg0L/Qu9C+0YXQviwg0YLQviDRgNC+0YPRgtC10YAg0YHQsNC8INC/0LXRgNC10LrQuNC90LXRgiDQvdCwINGE0L7RgNC80YMg0LLRhdC+0LTQsFxuICAgICAgICBpZiAoIHVzZU5vdGlmaWNhdGlvbnMgKXtcbiAgICAgICAgICBjZi5ub3RpZmljYXRpb25bIG5vdGlmaWNhdGlvblR5cGUgXS5oaWRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICggdXNlTm90aWZpY2F0aW9ucyApe1xuICAgICAgICBjZi5ub3RpZmljYXRpb25bIG5vdGlmaWNhdGlvblR5cGUgXS5mYWlsKCk7XG4gICAgICB9XG5cbiAgICB9KS5kb25lKGZ1bmN0aW9uKCl7XG4gICAgICBpZiAoIHVzZU5vdGlmaWNhdGlvbnMgKXtcbiAgICAgICAgY2Yubm90aWZpY2F0aW9uWyBub3RpZmljYXRpb25UeXBlIF0uaGlkZSgpO1xuICAgICAgfVxuICAgIH0pLmRvbmUoIGRvbmUgKTtcbiAgfVxufTtcblxuLyoqXG4gKiBNZXRob2QgZm9yIGdldCByZXF1ZXN0IHRvIGFwaSByb290XG4gKlxuICogQHBhcmFtIGFqYXhTZXR0aW5nc1xuICogQHBhcmFtIGRvbmVcbiAqIEByZXR1cm5zIHskLkRlZmVycmVkfVxuICovXG5BcGlDbGllbnQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKCBhamF4U2V0dGluZ3MsIGRvbmUgKXtcbiAgY29uc29sZS5sb2coICdhcGk6OmdldCcgKTtcbiAgaWYgKCAkLmlzRnVuY3Rpb24oIGFqYXhTZXR0aW5ncyApICl7XG4gICAgZG9uZSA9IGFqYXhTZXR0aW5ncztcbiAgICBhamF4U2V0dGluZ3MgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBhamF4U2V0dGluZ3MgPSBhamF4U2V0dGluZ3MgfHwge307XG5cbiAgcmV0dXJuIHRoaXMuX3JlcXVlc3QoJ3JlYWQnLCB0aGlzLnVybCwgdW5kZWZpbmVkLCBhamF4U2V0dGluZ3MsIGZhbHNlLCBkb25lICk7XG59O1xuLyoqXG4gKiBAYWxpYXMgQXBpQ2xpZW50LnByb3RvdHlwZS5nZXRcbiAqIEB0eXBlIHtGdW5jdGlvbn1cbiAqL1xuQXBpQ2xpZW50LnByb3RvdHlwZS5yZWFkID0gQXBpQ2xpZW50LnByb3RvdHlwZS5nZXQ7XG5cbkFwaUNsaWVudC52ZXJzaW9uID0gJzAuMi4wJztcblxuQXBpQ2xpZW50LnV0aWxzID0gdXRpbHM7XG5cbi8vIGV4cG9ydHNcbm1vZHVsZS5leHBvcnRzID0gQXBpQ2xpZW50OyIsIi8qKlxuICogVXNlcjogQ29uc3RhbnRpbmUgTWVsbmlrb3ZcbiAqIEVtYWlsOiBrYS5tZWxuaWtvdkBnbWFpbC5jb21cbiAqIERhdGU6IDI3LjAxLjE1XG4gKiBUaW1lOiAxNjoxNlxuICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHt9O1xuXG4vKipcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9haGVja21hbm4vbXF1ZXJ5L2Jsb2IvbWFzdGVyL2xpYi9tcXVlcnkuanNcbiAqIG1xdWVyeS5zZWxlY3RcbiAqXG4gKiBTcGVjaWZpZXMgd2hpY2ggZG9jdW1lbnQgZmllbGRzIHRvIGluY2x1ZGUgb3IgZXhjbHVkZVxuICpcbiAqICMjIyNTdHJpbmcgc3ludGF4XG4gKlxuICogV2hlbiBwYXNzaW5nIGEgc3RyaW5nLCBwcmVmaXhpbmcgYSBwYXRoIHdpdGggYC1gIHdpbGwgZmxhZyB0aGF0IHBhdGggYXMgZXhjbHVkZWQuXG4gKiBXaGVuIGEgcGF0aCBkb2VzIG5vdCBoYXZlIHRoZSBgLWAgcHJlZml4LCBpdCBpcyBpbmNsdWRlZC5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICAvLyBpbmNsdWRlIGEgYW5kIGIsIGV4Y2x1ZGUgY1xuICogICAgIHV0aWxzLnNlbGVjdCgnYSBiIC1jJyk7XG4gKlxuICogICAgIC8vIG9yIHlvdSBtYXkgdXNlIG9iamVjdCBub3RhdGlvbiwgdXNlZnVsIHdoZW5cbiAqICAgICAvLyB5b3UgaGF2ZSBrZXlzIGFscmVhZHkgcHJlZml4ZWQgd2l0aCBhIFwiLVwiXG4gKiAgICAgdXRpbHMuc2VsZWN0KHthOiAxLCBiOiAxLCBjOiAwfSk7XG4gKlxuICogQHBhcmFtIHtPYmplY3R8U3RyaW5nfSBzZWxlY3Rpb25cbiAqIEByZXR1cm4ge09iamVjdHx1bmRlZmluZWR9XG4gKiBAYXBpIHB1YmxpY1xuICovXG51dGlscy5zZWxlY3QgPSBmdW5jdGlvbiggc2VsZWN0aW9uICl7XG4gIGlmICghc2VsZWN0aW9uKSByZXR1cm47XG5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggIT09IDEpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc2VsZWN0OiBzZWxlY3Qgb25seSB0YWtlcyAxIGFyZ3VtZW50Jyk7XG4gIH1cblxuICB2YXIgZmllbGRzID0ge307XG4gIHZhciB0eXBlID0gdHlwZW9mIHNlbGVjdGlvbjtcblxuICBpZiAoJ3N0cmluZycgPT09IHR5cGUgfHwgJ29iamVjdCcgPT09IHR5cGUgJiYgJ251bWJlcicgPT09IHR5cGVvZiBzZWxlY3Rpb24ubGVuZ3RoICYmICFBcnJheS5pc0FycmF5KCBzZWxlY3Rpb24gKSkge1xuICAgIGlmICgnc3RyaW5nJyA9PT0gdHlwZSl7XG4gICAgICBzZWxlY3Rpb24gPSBzZWxlY3Rpb24uc3BsaXQoL1xccysvKTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gc2VsZWN0aW9uLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICB2YXIgZmllbGQgPSBzZWxlY3Rpb25bIGkgXTtcbiAgICAgIGlmICggIWZpZWxkICkgY29udGludWU7XG4gICAgICB2YXIgaW5jbHVkZSA9ICctJyA9PT0gZmllbGRbIDAgXSA/IDAgOiAxO1xuICAgICAgaWYgKGluY2x1ZGUgPT09IDApIGZpZWxkID0gZmllbGQuc3Vic3RyaW5nKCAxICk7XG4gICAgICBmaWVsZHNbIGZpZWxkIF0gPSBpbmNsdWRlO1xuICAgIH1cblxuICAgIHJldHVybiBmaWVsZHM7XG4gIH1cblxuICBpZiAoXy5pc1BsYWluT2JqZWN0KCBzZWxlY3Rpb24gKSAmJiAhQXJyYXkuaXNBcnJheSggc2VsZWN0aW9uICkpIHtcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKCBzZWxlY3Rpb24gKTtcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IGtleXMubGVuZ3RoOyArK2opIHtcbiAgICAgIGZpZWxkc1sga2V5c1sgaiBdIF0gPSBzZWxlY3Rpb25bIGtleXNbIGogXSBdO1xuICAgIH1cbiAgICByZXR1cm4gZmllbGRzO1xuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBzZWxlY3QoKSBhcmd1bWVudC4gTXVzdCBiZSBzdHJpbmcgb3Igb2JqZWN0LicpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB1dGlscztcbiJdfQ==
(1)
});
