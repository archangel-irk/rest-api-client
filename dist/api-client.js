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

  /**
   * https://github.com/aheckmann/mquery/blob/master/lib/mquery.js
   * mquery.select
   *
   * Specifies which document fields to include or exclude
   *
   * ####String syntax
   *
   * When passing a string, prefixing a path with `-` will flag that path as excluded. When a path does not have the `-` prefix, it is included.
   *
   * ####Example
   *
   *     // include a and b, exclude c
   *     query.select('a b -c');
   *
   *     // or you may use object notation, useful when
   *     // you have keys already prefixed with a "-"
   *     query.select({a: 1, b: 1, c: 0});
   *
   * ####Note
   *
   * Cannot be used with `distinct()`
   *
   * @param {Object|String} arg
   * @return {Query} this
   * @see SchemaType
   * @api public
   */
  transformFields: function select () {
    var arg = arguments[0];
    if (!arg) return this;

    if (arguments.length !== 1) {
      throw new Error('Invalid select: select only takes 1 argument');
    }

    var fields = this._fields || (this._fields = {});
    var type = typeof arg;

    if ('string' == type || 'object' == type && 'number' == typeof arg.length && !Array.isArray(arg)) {
      if ('string' == type)
        arg = arg.split(/\s+/);

      for (var i = 0, len = arg.length; i < len; ++i) {
        var field = arg[i];
        if (!field) continue;
        var include = '-' == field[0] ? 0 : 1;
        if (include === 0) field = field.substring(1);
        fields[field] = include;
      }

      return this;
    }

    if (_.isObject(arg) && !Array.isArray(arg)) {
      var keys = Object.keys(arg);
      for (var i = 0; i < keys.length; ++i) {
        fields[keys[i]] = arg[keys[i]];
      }
      return this;
    }

    throw new TypeError('Invalid select() argument. Must be string or object.');
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

      //#example    vs.api.places({fields: 'name', skip: 100}).get(function(res){console.log(res)});
      // Если была выборка по полям, нужно правильно обработать её и передать в документ
      if ( data && data.fields ){
        fields = resource.transformFields( data.fields );
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
 * Создать новый экземпляр api клиента
 *
 * @example
 * ApiClient('/api', {
 *   hooks: {
 *     headers: {
 *       token: 'XXXXXX'
 *     }
 *   }
 * });
 *
 * ApiClient('https://domain.com/api', {
 *   hooks: {
 *     headers: {
 *       token: 'XXXXXX'
 *     }
 *   }
 * });
 *
 * ApiClient({
 *   url: '/api'
 *   hooks: {
 *     headers: {
 *       token: 'XXXXXX'
 *     }
 *   }
 * });
 *
 * @param url ссылка на корень api
 * @param options опции для клиента
 */
function ApiClient( url, options ){
  if ( !(this instanceof ApiClient) ) {
    return new ApiClient( url, options );
  }

  // Если первым агументом передан объект
  if ( _.isObject( url ) ){
    options = url;
    url = location.origin;
  }

  if ( url == null ){
    url = location.origin;
  }

  options = options || {};
  options.url = url;

  // По умолчанию, уведомления отключены
  this.notifications = false;

  /**
   * Хуки для ajax settings (выступает в роли базового ajaxSettings)
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
   * Отправить запрос на сервер
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
  },

  /**
   * Метод для чтения корня api
   * todo: сделать алиас на метод .get()
   *
   * @param ajaxSettings
   * @param done
   * @returns {$.Deferred}
   */
  read: function( ajaxSettings, done ){
    console.log( 'api::read' );
    if ( $.isFunction( ajaxSettings ) ){
      done = ajaxSettings;
      ajaxSettings = undefined;
    }

    ajaxSettings = ajaxSettings || {};

    return this._request('read', this.url, undefined, ajaxSettings, false, done );
  }
};

ApiClient.version = '0.2.0';

// exports
module.exports = ApiClient;
},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9yZXN0LWFwaS1jbGllbnQvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3Jlc3QtYXBpLWNsaWVudC9zcmMvZmFrZV83NjE2ODI0ZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIEFQSSBDbGllbnRcbi8vIC0tLS0tLS0tLS0tLS0tLVxuXG4vLyBFeGFtcGxlXG4vKlxuIHZhciBnaXRodWIgPSBBcGlDbGllbnQoJ2h0dHBzOi8vYXBpLmdpdGh1Yi5jb20nLCB7XG4gICBob29rczoge1xuICAgICBoZWFkZXJzOiB7XG4gICAgICAgQWNjZXB0OiAnYXBwbGljYXRpb24vdm5kLmdpdGh1Yi52Mytqc29uJyxcbiAgICAgICBBdXRob3JpemF0aW9uOiAndG9rZW4gOGZiZmM1NDBmMWVkMTQxNzA4M2M3MGE5OTBiNGRiM2M5YWE4NmVmZSdcbiAgICAgfVxuICAgfVxuIH0pO1xuXG4gZ2l0aHViLmFkZCgnc2VhcmNoJywge1xuICBzZWFyY2hNZXRob2Q6IGZ1bmN0aW9uKCl7XG4gICAgY29uc29sZS5sb2coICdzZWFyY2g6OnNlYXJjaE1ldGhvZCcgKTtcbiAgfVxuIH0pO1xuIGdpdGh1Yi5zZWFyY2guYWRkKCd1c2VycycsIHtcbiAgdXNlcnNNZXRob2Q6IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5wYXJlbnQuc2VhcmNoTWV0aG9kKCk7XG4gIH1cbiB9KTtcblxuIC8vINCU0L7QsdCw0LLQu9GP0LXQvCDRgNC10YHRg9GA0YHRi1xuIGdpdGh1Yi5hZGQoJ3VzZXInKTtcbiBnaXRodWIuYWRkKCd1c2VycycpO1xuIGdpdGh1Yi51c2Vycy5hZGQoJ3JlcG9zJyk7XG5cbiAvLyDQn9GA0L7Rh9C40YLQsNGC0Ywg0YDQtdC/0L7Qt9C40YLQvtGA0LjQuCAo0L7RgtC/0YDQsNCy0LjRgtGMINCz0LXRgiDQt9Cw0L/RgNC+0YEg0L3QsCBodHRwczovL2FwaS5naXRodWIuY29tL3VzZXJzL3JlcG9zLylcbiBnaXRodWIudXNlcnMucmVwb3MucmVhZCgpO1xuXG4gLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gLy8g0J3QtSDRgdC+0LLRgdC10LwgUkVTVCwg0LLRgdC1INC30LDQv9GA0L7RgdGLINC40LTRg9GCINC90LAg0L7QtNC40L0g0LDQtNGA0LXRgVxuIHZhciBzaW1wbGVBcGkgPSBBcGlDbGllbnQoJ2FwaS5leGFtcGxlLmNvbScsIHt9KTtcblxuIHNpbXBsZUFwaSgpLnJlYWQoe1xuICBlOiAnL0Jhc2UvRGVwYXJ0bWVudCdcbiB9KTtcblxuIHNpbXBsZUFwaS5wb3N0KHsgZGF0YSB9KTtcbiBzaW1wbGVBcGkoJ2lkZW50aXR5JykucG9zdCh7IGRhdGEgfSwgeyBhamF4U2V0dGluZ3MgfSk7XG4gc2ltcGxlQXBpKCdpZGVudGl0eScpLnBvc3QoIG51bGwsIHsgYWpheFNldHRpbmdzIH0pO1xuIHNpbXBsZUFwaS5wb3N0KHsgZGF0YSB9LCB7IGFqYXhTZXR0aW5ncyB9KTtcbiBzaW1wbGVBcGkucG9zdCggbnVsbCwgeyBhamF4U2V0dGluZ3MgfSk7XG5cbiBzaW1wbGVBcGkucmVhZCggZG9uZSApLmRvbmUoIGRvbmUgKS5mYWlsKCBmYWlsICk7XG5cbiDQoNCw0LHQvtGC0LAg0YEg0LTQvtC60YPQvNC10L3RgtCw0LzQuCAoc3RvcmFnZSksINC+0L0g0YHQsNC8INC/0YDQtdC+0LHRgNCw0LfRg9C10YLRgdGPINGH0LXRgNC10Lcg0LzQtdGC0L7QtCAkX19kZWx0YSgpXG4gc2ltcGxlQXBpLnBvc3QoIERvY3VtZW50ICk7XG4gc2ltcGxlQXBpLnNhdmUoIERvY3VtZW50ICk7XG5cblxuIC8vINCk0LjRh9C4XG4gYWpheFNldHRpbmdzINC00LvRjyDQutCw0LbQtNC+0LPQviDQt9Cw0L/RgNC+0YHQsFxuIElkZW50aXR5INC00LvRjyDQutCw0LbQtNC+0LPQviDQt9Cw0L/RgNC+0YHQsFxuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmVzb3VyY2VNaXhpbiA9IHtcbiAgcmVzb3VyY2VOYW1lOiAncmVzb3VyY2UnLFxuICB1cmw6ICcnLCAvLyA9IHJlc291cmNlTmFtZVxuXG4gIC8qKlxuICAgKiDQlNC+0LHQsNCy0LjRgtGMINC90L7QstGL0Lkg0YDQtdGB0YPRgNGBXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSByZXNvdXJjZU5hbWVcbiAgICogQHBhcmFtIHtvYmplY3R9IFtwYXJlbnRSZXNvdXJjZV0gLSDRgNC+0LTQuNGC0LXQu9GM0YHQutC40Lkg0YDQtdGB0YPRgNGBXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbdXNlcnNNaXhpbl0gLSDQv9C+0LvRjNC30L7QstCw0YLQtdC70YzRgdC60LDRjyDQv9GA0LjQvNC10YHRjFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGFkZDogZnVuY3Rpb24oIHJlc291cmNlTmFtZSwgcGFyZW50UmVzb3VyY2UsIHVzZXJzTWl4aW4gKXtcbiAgICBpZiAoICF1c2Vyc01peGluICkge1xuICAgICAgdXNlcnNNaXhpbiA9IHBhcmVudFJlc291cmNlIHx8IHt9O1xuICAgICAgcGFyZW50UmVzb3VyY2UgPSB0aGlzO1xuICAgIH1cblxuICAgIC8vINCR0YDQvtGB0LjRgtGMINC40YHQutC70Y7Rh9C10L3QuNC1LCDQtdGB0LvQuCDRgtCw0LrQvtC5INGA0LXRgdGD0YDRgSDRg9C20LUg0LXRgdGC0YxcbiAgICBpZiAoIHRoaXNbIHJlc291cmNlTmFtZSBdICl7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgcmVzb3VyY2UgbmFtZWQgJyArIHJlc291cmNlTmFtZSArICdhbHJlYWR5IGV4aXN0cy4nKTtcbiAgICB9XG5cbiAgICAvLyDQm9GO0LHQvtC5INC40Lcg0Y3RgtC40YUg0L/QsNGA0LDQvNC10YLRgNC+0LIg0YPQutCw0LfRi9Cy0LDQtdGCINC90LAg0L3QtdC+0LHRhdC+0LTQuNC80L7RgdGC0Ywg0LjRgdC/0L7Qu9GM0LfQvtCy0LDRgtGMINGF0YDQsNC90LjQu9C40YnQtVxuICAgIGlmICggdXNlcnNNaXhpbi5zY2hlbWFOYW1lIHx8IHVzZXJzTWl4aW4uY29sbGVjdGlvbk5hbWUgfHwgdXNlcnNNaXhpbi5zdG9yYWdlICkge1xuICAgICAgLy8g0J7Qv9GA0LXQtNC10LvQuNC8INC90LDQt9Cy0LDQvdC40LUg0YHQvtC30LTQsNCy0LDQtdC80L7QuSDQutC+0LvQu9C10LrRhtC40LhcbiAgICAgIHVzZXJzTWl4aW4uY29sbGVjdGlvbk5hbWUgPSB1c2Vyc01peGluLmNvbGxlY3Rpb25OYW1lIHx8IHJlc291cmNlTmFtZTtcbiAgICB9XG5cbiAgICAvLyDQn9C10YDQtdC0INGB0L7Qt9C00LDQvdC40LXQvCDQutC+0LvQu9C10LrRhtC40Lgg0L3Rg9C20L3QviDRgdC+0LfQtNCw0YLRjCDRgNC10YHRg9GA0YEsINGH0YLQvtCx0Ysg0YMg0LrQvtC70LvQtdC60YbQuNC4INCx0YvQu9CwINGB0YHRi9C70LrQsCDQvdCwINC90LXQs9C+XG4gICAgdGhpc1sgcmVzb3VyY2VOYW1lIF0gPSBuZXcgUmVzb3VyY2UoIHJlc291cmNlTmFtZSwgcGFyZW50UmVzb3VyY2UsIHVzZXJzTWl4aW4gKTtcblxuICAgIC8vINCh0L7Qt9C00LDRgtGMINC60L7Qu9C70LXQutGG0LjRjiwg0LXRgdC70Lgg0Y3RgtC+0LPQviDQtdGJ0LUg0L3QtSDRgdC00LXQu9Cw0LvQuFxuICAgIGlmICggdXNlcnNNaXhpbi5jb2xsZWN0aW9uTmFtZSAmJiAhc3RvcmFnZVsgdXNlcnNNaXhpbi5jb2xsZWN0aW9uTmFtZSBdICl7XG4gICAgICAvLyDQmNGJ0LXQvCDRgdGF0LXQvNGDLCDQtdGB0LvQuCDQvtC90LAg0YPQutCw0LfQsNC90LBcbiAgICAgIHZhciBzY2hlbWEgPSBzdG9yYWdlLnNjaGVtYXNbIHVzZXJzTWl4aW4uc2NoZW1hTmFtZSBdO1xuXG4gICAgICBpZiAoIHNjaGVtYSApe1xuICAgICAgICBzdG9yYWdlLmNyZWF0ZUNvbGxlY3Rpb24oIHVzZXJzTWl4aW4uY29sbGVjdGlvbk5hbWUsIHNjaGVtYSwgdGhpc1sgcmVzb3VyY2VOYW1lIF0gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Jlc291cmNlOjonICsgcmVzb3VyY2VOYW1lICsgJyBZb3UgY2Fubm90IHVzZSBzdG9yYWdlIChjcmVhdGUgY29sbGVjdGlvbiksIHdpdGhvdXQgc3BlY2lmeWluZyB0aGUgc2NoZW1hIG9mIHRoZSBkYXRhLicpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzWyByZXNvdXJjZU5hbWUgXTtcbiAgfSxcblxuICAvKipcbiAgICogaHR0cHM6Ly9naXRodWIuY29tL2FoZWNrbWFubi9tcXVlcnkvYmxvYi9tYXN0ZXIvbGliL21xdWVyeS5qc1xuICAgKiBtcXVlcnkuc2VsZWN0XG4gICAqXG4gICAqIFNwZWNpZmllcyB3aGljaCBkb2N1bWVudCBmaWVsZHMgdG8gaW5jbHVkZSBvciBleGNsdWRlXG4gICAqXG4gICAqICMjIyNTdHJpbmcgc3ludGF4XG4gICAqXG4gICAqIFdoZW4gcGFzc2luZyBhIHN0cmluZywgcHJlZml4aW5nIGEgcGF0aCB3aXRoIGAtYCB3aWxsIGZsYWcgdGhhdCBwYXRoIGFzIGV4Y2x1ZGVkLiBXaGVuIGEgcGF0aCBkb2VzIG5vdCBoYXZlIHRoZSBgLWAgcHJlZml4LCBpdCBpcyBpbmNsdWRlZC5cbiAgICpcbiAgICogIyMjI0V4YW1wbGVcbiAgICpcbiAgICogICAgIC8vIGluY2x1ZGUgYSBhbmQgYiwgZXhjbHVkZSBjXG4gICAqICAgICBxdWVyeS5zZWxlY3QoJ2EgYiAtYycpO1xuICAgKlxuICAgKiAgICAgLy8gb3IgeW91IG1heSB1c2Ugb2JqZWN0IG5vdGF0aW9uLCB1c2VmdWwgd2hlblxuICAgKiAgICAgLy8geW91IGhhdmUga2V5cyBhbHJlYWR5IHByZWZpeGVkIHdpdGggYSBcIi1cIlxuICAgKiAgICAgcXVlcnkuc2VsZWN0KHthOiAxLCBiOiAxLCBjOiAwfSk7XG4gICAqXG4gICAqICMjIyNOb3RlXG4gICAqXG4gICAqIENhbm5vdCBiZSB1c2VkIHdpdGggYGRpc3RpbmN0KClgXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fFN0cmluZ30gYXJnXG4gICAqIEByZXR1cm4ge1F1ZXJ5fSB0aGlzXG4gICAqIEBzZWUgU2NoZW1hVHlwZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgdHJhbnNmb3JtRmllbGRzOiBmdW5jdGlvbiBzZWxlY3QgKCkge1xuICAgIHZhciBhcmcgPSBhcmd1bWVudHNbMF07XG4gICAgaWYgKCFhcmcpIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzZWxlY3Q6IHNlbGVjdCBvbmx5IHRha2VzIDEgYXJndW1lbnQnKTtcbiAgICB9XG5cbiAgICB2YXIgZmllbGRzID0gdGhpcy5fZmllbGRzIHx8ICh0aGlzLl9maWVsZHMgPSB7fSk7XG4gICAgdmFyIHR5cGUgPSB0eXBlb2YgYXJnO1xuXG4gICAgaWYgKCdzdHJpbmcnID09IHR5cGUgfHwgJ29iamVjdCcgPT0gdHlwZSAmJiAnbnVtYmVyJyA9PSB0eXBlb2YgYXJnLmxlbmd0aCAmJiAhQXJyYXkuaXNBcnJheShhcmcpKSB7XG4gICAgICBpZiAoJ3N0cmluZycgPT0gdHlwZSlcbiAgICAgICAgYXJnID0gYXJnLnNwbGl0KC9cXHMrLyk7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBhcmcubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgdmFyIGZpZWxkID0gYXJnW2ldO1xuICAgICAgICBpZiAoIWZpZWxkKSBjb250aW51ZTtcbiAgICAgICAgdmFyIGluY2x1ZGUgPSAnLScgPT0gZmllbGRbMF0gPyAwIDogMTtcbiAgICAgICAgaWYgKGluY2x1ZGUgPT09IDApIGZpZWxkID0gZmllbGQuc3Vic3RyaW5nKDEpO1xuICAgICAgICBmaWVsZHNbZmllbGRdID0gaW5jbHVkZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgaWYgKF8uaXNPYmplY3QoYXJnKSAmJiAhQXJyYXkuaXNBcnJheShhcmcpKSB7XG4gICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGFyZyk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgZmllbGRzW2tleXNbaV1dID0gYXJnW2tleXNbaV1dO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBzZWxlY3QoKSBhcmd1bWVudC4gTXVzdCBiZSBzdHJpbmcgb3Igb2JqZWN0LicpO1xuICB9LFxuXG4gIC8vINCf0YDQvtCx0LXQttCw0YLRjNGB0Y8g0L/QviDQstGB0LXQvCDRgNC+0LTQuNGC0LXQu9GM0YHQutC40Lwg0YDQtdGB0YPRgNGB0LDQvCDQuCDRgdC+0LHRgNCw0YLRjCB1cmwgKNCx0LXQtyBxdWVyeSBzdHJpbmcpXG4gIGNvbnN0cnVjdFVybDogZnVuY3Rpb24gY29uc3RydWN0VXJsKCByZWN1cnNpb25DYWxsICl7XG4gICAgLy8gdG9kbzog0L/RgNC+0LLQtdGA0LjRgtGMINC90LDQtNC+0LHQvdC+0YHRgtGMINC30LDQutC+0LzQvNC10L3RgtC40YDQvtCy0LDQvdC90L7Qs9C+INC60L7QtNCwXG4gICAgLy8gdHJhaWxpbmdTbGFzaCAtINC+0L0g0LjQvdC+0LPQtNCwINC90YPQttC10L0sINGB0LTQtdC70LDRgtGMINC60L7QvdGE0LjQs1xuICAgIC8vINGD0YHQu9C+0LLQuNC1INGBIHJlY3Vyc2lvbkNhbGwg0LTQvtCx0LDQstC70Y/QtdGCINGB0LvRjdGIINCyINGD0YDQuyDQv9C10YDQtdC0INC30L3QsNC60L7QvCDQstC+0L/RgNC+0YHQsFxuICAgIC8vdmFyIGlkZW50aXR5ID0gdGhpcy5pZGVudGl0eSA/ICcvJyArIHRoaXMuaWRlbnRpdHkgOiByZWN1cnNpb25DYWxsID8gJycgOiAnLyc7XG4gICAgdmFyIGlkZW50aXR5ID0gdGhpcy5pZGVudGl0eSA/ICcvJyArIHRoaXMuaWRlbnRpdHkgOiAnJztcblxuICAgIC8vINCf0YDQvtCx0LXQttCw0YLRjNGB0Y8g0L/QviDQstGB0LXQvCDRgNC10YHRg9GA0YHQsNC8INC4INC30LDQs9C70Y/QvdGD0YLRjCDQsiDQutC+0YDQtdC90Ywg0LDQv9C4LCDRh9GC0L7QsdGLINGB0L7QsdGA0LDRgtGMIHVybFxuICAgIHJldHVybiB0aGlzLnBhcmVudFJlc291cmNlXG4gICAgICA/IGNvbnN0cnVjdFVybC5jYWxsKCB0aGlzLnBhcmVudFJlc291cmNlLCB0cnVlICkgKyAnLycgKyB0aGlzLnVybCArIGlkZW50aXR5XG4gICAgICA6IHRoaXMudXJsO1xuICB9LFxuXG4gIF9yZXNvdXJjZVJlcXVlc3Q6IGZ1bmN0aW9uKCBtZXRob2QsIGFqYXhTZXR0aW5ncywgZG9uZSApe1xuICAgIHZhciB1cmwgPSB0aGlzLmNvbnN0cnVjdFVybCgpXG4gICAgICAsIHVzZU5vdGlmaWNhdGlvbnMgPSB0aGlzLm5vdGlmaWNhdGlvbnM7XG5cbiAgICBjb25zb2xlLmxvZyggdGhpcy5yZXNvdXJjZU5hbWUgKyAnOjonICsgbWV0aG9kICsgJyAnICsgdXJsICk7XG4gICAgcmV0dXJuIHRoaXMuaW5zdGFuY2UuX3JlcXVlc3QoIG1ldGhvZCwgdXJsLCBhamF4U2V0dGluZ3MuZGF0YSwgYWpheFNldHRpbmdzLCB1c2VOb3RpZmljYXRpb25zLCBkb25lICk7XG4gIH1cbn07XG5cbnZhciByZXF1ZXN0c1RhYmxlID0gW107XG5cbnZhciBtZXRob2RzTWFwID0ge1xuICAnY3JlYXRlJzogJ1BPU1QnLFxuICAncmVhZCc6ICAgJ0dFVCcsXG4gICd1cGRhdGUnOiAnUFVUJyxcbiAgJ2RlbGV0ZSc6ICdERUxFVEUnLFxuICAncGF0Y2gnOiAgJ1BBVENIJyxcblxuICAncG9zdCc6ICAgJ1BPU1QnLFxuICAnZ2V0JzogICAgJ0dFVCcsXG4gICdzYXZlJzogICAnUFVUJ1xufTtcblxuXy5mb3JFYWNoKCBPYmplY3Qua2V5cyggbWV0aG9kc01hcCApLCBmdW5jdGlvbiggdmVyYiApe1xuICAvKipcbiAgICog0JfQsNC/0YDQvtGB0YsgY3JlYXRlIHJlYWQgdXBkYXRlIGRlbGV0ZSBwYXRjaCBnZXQgcG9zdFxuICAgKlxuICAgKiDQkiBhamF4U2V0dGluZ3Mg0LzQvtC20L3QviDRg9C60LDQt9Cw0YLRjCDQv9C+0LvQtSBkb05vdFN0b3JlIC0g0YfRgtC+0LHRiyDQvdC1INGB0L7RhdGA0LDQvdGP0YLRjCDQv9C+0LvRg9GH0LXQvdC90YvQuSDQvtCx0YrQtdC60YIg0LIgc3RvcmFnZVxuICAgKlxuICAgKiBAcGFyYW0gW2RhdGFdXG4gICAqIEBwYXJhbSBbYWpheFNldHRpbmdzXVxuICAgKiBAcGFyYW0gW2RvbmVdXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgcmVzb3VyY2VNaXhpblsgdmVyYiBdID0gZnVuY3Rpb24oIGRhdGEsIGFqYXhTZXR0aW5ncywgZG9uZSApe1xuICAgIHZhciByZXNvdXJjZSA9IHRoaXMsXG4gICAgICBpZGVudGl0eSA9IHRoaXMuaWRlbnRpdHksXG4gICAgICBtZXRob2QgPSB0aGlzLmluc3RhbmNlLm1ldGhvZHNNYXBbIHZlcmJdLFxuICAgICAgZG9jdW1lbnRJZFN0cmluZztcblxuICAgIC8vINCV0YHQu9C4IGRhdGEgLSDQtdGB0YLRjCDRhNGD0L3QutGG0LjRjywg0YLQviDRjdGC0L4gZG9uZVxuICAgIGlmICggJC5pc0Z1bmN0aW9uKCBkYXRhICkgKXtcbiAgICAgIGRvbmUgPSBkYXRhO1xuICAgICAgZGF0YSA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgaWYgKCAkLmlzRnVuY3Rpb24oIGFqYXhTZXR0aW5ncyApICl7XG4gICAgICBkb25lID0gYWpheFNldHRpbmdzO1xuICAgICAgYWpheFNldHRpbmdzID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGFqYXhTZXR0aW5ncyA9IGFqYXhTZXR0aW5ncyB8fCB7fTtcblxuICAgIC8vINCf0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuCDQtNC+0LrRg9C80LXQvdGC0LAg0L3Rg9C20L3QviDRgdC+0YXRgNCw0L3Rj9GC0Ywg0YLQvtC70YzQutC+INC40LfQvNC10L3RkdC90L3Ri9C1INC/0L7Qu9GPXG4gICAgaWYgKCBtZXRob2QgPT09ICdQT1NUJyB8fCBtZXRob2QgPT09ICdQVVQnICl7XG4gICAgICAvLyDQmNC90L7Qs9C00LAg0L/QtdGA0LXQtNCw0Y7RgiDQtNC+0LrRg9C80LXQvdGCXG4gICAgICBpZiAoIGRhdGEgaW5zdGFuY2VvZiBzdG9yYWdlLkRvY3VtZW50ICkge1xuICAgICAgICBkb2N1bWVudElkU3RyaW5nID0gZGF0YS5faWQudG9TdHJpbmcoKTtcbiAgICAgICAgZGF0YSA9IGRhdGEuJF9fZGVsdGEoKTtcblxuICAgICAgICAvLyDQotCw0Log0LzQvtC20L3QviDQv9C+0L3Rj9GC0YwsINGH0YLQviDQvNGLINGB0L7RhdGA0LDQvdGP0LXQvCDRgdGD0YnQtdGC0LLRg9GO0YnQuNC5INC90LAg0YHQtdGA0LLQtdGA0LUgRG9jdW1lbnRcbiAgICAgIH0gZWxzZSBpZiAoIHN0b3JhZ2UuT2JqZWN0SWQuaXNWYWxpZCggaWRlbnRpdHkgKSApIHtcbiAgICAgICAgZG9jdW1lbnRJZFN0cmluZyA9IGlkZW50aXR5O1xuXG4gICAgICAgIC8vINCf0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuCDRh9C10YDQtdC3INC80LXRgtC+0LQgc2F2ZSgpINGDINC00L7QutGD0LzQtdC90YLQsFxuICAgICAgfSBlbHNlIGlmICggZGF0YS5faWQgJiYgc3RvcmFnZS5PYmplY3RJZC5pc1ZhbGlkKCBkYXRhLl9pZCApICkge1xuICAgICAgICBkb2N1bWVudElkU3RyaW5nID0gZGF0YS5faWQudG9TdHJpbmcoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBhamF4U2V0dGluZ3MuZGF0YSA9IGRhdGE7XG5cbiAgICB2YXIgcmVxSW5mbyA9IHtcbiAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgdXJsOiB0aGlzLmNvbnN0cnVjdFVybCgpLFxuICAgICAgYWpheFNldHRpbmdzOiBhamF4U2V0dGluZ3MsXG4gICAgICByZXN1bHQ6IG51bGwsXG4gICAgICBtZXRhOiBudWxsXG4gICAgfTtcblxuICAgIC8vVE9ETzog0LTQvtC00LXQu9Cw0YLRjCDQutGN0YjQuNGA0L7QstCw0L3QuNC1XG4gICAgLy8g0JrRjdGI0LjRgNC+0LLQsNC90LjQtSDQvdCwINGH0YLQtdC90LjQtVxuICAgIGlmICggbWV0aG9kID09PSAnR0VUJyApe1xuICAgICAgdmFyIGluQ2FjaGUgPSBfLmZpbmQoIHJlcXVlc3RzVGFibGUsIHJlcUluZm8gKTtcblxuICAgICAgaWYgKCByZXNvdXJjZS5zdG9yYWdlICYmIGlkZW50aXR5ICYmIGluQ2FjaGUgKXtcbiAgICAgICAgLy8g0JXRgdC70Lgg0LTQsNC90L3QvtC1INC10YHRgtGMIC0g0LLQtdGA0L3Rg9GC0Ywg0LXQs9C+XG4gICAgICAgIGlmICggaW5DYWNoZS5yZXN1bHQgKXtcbiAgICAgICAgICBkb25lICYmIGRvbmUoIGluQ2FjaGUucmVzdWx0LCBpbkNhY2hlLm1ldGEgKTtcbiAgICAgICAgICBjbGVhcklkZW50aXR5KCByZXNvdXJjZSApO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBkZmQgPSAkLkRlZmVycmVkKCk7XG4gICAgdGhpcy5fcmVzb3VyY2VSZXF1ZXN0KCB2ZXJiLCBhamF4U2V0dGluZ3MgKS5kb25lKGZ1bmN0aW9uKCByZXNwb25zZSwgdGV4dFN0YXR1cywganFYSFIgKXtcbiAgICAgIHZhciByZXN1bHQsIGZpZWxkcztcblxuICAgICAgLy8jZXhhbXBsZSAgICB2cy5hcGkucGxhY2VzKHtmaWVsZHM6ICduYW1lJywgc2tpcDogMTAwfSkuZ2V0KGZ1bmN0aW9uKHJlcyl7Y29uc29sZS5sb2cocmVzKX0pO1xuICAgICAgLy8g0JXRgdC70Lgg0LHRi9C70LAg0LLRi9Cx0L7RgNC60LAg0L/QviDQv9C+0LvRj9C8LCDQvdGD0LbQvdC+INC/0YDQsNCy0LjQu9GM0L3QviDQvtCx0YDQsNCx0L7RgtCw0YLRjCDQtdGRINC4INC/0LXRgNC10LTQsNGC0Ywg0LIg0LTQvtC60YPQvNC10L3RglxuICAgICAgaWYgKCBkYXRhICYmIGRhdGEuZmllbGRzICl7XG4gICAgICAgIGZpZWxkcyA9IHJlc291cmNlLnRyYW5zZm9ybUZpZWxkcyggZGF0YS5maWVsZHMgKTtcbiAgICAgIH1cblxuICAgICAgLy8g0JXRgdGC0Ywg0L7RgtCy0LXRgiDQvdCw0LTQviDRgdC+0YXRgNCw0L3QuNGC0Ywg0LIg0YXRgNCw0L3QuNC70LjRidC1XG4gICAgICBpZiAoIHJlc291cmNlLnN0b3JhZ2UgJiYgIWFqYXhTZXR0aW5ncy5kb05vdFN0b3JlICl7XG4gICAgICAgIC8vINCf0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuCDQuCDQvtCx0L3QvtCy0LvQtdC90LjQuCDQvdGD0LbQvdC+INC+0LHQvdC+0LLQu9GP0YLRjCDQtNC+0LrRg9C80LXQvdGCXG4gICAgICAgIGlmICggbWV0aG9kID09PSAnUE9TVCcgfHwgbWV0aG9kID09PSAnUFVUJyApe1xuICAgICAgICAgIC8vINCf0L7Qv9GA0L7QsdGD0LXQvCDRgdC90LDRh9Cw0LvQsCDQvdCw0LnRgtC4INC00L7QutGD0LzQtdC90YIg0L/QviBpZCDQuCDQvtCx0L3QvtCy0LjRgtGMINC10LPQvlxuICAgICAgICAgIHJlc3VsdCA9IHN0b3JhZ2VbIHJlc291cmNlLmNvbGxlY3Rpb25OYW1lIF0uZmluZEJ5SWQoIGRvY3VtZW50SWRTdHJpbmcgKTtcblxuICAgICAgICAgIGlmICggcmVzdWx0ICl7XG4gICAgICAgICAgICAvLyDQntCx0L3QvtCy0LvRj9C10Lwg0LTQvtC60YPQvNC10L3RglxuICAgICAgICAgICAgcmVzdWx0LnNldCggcmVzcG9uc2UucmVzdWx0ICk7XG5cbiAgICAgICAgICAgIC8vINCh0L7Qt9C00LDRkdC8INGB0YHRi9C70LrRgyDQv9C+INC90L7QstC+0LzRgyBpZCDQsiDQutC+0LvQu9C10LrRhtC40LhcbiAgICAgICAgICAgIHN0b3JhZ2VbIHJlc291cmNlLmNvbGxlY3Rpb25OYW1lIF0udXBkYXRlSWRMaW5rKCByZXN1bHQgKTtcblxuICAgICAgICAgICAgLy8g0K3RgtC+0YIg0LTQvtC60YPQvNC10L3RgiDRgtC10L/QtdGA0Ywg0YHQvtGF0YDQsNC90ZHQvSDQvdCwINGB0LXRgNCy0LXRgNC1LCDQt9C90LDRh9C40YIg0L7QvSDRg9C20LUg0L3QtSDQvdC+0LLRi9C5LlxuICAgICAgICAgICAgcmVzdWx0LmlzTmV3ID0gZmFsc2U7XG5cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0ID0gc3RvcmFnZVsgcmVzb3VyY2UuY29sbGVjdGlvbk5hbWUgXS5hZGQoIHJlc3BvbnNlLnJlc3VsdCB8fCByZXNwb25zZSwgdW5kZWZpbmVkLCB0cnVlICk7XG4gICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAoIG1ldGhvZCA9PT0gJ0dFVCcgKXtcbiAgICAgICAgICAvLyDQndC1INC00L7QsdCw0LLQu9GP0YLRjCDQsiDRhdGA0LDQvdC40LvQuNGJ0LUg0YDQtdC30YPQu9GM0YLQsNGCINC30LDQv9GA0L7RgdC+0LIg0YEg0LLRi9Cx0L7RgNC60L7QuSDQv9C+0LvQtdC5XG4gICAgICAgICAgaWYgKCBmaWVsZHMgKXtcbiAgICAgICAgICAgIHJlc3VsdCA9IHJlc3BvbnNlLnJlc3VsdDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0ID0gc3RvcmFnZVsgcmVzb3VyY2UuY29sbGVjdGlvbk5hbWUgXS5hZGQoIHJlc3BvbnNlLnJlc3VsdCB8fCByZXNwb25zZSwgZmllbGRzLCB0cnVlICk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHQgPSByZXNwb25zZS5yZXN1bHQgfHwgcmVzcG9uc2U7XG4gICAgICB9XG5cbiAgICAgIC8vINCh0L7RhdGA0LDQvdC40YLRjCDQv9Cw0YDQsNC80LXRgtGA0Ysg0LfQsNC/0YDQvtGB0LAg0Lgg0L7RgtCy0LXRgiDQtNC70Y8g0LrRjdGI0LjRgNC+0LLQsNC90LjRj1xuICAgICAgcmVxSW5mby5yZXN1bHQgPSByZXN1bHQ7XG4gICAgICByZXFJbmZvLm1ldGEgPSByZXNwb25zZS5tZXRhO1xuICAgICAgcmVxdWVzdHNUYWJsZS5wdXNoKCByZXFJbmZvICk7XG5cbiAgICAgIGRvbmUgJiYgZG9uZSggcmVzdWx0LCByZXNwb25zZS5tZXRhICk7XG4gICAgICBkZmQucmVzb2x2ZSggcmVzdWx0LCByZXNwb25zZS5tZXRhLCB0ZXh0U3RhdHVzLCBqcVhIUiApO1xuXG4gICAgfSkuZmFpbChmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICl7XG4gICAgICBkZmQucmVqZWN0KCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKTtcbiAgICB9KTtcblxuICAgIC8vVE9ETzog0JjRgdC/0L7Qu9GM0LfQvtCy0LDRgtGMINC40LTQtdC+0LvQvtCz0Y4gcXVlcnk/IHF1ZXJ5INC+0LHRitC10LrRgiDQtNC70Y8g0L/QvtGB0YLRgNC+0LXQvdC40Y8g0LfQsNC/0YDQvtGB0L7QslxuXG4gICAgLy8gaWRlbnRpdHkg0YHQvtGF0YDQsNC90Y/QtdGC0YHRjyDQtNC70Y8gY29uc3RydWN0VXJsLCDQtdCz0L4g0L3Rg9C20L3QviDQvtGH0LjRgdGC0LjRgtGMINC00LvRjyDQv9C+0YHQu9C10LTRg9GO0YnQuNGFINC30LDQv9GA0L7RgdC+0LIuXG4gICAgY2xlYXJJZGVudGl0eSggcmVzb3VyY2UgKTtcblxuICAgIHJldHVybiBkZmQ7XG4gIH07XG59KTtcblxuLy8g0J7Rh9C40YHRgtC40YLRjCBpZGVudGl0eSDRgyDRgNC10YHRg9GA0YHQsCDQuCDQtdCz0L4g0YDQvtC00LjRgtC10LvRjNGB0LrQuNGFINGA0LXRgdGD0YDRgdC+0LIg0YLQvtC20LVcbmZ1bmN0aW9uIGNsZWFySWRlbnRpdHkoIHJlc291cmNlICl7XG4gIHdoaWxlICggcmVzb3VyY2UucGFyZW50UmVzb3VyY2UgKSB7XG4gICAgcmVzb3VyY2UuaWRlbnRpdHkgPSAnJztcbiAgICByZXNvdXJjZSA9IHJlc291cmNlLnBhcmVudFJlc291cmNlO1xuICB9XG59XG5cbi8qKlxuICog0JrQsNC6INCx0Ysg0LrQvtC90YHRgtGA0YPQutGC0L7RgCDRgNC10YHRg9GA0YHQsCwg0L3QviDQstC+0LfQstGA0LDRidCw0LXRgiDRhNGD0L3QutGG0LjRji3QvtCx0YrQtdC60YIg0YEg0L/RgNC40LzQtdGB0Y/QvNC4XG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHJlc291cmNlTmFtZVxuICogQHBhcmFtIHtvYmplY3R9IHBhcmVudFJlc291cmNlXG4gKiBAcGFyYW0ge29iamVjdH0gdXNlcnNNaXhpblxuICogQHJldHVybnMge0Z1bmN0aW9ufSByZXNvdXJjZVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFJlc291cmNlKCByZXNvdXJjZU5hbWUsIHBhcmVudFJlc291cmNlLCB1c2Vyc01peGluICl7XG5cbiAgLyoqXG4gICAqINCt0YLRgyDRhNGD0L3QutGG0LjRjiDQvNGLINC+0YLQtNCw0ZHQvCDQv9C+0LvRjNC30L7QstCw0YLQtdC70Y4g0LIg0LrQsNGH0LXRgdGC0LLQtSDQtNC+0YHRgtGD0L/QsCDQuiDRgNC10YHRg9GA0YHRgy5cbiAgICog0J7QvdCwINC/0L7Qt9Cy0L7Qu9GP0LXRgiDQt9Cw0LTQsNGC0YwgaWRlbnRpdHkg0LTQu9GPINC30LDQv9GA0L7RgdCwLlxuICAgKlxuICAgKiBAcGFyYW0gW2lkZW50aXR5XVxuICAgKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gICAqL1xuICB2YXIgcmVzb3VyY2UgPSBmdW5jdGlvbiByZXNvdXJjZSggaWRlbnRpdHkgKXtcbiAgICBpZiAoIGlkZW50aXR5ICYmICFfLmlzU3RyaW5nKCBpZGVudGl0eSApICl7XG4gICAgICBjb25zb2xlLmVycm9yKCdpZGVudGl0eSDQtNC+0LvQttC10L0g0LHRi9GC0Ywg0YHRgtGA0L7QutC+0LksINCwINC90LUnLCBpZGVudGl0eSApO1xuICAgIH1cblxuICAgIHJlc291cmNlLmlkZW50aXR5ID0gaWRlbnRpdHkgfHwgJyc7XG5cbiAgICByZXR1cm4gcmVzb3VyY2U7XG4gIH07XG5cbiAgJC5leHRlbmQoIHJlc291cmNlLCByZXNvdXJjZU1peGluLCB7XG4gICAgcmVzb3VyY2VOYW1lOiByZXNvdXJjZU5hbWUsXG4gICAgdXJsOiByZXNvdXJjZU5hbWVcbiAgfSwgdXNlcnNNaXhpbiApO1xuXG4gIHJlc291cmNlLnBhcmVudFJlc291cmNlID0gcGFyZW50UmVzb3VyY2U7XG4gIHJlc291cmNlLmluc3RhbmNlID0gcGFyZW50UmVzb3VyY2UuaW5zdGFuY2UgfHwgcGFyZW50UmVzb3VyY2U7XG5cbiAgcmV0dXJuIHJlc291cmNlO1xufVxuXG4vKipcbiAqINCh0L7Qt9C00LDRgtGMINC90L7QstGL0Lkg0Y3QutC30LXQvNC/0LvRj9GAIGFwaSDQutC70LjQtdC90YLQsFxuICpcbiAqIEBleGFtcGxlXG4gKiBBcGlDbGllbnQoJy9hcGknLCB7XG4gKiAgIGhvb2tzOiB7XG4gKiAgICAgaGVhZGVyczoge1xuICogICAgICAgdG9rZW46ICdYWFhYWFgnXG4gKiAgICAgfVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiBBcGlDbGllbnQoJ2h0dHBzOi8vZG9tYWluLmNvbS9hcGknLCB7XG4gKiAgIGhvb2tzOiB7XG4gKiAgICAgaGVhZGVyczoge1xuICogICAgICAgdG9rZW46ICdYWFhYWFgnXG4gKiAgICAgfVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiBBcGlDbGllbnQoe1xuICogICB1cmw6ICcvYXBpJ1xuICogICBob29rczoge1xuICogICAgIGhlYWRlcnM6IHtcbiAqICAgICAgIHRva2VuOiAnWFhYWFhYJ1xuICogICAgIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogQHBhcmFtIHVybCDRgdGB0YvQu9C60LAg0L3QsCDQutC+0YDQtdC90YwgYXBpXG4gKiBAcGFyYW0gb3B0aW9ucyDQvtC/0YbQuNC4INC00LvRjyDQutC70LjQtdC90YLQsFxuICovXG5mdW5jdGlvbiBBcGlDbGllbnQoIHVybCwgb3B0aW9ucyApe1xuICBpZiAoICEodGhpcyBpbnN0YW5jZW9mIEFwaUNsaWVudCkgKSB7XG4gICAgcmV0dXJuIG5ldyBBcGlDbGllbnQoIHVybCwgb3B0aW9ucyApO1xuICB9XG5cbiAgLy8g0JXRgdC70Lgg0L/QtdGA0LLRi9C8INCw0LPRg9C80LXQvdGC0L7QvCDQv9C10YDQtdC00LDQvSDQvtCx0YrQtdC60YJcbiAgaWYgKCBfLmlzT2JqZWN0KCB1cmwgKSApe1xuICAgIG9wdGlvbnMgPSB1cmw7XG4gICAgdXJsID0gbG9jYXRpb24ub3JpZ2luO1xuICB9XG5cbiAgaWYgKCB1cmwgPT0gbnVsbCApe1xuICAgIHVybCA9IGxvY2F0aW9uLm9yaWdpbjtcbiAgfVxuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBvcHRpb25zLnVybCA9IHVybDtcblxuICAvLyDQn9C+INGD0LzQvtC70YfQsNC90LjRjiwg0YPQstC10LTQvtC80LvQtdC90LjRjyDQvtGC0LrQu9GO0YfQtdC90YtcbiAgdGhpcy5ub3RpZmljYXRpb25zID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqINCl0YPQutC4INC00LvRjyBhamF4IHNldHRpbmdzICjQstGL0YHRgtGD0L/QsNC10YIg0LIg0YDQvtC70Lgg0LHQsNC30L7QstC+0LPQviBhamF4U2V0dGluZ3MpXG4gICAqIEBzZWUgaHR0cDovL2FwaS5qcXVlcnkuY29tL2pRdWVyeS5hamF4L1xuICAgKlxuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKi9cbiAgdGhpcy5ob29rcyA9IHtcbiAgICAvLyDQtNC+0L/QvtC70L3QuNGC0LXQu9GM0L3Ri9C1INC00LDQvdC90YvQtSDQt9Cw0L/RgNC+0YHQsFxuICAgIGRhdGE6IHt9LFxuICAgIC8vINCe0LHRitC10LrRgiDQtNC70Y8g0LTQvtCx0LDQstC70LXQvdC40Y8g0L/RgNC+0LjQt9Cy0L7Qu9GM0L3Ri9GFINC30LDQs9C+0LvQvtCy0LrQvtCyINC60L4g0LLRgdC10Lwg0LfQsNC/0YDQvtGB0LDQvFxuICAgIC8vINGD0LTQvtCx0L3QviDQtNC70Y8g0LDQstGC0L7RgNC40LfQsNGG0LjQuCDQv9C+INGC0L7QutC10L3QsNC8XG4gICAgaGVhZGVyczoge31cbiAgfTtcblxuICAkLmV4dGVuZCggdHJ1ZSwgdGhpcywgb3B0aW9ucyApO1xufVxuXG5BcGlDbGllbnQucHJvdG90eXBlID0ge1xuICAvKipcbiAgICog0JTQvtCx0LDQstC40YLRjCDQvdC+0LLRi9C5INGA0LXRgdGD0YDRgVxuICAgKiBAc2VlIHJlc291cmNlTWl4aW4uYWRkXG4gICAqL1xuICBhZGQ6IHJlc291cmNlTWl4aW4uYWRkLFxuXG4gIG1ldGhvZHNNYXA6IG1ldGhvZHNNYXAsXG5cbiAgX3ByZXBhcmVBamF4U2V0dGluZ3M6IGZ1bmN0aW9uKCBtZXRob2QsIHVybCwgZGF0YSwgYWpheFNldHRpbmdzICl7XG4gICAgdmFyIHR5cGUgPSB0aGlzLm1ldGhvZHNNYXBbIG1ldGhvZCBdXG4gICAgICAsIF9hamF4U2V0dGluZ3MgPSAkLmV4dGVuZCggdHJ1ZSwge30sIHRoaXMuaG9va3MsIGFqYXhTZXR0aW5ncywge1xuICAgICAgICB0eXBlOiB0eXBlLFxuICAgICAgICB1cmw6IHVybFxuICAgICAgfSk7XG5cbiAgICAvLyDQlNC+0LHQsNCy0LvRj9C10Lwg0LDQstGC0L7RgNC40LfQsNGG0LjRjiDQv9C+INGC0L7QutC10L3Rg1xuICAgIGlmICggdGhpcy50b2tlbiAmJiBhamF4U2V0dGluZ3MuaGVhZGVycyAmJiBhamF4U2V0dGluZ3MuaGVhZGVycy50b2tlbiA9PSBudWxsICl7XG4gICAgICBfYWpheFNldHRpbmdzLmhlYWRlcnMuQXV0aG9yaXphdGlvbiA9ICd0b2tlbiAnICsgdGhpcy50b2tlbjtcbiAgICB9XG5cbiAgICBpZiAoIHR5cGUgPT09ICdHRVQnICl7XG4gICAgICBfLmFzc2lnbiggX2FqYXhTZXR0aW5ncy5kYXRhLCBkYXRhICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vINCV0YHQu9C4INGB0L7RhdGA0LDQvdGP0LXQvCDQtNC+0LrRg9C80LXQvdGCLCDQvdGD0LbQvdC+INGB0LTQtdC70LDRgtGMIHRvT2JqZWN0KHtkZXBvcHVsYXRlOiAxfSlcbiAgICAgIGlmICggZGF0YSAmJiBkYXRhLmNvbnN0cnVjdG9yICYmIGRhdGEuY29uc3RydWN0b3IubmFtZSAmJiBkYXRhLmNvbnN0cnVjdG9yLm5hbWUgPT09ICdEb2N1bWVudCcgKXtcbiAgICAgICAgXy5hc3NpZ24oIF9hamF4U2V0dGluZ3MuZGF0YSwgZGF0YS50b09iamVjdCh7ZGVwb3B1bGF0ZTogMX0pICk7XG5cbiAgICAgIH0gZWxzZSBpZiAoIGRhdGEgKSB7XG4gICAgICAgIF8uYXNzaWduKCBfYWpheFNldHRpbmdzLmRhdGEsIGRhdGEgKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCBfYWpheFNldHRpbmdzLmRhdGEgJiYgX2FqYXhTZXR0aW5ncy5jb250ZW50VHlwZSA9PT0gJ2FwcGxpY2F0aW9uL2pzb24nICl7XG4gICAgICAgIF9hamF4U2V0dGluZ3MuZGF0YSA9IEpTT04uc3RyaW5naWZ5KCBfYWpheFNldHRpbmdzLmRhdGEgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyB0b2RvINC/0YDQvtCy0LXRgNGC0Ywg0L3QsNC00L7QsdC90L7RgdGC0Ywg0LrQvtC00LBcbiAgICAvLyDQmNGB0L/QvtC70YzQt9GD0LXRgtGB0Y8g0LTQu9GPINCw0LvQuNCw0YHQvtCyLCDQsiDQutC+0YLQvtGA0YvRhSDQstGC0L7RgNC+0Lkg0L/QsNGA0LDQvNC10YLRgCAtINC10YHRgtGMINC+0LHRitC10LrRgiDQvdCw0YHRgtGA0L7QtdC6XG4gICAgaWYgKCAkLmlzUGxhaW5PYmplY3QoIHVybCApICl7XG4gICAgICBjb25zb2xlLmluZm8oJ9CQ0YVAKtGC0YwsINC90YPQttC90YvQuSDQutC+0LQhISEhJyk7XG4gICAgICBfYWpheFNldHRpbmdzID0gdXJsO1xuICAgICAgZGVidWdnZXI7XG4gICAgfVxuXG4gICAgcmV0dXJuIF9hamF4U2V0dGluZ3M7XG4gIH0sXG5cbiAgLyoqXG4gICAqINCe0YLQv9GA0LDQstC40YLRjCDQt9Cw0L/RgNC+0YEg0L3QsCDRgdC10YDQstC10YBcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IG1ldGhvZCDQndCw0LfQstCw0L3QuNC1INC80LXRgtC+0LTQsCAoUE9TVCwgR0VULCBQVVQsIERFTEVURSwgUEFUQ0gpXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwg0J/QvtC70L3Ri9C5INGD0YDQuyDRgNC10YHRg9GA0YHQsFxuICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSDQntCx0YrQtdC60YIg0YEg0LTQsNC90L3Ri9C80Lgg0LTQu9GPINC30LDQv9GA0L7RgdCwXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBhamF4U2V0dGluZ3Mg0J7QsdGK0LXQutGCINGBINC90LDRgdGC0YDQvtC50LrQsNC80LhcbiAgICogQHBhcmFtIHtib29sZWFufSB1c2VOb3RpZmljYXRpb25zINCk0LvQsNCzLCDQuNGB0L/QvtC70YzQt9C+0LLQsNGC0Ywg0LvQuCDRg9Cy0LXQtNC+0LzQu9C10L3QuNGPXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGRvbmUg0KTRg9C90LrRhtC40Y8g0YPRgdC/0LXRiNC90L7Qs9C+INC+0LHRgNCw0YLQvdC+0LPQviDQstGL0LfQvtCy0LBcbiAgICogQHJldHVybnMgeyQuRGVmZXJyZWR9INCy0L7Qt9Cy0YDQsNGJ0LDQtdGCIGpxdWVyeSBhamF4INC+0LHRitC10LrRglxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3JlcXVlc3Q6IGZ1bmN0aW9uKCBtZXRob2QsIHVybCwgZGF0YSwgYWpheFNldHRpbmdzLCB1c2VOb3RpZmljYXRpb25zLCBkb25lICl7XG4gICAgaWYgKCAhXy5pc1N0cmluZyggbWV0aG9kICkgKXtcbiAgICAgIHRocm93IG5ldyBFcnJvcign0J/QsNGA0LDQvNC10YLRgCBgbWV0aG9kYCDQtNC+0LvQttC10L0g0LHRi9GC0Ywg0YHRgtGA0L7QutC+0LksINCwINC90LUgJywgbWV0aG9kICk7XG4gICAgfVxuXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgICAsIHR5cGUgPSB0aGlzLm1ldGhvZHNNYXBbIG1ldGhvZCBdXG4gICAgICAsIG5vdGlmaWNhdGlvblR5cGUgPSB0eXBlID09PSAnR0VUJyA/ICdsb2FkJyA6ICggdHlwZSA9PT0gJ1BPU1QnIHx8IHR5cGUgPT09ICdQVVQnIHx8IHR5cGUgPT09ICdQQVRDSCcgKSA/ICdzYXZlJyA6ICdkZWxldGUnXG4gICAgICAsIF9hamF4U2V0dGluZ3MgPSB0aGlzLl9wcmVwYXJlQWpheFNldHRpbmdzKCBtZXRob2QsIHVybCwgZGF0YSwgYWpheFNldHRpbmdzICk7XG5cbiAgICAvLyDQmNGB0L/QvtC70YzQt9C+0LLQsNGC0Ywg0LfQvdCw0YfQtdC90LjQtSDQv9C+INGD0LzQvtC70YfQsNC90LjRjiwg0LXRgdC70LggdXNlTm90aWZpY2F0aW9ucyDQvdC1INC30LDQtNCw0L1cbiAgICAvLyDRgtGD0YIg0LbQtSDQv9C+0YDQstC10YDRj9C10LwsINC/0L7QtNC60LvRjtGH0LXQvdGLINC70Lgg0YPQstC10LTQvtC80LvQtdC90LjRj1xuICAgIGlmICggXy5pc0Jvb2xlYW4oIHVzZU5vdGlmaWNhdGlvbnMgKSApe1xuICAgICAgdXNlTm90aWZpY2F0aW9ucyA9IHVzZU5vdGlmaWNhdGlvbnMgJiYgY2Yubm90aWZpY2F0aW9uO1xuICAgIH0gZWxzZSB7XG4gICAgICB1c2VOb3RpZmljYXRpb25zID0gdGhpcy5ub3RpZmljYXRpb25zICYmIGNmLm5vdGlmaWNhdGlvbjtcbiAgICB9XG5cbiAgICBpZiAoIHVzZU5vdGlmaWNhdGlvbnMgKXtcbiAgICAgIGNmLm5vdGlmaWNhdGlvblsgbm90aWZpY2F0aW9uVHlwZSBdLnNob3coKTtcbiAgICB9XG5cbiAgICByZXR1cm4gJC5hamF4KCBfYWpheFNldHRpbmdzICkuZmFpbChmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICl7XG4gICAgICBjb25zb2xlLndhcm4oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApO1xuXG4gICAgICAvLyBVbmF1dGhvcml6ZWQgQ2FsbGJhY2tcbiAgICAgIGlmICgganFYSFIuc3RhdHVzID09PSA0MDEgJiYgc2VsZi51bmF1dGhvcml6ZWRDYWxsYmFjayApe1xuICAgICAgICBzZWxmLnVuYXV0aG9yaXplZENhbGxiYWNrKCBqcVhIUiwgbWV0aG9kLCB1cmwsIGRhdGEsIGFqYXhTZXR0aW5ncywgZG9uZSApO1xuXG4gICAgICAgIC8vINCd0LUg0L/QvtC60LDQt9GL0LLQsNGC0Ywg0YHQvtC+0LHRidC10L3QuNC1INGBINC+0YjQuNCx0LrQvtC5INC/0YDQuCA0MDEsINC10YHQu9C4INCy0YHRkSDQv9C70L7RhdC+LCDRgtC+INGA0L7Rg9GC0LXRgCDRgdCw0Lwg0L/QtdGA0LXQutC40L3QtdGCINC90LAg0YTQvtGA0LzRgyDQstGF0L7QtNCwXG4gICAgICAgIGlmICggdXNlTm90aWZpY2F0aW9ucyApe1xuICAgICAgICAgIGNmLm5vdGlmaWNhdGlvblsgbm90aWZpY2F0aW9uVHlwZSBdLmhpZGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKCB1c2VOb3RpZmljYXRpb25zICl7XG4gICAgICAgIGNmLm5vdGlmaWNhdGlvblsgbm90aWZpY2F0aW9uVHlwZSBdLmZhaWwoKTtcbiAgICAgIH1cblxuICAgIH0pLmRvbmUoZnVuY3Rpb24oKXtcbiAgICAgIGlmICggdXNlTm90aWZpY2F0aW9ucyApe1xuICAgICAgICBjZi5ub3RpZmljYXRpb25bIG5vdGlmaWNhdGlvblR5cGUgXS5oaWRlKCk7XG4gICAgICB9XG4gICAgfSkuZG9uZSggZG9uZSApO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQnNC10YLQvtC0INC00LvRjyDRh9GC0LXQvdC40Y8g0LrQvtGA0L3RjyBhcGlcbiAgICogdG9kbzog0YHQtNC10LvQsNGC0Ywg0LDQu9C40LDRgSDQvdCwINC80LXRgtC+0LQgLmdldCgpXG4gICAqXG4gICAqIEBwYXJhbSBhamF4U2V0dGluZ3NcbiAgICogQHBhcmFtIGRvbmVcbiAgICogQHJldHVybnMgeyQuRGVmZXJyZWR9XG4gICAqL1xuICByZWFkOiBmdW5jdGlvbiggYWpheFNldHRpbmdzLCBkb25lICl7XG4gICAgY29uc29sZS5sb2coICdhcGk6OnJlYWQnICk7XG4gICAgaWYgKCAkLmlzRnVuY3Rpb24oIGFqYXhTZXR0aW5ncyApICl7XG4gICAgICBkb25lID0gYWpheFNldHRpbmdzO1xuICAgICAgYWpheFNldHRpbmdzID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGFqYXhTZXR0aW5ncyA9IGFqYXhTZXR0aW5ncyB8fCB7fTtcblxuICAgIHJldHVybiB0aGlzLl9yZXF1ZXN0KCdyZWFkJywgdGhpcy51cmwsIHVuZGVmaW5lZCwgYWpheFNldHRpbmdzLCBmYWxzZSwgZG9uZSApO1xuICB9XG59O1xuXG5BcGlDbGllbnQudmVyc2lvbiA9ICcwLjIuMCc7XG5cbi8vIGV4cG9ydHNcbm1vZHVsZS5leHBvcnRzID0gQXBpQ2xpZW50OyJdfQ==
(1)
});
