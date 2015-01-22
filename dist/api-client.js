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

 simpleApi.read(doneCallback).done(callback).fail(callback);

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
      throw new TypeError('Ресурс с названием ' + resourceName + 'уже есть.');
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
        throw new TypeError('Resource::' + resourceName + ' Нельзя использовать хранилище (создать коллекцию), не указав схему данных');
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
      throw new Error("Invalid select: select only takes 1 argument");
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

  _resourceRequest: function( method, ajaxSettings, doneCallback ){
    var url = this.constructUrl()
      , useNotifications = this.notifications;

    console.log( this.resourceName + '::' + method + ' ' + url );
    return this.instance._request( method, url, ajaxSettings.data, ajaxSettings, useNotifications, doneCallback );
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
   * @param [doneCallback]
   * @returns {*}
   */
  resourceMixin[ verb ] = function( data, ajaxSettings, doneCallback ){
    var resource = this,
      identity = this.identity,
      method = this.instance.methodsMap[ verb],
      documentIdString;

    // Если data - есть функция, то это doneCallback
    if ( $.isFunction( data ) ){
      doneCallback = data;
      data = undefined;
    }
    if ( $.isFunction( ajaxSettings ) ){
      doneCallback = ajaxSettings;
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
          doneCallback && doneCallback( inCache.result, inCache.meta );
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

      doneCallback && doneCallback( result, response.meta );
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
var Resource = function( resourceName, parentResource, usersMixin ){

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
};

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
 * @param url - ссылка на корень api
 * @param options - опции для клиента
 */
var ApiClient = function( url, options ){
  return new ApiClient.instance.init( url, options );
};

ApiClient.instance = ApiClient.prototype = {
  constructor: ApiClient,

  /**
   * Инициализация нового апи клиента
   * @param url
   * @param options
   */
  init: function( url, options ){
    if ( typeof url === 'string' ){
      options = options || {};
      options.url = url;
    }

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

    $.extend( true, this, $.isPlainObject( url ) ? url : options );
  },

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
      //Accept: 'application/vnd.github.preview'
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
   * @param {string} method   Название метода (POST, GET, PUT, DELETE, PATCH)
   * @param {string} url   Полный урл ресурса
   * @param {object} data   Объект с данными для запроса
   * @param {object} ajaxSettings   Объект с настройками
   * @param {boolean} useNotifications   Флаг, использовать ли уведомления
   * @param {function} doneCallback   Функция успешного обратного вызова
   * @returns {$.Deferred} возвращает jquery ajax объект
   *
   * @private
   */
  _request: function( method, url, data, ajaxSettings, useNotifications, doneCallback ){
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
        self.unauthorizedCallback( jqXHR, method, url, data, ajaxSettings, doneCallback );

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
    }).done( doneCallback );
  },

  /**
   * Метод для чтения корня api
   *
   * @param ajaxSettings
   * @param doneCallback
   * @returns {$.Deferred}
   */
  read: function( ajaxSettings, doneCallback ){
    console.log( 'api::read' );
    if ( $.isFunction( ajaxSettings ) ){
      doneCallback = ajaxSettings;
      ajaxSettings = undefined;
    }

    ajaxSettings = ajaxSettings || {};

    return this._request('read', this.url, undefined, ajaxSettings, false, doneCallback );
  }
};

ApiClient.instance.init.prototype = ApiClient.instance;

// exports
module.exports = ApiClient;
},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9yZXN0LWFwaS1jbGllbnQvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3Jlc3QtYXBpLWNsaWVudC9zcmMvZmFrZV84YzFjNzcxYS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBBUEkgQ2xpZW50XG4vLyAtLS0tLS0tLS0tLS0tLS1cblxuLy8gRXhhbXBsZVxuLypcbiB2YXIgZ2l0aHViID0gQXBpQ2xpZW50KCdodHRwczovL2FwaS5naXRodWIuY29tJywge1xuICAgaG9va3M6IHtcbiAgICAgaGVhZGVyczoge1xuICAgICAgIEFjY2VwdDogJ2FwcGxpY2F0aW9uL3ZuZC5naXRodWIudjMranNvbicsXG4gICAgICAgQXV0aG9yaXphdGlvbjogJ3Rva2VuIDhmYmZjNTQwZjFlZDE0MTcwODNjNzBhOTkwYjRkYjNjOWFhODZlZmUnXG4gICAgIH1cbiAgIH1cbiB9KTtcblxuIGdpdGh1Yi5hZGQoJ3NlYXJjaCcsIHtcbiAgc2VhcmNoTWV0aG9kOiBmdW5jdGlvbigpe1xuICAgIGNvbnNvbGUubG9nKCAnc2VhcmNoOjpzZWFyY2hNZXRob2QnICk7XG4gIH1cbiB9KTtcbiBnaXRodWIuc2VhcmNoLmFkZCgndXNlcnMnLCB7XG4gIHVzZXJzTWV0aG9kOiBmdW5jdGlvbigpe1xuICAgIHRoaXMucGFyZW50LnNlYXJjaE1ldGhvZCgpO1xuICB9XG4gfSk7XG5cbiAvLyDQlNC+0LHQsNCy0LvRj9C10Lwg0YDQtdGB0YPRgNGB0YtcbiBnaXRodWIuYWRkKCd1c2VyJyk7XG4gZ2l0aHViLmFkZCgndXNlcnMnKTtcbiBnaXRodWIudXNlcnMuYWRkKCdyZXBvcycpO1xuXG4gLy8g0J/RgNC+0YfQuNGC0LDRgtGMINGA0LXQv9C+0LfQuNGC0L7RgNC40LggKNC+0YLQv9GA0LDQstC40YLRjCDQs9C10YIg0LfQsNC/0YDQvtGBINC90LAgaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS91c2Vycy9yZXBvcy8pXG4gZ2l0aHViLnVzZXJzLnJlcG9zLnJlYWQoKTtcblxuIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuIC8vINCd0LUg0YHQvtCy0YHQtdC8IFJFU1QsINCy0YHQtSDQt9Cw0L/RgNC+0YHRiyDQuNC00YPRgiDQvdCwINC+0LTQuNC9INCw0LTRgNC10YFcbiB2YXIgc2ltcGxlQXBpID0gQXBpQ2xpZW50KCdhcGkuZXhhbXBsZS5jb20nLCB7fSk7XG5cbiBzaW1wbGVBcGkoKS5yZWFkKHtcbiAgZTogJy9CYXNlL0RlcGFydG1lbnQnXG4gfSk7XG5cbiBzaW1wbGVBcGkucG9zdCh7IGRhdGEgfSk7XG4gc2ltcGxlQXBpKCdpZGVudGl0eScpLnBvc3QoeyBkYXRhIH0sIHsgYWpheFNldHRpbmdzIH0pO1xuIHNpbXBsZUFwaSgnaWRlbnRpdHknKS5wb3N0KCBudWxsLCB7IGFqYXhTZXR0aW5ncyB9KTtcbiBzaW1wbGVBcGkucG9zdCh7IGRhdGEgfSwgeyBhamF4U2V0dGluZ3MgfSk7XG4gc2ltcGxlQXBpLnBvc3QoIG51bGwsIHsgYWpheFNldHRpbmdzIH0pO1xuXG4gc2ltcGxlQXBpLnJlYWQoZG9uZUNhbGxiYWNrKS5kb25lKGNhbGxiYWNrKS5mYWlsKGNhbGxiYWNrKTtcblxuINCg0LDQsdC+0YLQsCDRgSDQtNC+0LrRg9C80LXQvdGC0LDQvNC4IChzdG9yYWdlKSwg0L7QvSDRgdCw0Lwg0L/RgNC10L7QsdGA0LDQt9GD0LXRgtGB0Y8g0YfQtdGA0LXQtyDQvNC10YLQvtC0ICRfX2RlbHRhKClcbiBzaW1wbGVBcGkucG9zdCggRG9jdW1lbnQgKTtcbiBzaW1wbGVBcGkuc2F2ZSggRG9jdW1lbnQgKTtcblxuXG4gLy8g0KTQuNGH0LhcbiBhamF4U2V0dGluZ3Mg0LTQu9GPINC60LDQttC00L7Qs9C+INC30LDQv9GA0L7RgdCwXG4gSWRlbnRpdHkg0LTQu9GPINC60LDQttC00L7Qs9C+INC30LDQv9GA0L7RgdCwXG5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciByZXNvdXJjZU1peGluID0ge1xuICByZXNvdXJjZU5hbWU6ICdyZXNvdXJjZScsXG4gIHVybDogJycsIC8vID0gcmVzb3VyY2VOYW1lXG5cbiAgLyoqXG4gICAqINCU0L7QsdCw0LLQuNGC0Ywg0L3QvtCy0YvQuSDRgNC10YHRg9GA0YFcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHJlc291cmNlTmFtZVxuICAgKiBAcGFyYW0ge29iamVjdH0gW3BhcmVudFJlc291cmNlXSAtINGA0L7QtNC40YLQtdC70YzRgdC60LjQuSDRgNC10YHRg9GA0YFcbiAgICogQHBhcmFtIHtvYmplY3R9IFt1c2Vyc01peGluXSAtINC/0L7Qu9GM0LfQvtCy0LDRgtC10LvRjNGB0LrQsNGPINC/0YDQuNC80LXRgdGMXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgYWRkOiBmdW5jdGlvbiggcmVzb3VyY2VOYW1lLCBwYXJlbnRSZXNvdXJjZSwgdXNlcnNNaXhpbiApe1xuICAgIGlmICggIXVzZXJzTWl4aW4gKSB7XG4gICAgICB1c2Vyc01peGluID0gcGFyZW50UmVzb3VyY2UgfHwge307XG4gICAgICBwYXJlbnRSZXNvdXJjZSA9IHRoaXM7XG4gICAgfVxuXG4gICAgLy8g0JHRgNC+0YHQuNGC0Ywg0LjRgdC60LvRjtGH0LXQvdC40LUsINC10YHQu9C4INGC0LDQutC+0Lkg0YDQtdGB0YPRgNGBINGD0LbQtSDQtdGB0YLRjFxuICAgIGlmICggdGhpc1sgcmVzb3VyY2VOYW1lIF0gKXtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ9Cg0LXRgdGD0YDRgSDRgSDQvdCw0LfQstCw0L3QuNC10LwgJyArIHJlc291cmNlTmFtZSArICfRg9C20LUg0LXRgdGC0YwuJyk7XG4gICAgfVxuXG4gICAgLy8g0JvRjtCx0L7QuSDQuNC3INGN0YLQuNGFINC/0LDRgNCw0LzQtdGC0YDQvtCyINGD0LrQsNC30YvQstCw0LXRgiDQvdCwINC90LXQvtCx0YXQvtC00LjQvNC+0YHRgtGMINC40YHQv9C+0LvRjNC30L7QstCw0YLRjCDRhdGA0LDQvdC40LvQuNGJ0LVcbiAgICBpZiAoIHVzZXJzTWl4aW4uc2NoZW1hTmFtZSB8fCB1c2Vyc01peGluLmNvbGxlY3Rpb25OYW1lIHx8IHVzZXJzTWl4aW4uc3RvcmFnZSApIHtcbiAgICAgIC8vINCe0L/RgNC10LTQtdC70LjQvCDQvdCw0LfQstCw0L3QuNC1INGB0L7Qt9C00LDQstCw0LXQvNC+0Lkg0LrQvtC70LvQtdC60YbQuNC4XG4gICAgICB1c2Vyc01peGluLmNvbGxlY3Rpb25OYW1lID0gdXNlcnNNaXhpbi5jb2xsZWN0aW9uTmFtZSB8fCByZXNvdXJjZU5hbWU7XG4gICAgfVxuXG4gICAgLy8g0J/QtdGA0LXQtCDRgdC+0LfQtNCw0L3QuNC10Lwg0LrQvtC70LvQtdC60YbQuNC4INC90YPQttC90L4g0YHQvtC30LTQsNGC0Ywg0YDQtdGB0YPRgNGBLCDRh9GC0L7QsdGLINGDINC60L7Qu9C70LXQutGG0LjQuCDQsdGL0LvQsCDRgdGB0YvQu9C60LAg0L3QsCDQvdC10LPQvlxuICAgIHRoaXNbIHJlc291cmNlTmFtZSBdID0gbmV3IFJlc291cmNlKCByZXNvdXJjZU5hbWUsIHBhcmVudFJlc291cmNlLCB1c2Vyc01peGluICk7XG5cbiAgICAvLyDQodC+0LfQtNCw0YLRjCDQutC+0LvQu9C10LrRhtC40Y4sINC10YHQu9C4INGN0YLQvtCz0L4g0LXRidC1INC90LUg0YHQtNC10LvQsNC70LhcbiAgICBpZiAoIHVzZXJzTWl4aW4uY29sbGVjdGlvbk5hbWUgJiYgIXN0b3JhZ2VbIHVzZXJzTWl4aW4uY29sbGVjdGlvbk5hbWUgXSApe1xuICAgICAgLy8g0JjRidC10Lwg0YHRhdC10LzRgywg0LXRgdC70Lgg0L7QvdCwINGD0LrQsNC30LDQvdCwXG4gICAgICB2YXIgc2NoZW1hID0gc3RvcmFnZS5zY2hlbWFzWyB1c2Vyc01peGluLnNjaGVtYU5hbWUgXTtcblxuICAgICAgaWYgKCBzY2hlbWEgKXtcbiAgICAgICAgc3RvcmFnZS5jcmVhdGVDb2xsZWN0aW9uKCB1c2Vyc01peGluLmNvbGxlY3Rpb25OYW1lLCBzY2hlbWEsIHRoaXNbIHJlc291cmNlTmFtZSBdICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdSZXNvdXJjZTo6JyArIHJlc291cmNlTmFtZSArICcg0J3QtdC70YzQt9GPINC40YHQv9C+0LvRjNC30L7QstCw0YLRjCDRhdGA0LDQvdC40LvQuNGJ0LUgKNGB0L7Qt9C00LDRgtGMINC60L7Qu9C70LXQutGG0LjRjiksINC90LUg0YPQutCw0LfQsNCyINGB0YXQtdC80YMg0LTQsNC90L3Ri9GFJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXNbIHJlc291cmNlTmFtZSBdO1xuICB9LFxuXG4gIC8qKlxuICAgKiBodHRwczovL2dpdGh1Yi5jb20vYWhlY2ttYW5uL21xdWVyeS9ibG9iL21hc3Rlci9saWIvbXF1ZXJ5LmpzXG4gICAqIG1xdWVyeS5zZWxlY3RcbiAgICpcbiAgICogU3BlY2lmaWVzIHdoaWNoIGRvY3VtZW50IGZpZWxkcyB0byBpbmNsdWRlIG9yIGV4Y2x1ZGVcbiAgICpcbiAgICogIyMjI1N0cmluZyBzeW50YXhcbiAgICpcbiAgICogV2hlbiBwYXNzaW5nIGEgc3RyaW5nLCBwcmVmaXhpbmcgYSBwYXRoIHdpdGggYC1gIHdpbGwgZmxhZyB0aGF0IHBhdGggYXMgZXhjbHVkZWQuIFdoZW4gYSBwYXRoIGRvZXMgbm90IGhhdmUgdGhlIGAtYCBwcmVmaXgsIGl0IGlzIGluY2x1ZGVkLlxuICAgKlxuICAgKiAjIyMjRXhhbXBsZVxuICAgKlxuICAgKiAgICAgLy8gaW5jbHVkZSBhIGFuZCBiLCBleGNsdWRlIGNcbiAgICogICAgIHF1ZXJ5LnNlbGVjdCgnYSBiIC1jJyk7XG4gICAqXG4gICAqICAgICAvLyBvciB5b3UgbWF5IHVzZSBvYmplY3Qgbm90YXRpb24sIHVzZWZ1bCB3aGVuXG4gICAqICAgICAvLyB5b3UgaGF2ZSBrZXlzIGFscmVhZHkgcHJlZml4ZWQgd2l0aCBhIFwiLVwiXG4gICAqICAgICBxdWVyeS5zZWxlY3Qoe2E6IDEsIGI6IDEsIGM6IDB9KTtcbiAgICpcbiAgICogIyMjI05vdGVcbiAgICpcbiAgICogQ2Fubm90IGJlIHVzZWQgd2l0aCBgZGlzdGluY3QoKWBcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R8U3RyaW5nfSBhcmdcbiAgICogQHJldHVybiB7UXVlcnl9IHRoaXNcbiAgICogQHNlZSBTY2hlbWFUeXBlXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICB0cmFuc2Zvcm1GaWVsZHM6IGZ1bmN0aW9uIHNlbGVjdCAoKSB7XG4gICAgdmFyIGFyZyA9IGFyZ3VtZW50c1swXTtcbiAgICBpZiAoIWFyZykgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBzZWxlY3Q6IHNlbGVjdCBvbmx5IHRha2VzIDEgYXJndW1lbnRcIik7XG4gICAgfVxuXG4gICAgdmFyIGZpZWxkcyA9IHRoaXMuX2ZpZWxkcyB8fCAodGhpcy5fZmllbGRzID0ge30pO1xuICAgIHZhciB0eXBlID0gdHlwZW9mIGFyZztcblxuICAgIGlmICgnc3RyaW5nJyA9PSB0eXBlIHx8ICdvYmplY3QnID09IHR5cGUgJiYgJ251bWJlcicgPT0gdHlwZW9mIGFyZy5sZW5ndGggJiYgIUFycmF5LmlzQXJyYXkoYXJnKSkge1xuICAgICAgaWYgKCdzdHJpbmcnID09IHR5cGUpXG4gICAgICAgIGFyZyA9IGFyZy5zcGxpdCgvXFxzKy8pO1xuXG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYXJnLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgIHZhciBmaWVsZCA9IGFyZ1tpXTtcbiAgICAgICAgaWYgKCFmaWVsZCkgY29udGludWU7XG4gICAgICAgIHZhciBpbmNsdWRlID0gJy0nID09IGZpZWxkWzBdID8gMCA6IDE7XG4gICAgICAgIGlmIChpbmNsdWRlID09PSAwKSBmaWVsZCA9IGZpZWxkLnN1YnN0cmluZygxKTtcbiAgICAgICAgZmllbGRzW2ZpZWxkXSA9IGluY2x1ZGU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmIChfLmlzT2JqZWN0KGFyZykgJiYgIUFycmF5LmlzQXJyYXkoYXJnKSkge1xuICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhcmcpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIGZpZWxkc1trZXlzW2ldXSA9IGFyZ1trZXlzW2ldXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgc2VsZWN0KCkgYXJndW1lbnQuIE11c3QgYmUgc3RyaW5nIG9yIG9iamVjdC4nKTtcbiAgfSxcblxuICAvLyDQn9GA0L7QsdC10LbQsNGC0YzRgdGPINC/0L4g0LLRgdC10Lwg0YDQvtC00LjRgtC10LvRjNGB0LrQuNC8INGA0LXRgdGD0YDRgdCw0Lwg0Lgg0YHQvtCx0YDQsNGC0YwgdXJsICjQsdC10LcgcXVlcnkgc3RyaW5nKVxuICBjb25zdHJ1Y3RVcmw6IGZ1bmN0aW9uIGNvbnN0cnVjdFVybCggcmVjdXJzaW9uQ2FsbCApe1xuICAgIC8vIHRvZG86INC/0YDQvtCy0LXRgNC40YLRjCDQvdCw0LTQvtCx0L3QvtGB0YLRjCDQt9Cw0LrQvtC80LzQtdC90YLQuNGA0L7QstCw0L3QvdC+0LPQviDQutC+0LTQsFxuICAgIC8vIHRyYWlsaW5nU2xhc2ggLSDQvtC9INC40L3QvtCz0LTQsCDQvdGD0LbQtdC9LCDRgdC00LXQu9Cw0YLRjCDQutC+0L3RhNC40LNcbiAgICAvLyDRg9GB0LvQvtCy0LjQtSDRgSByZWN1cnNpb25DYWxsINC00L7QsdCw0LLQu9GP0LXRgiDRgdC70Y3RiCDQsiDRg9GA0Lsg0L/QtdGA0LXQtCDQt9C90LDQutC+0Lwg0LLQvtC/0YDQvtGB0LBcbiAgICAvL3ZhciBpZGVudGl0eSA9IHRoaXMuaWRlbnRpdHkgPyAnLycgKyB0aGlzLmlkZW50aXR5IDogcmVjdXJzaW9uQ2FsbCA/ICcnIDogJy8nO1xuICAgIHZhciBpZGVudGl0eSA9IHRoaXMuaWRlbnRpdHkgPyAnLycgKyB0aGlzLmlkZW50aXR5IDogJyc7XG5cbiAgICAvLyDQn9GA0L7QsdC10LbQsNGC0YzRgdGPINC/0L4g0LLRgdC10Lwg0YDQtdGB0YPRgNGB0LDQvCDQuCDQt9Cw0LPQu9GP0L3Rg9GC0Ywg0LIg0LrQvtGA0LXQvdGMINCw0L/QuCwg0YfRgtC+0LHRiyDRgdC+0LHRgNCw0YLRjCB1cmxcbiAgICByZXR1cm4gdGhpcy5wYXJlbnRSZXNvdXJjZVxuICAgICAgPyBjb25zdHJ1Y3RVcmwuY2FsbCggdGhpcy5wYXJlbnRSZXNvdXJjZSwgdHJ1ZSApICsgJy8nICsgdGhpcy51cmwgKyBpZGVudGl0eVxuICAgICAgOiB0aGlzLnVybDtcbiAgfSxcblxuICBfcmVzb3VyY2VSZXF1ZXN0OiBmdW5jdGlvbiggbWV0aG9kLCBhamF4U2V0dGluZ3MsIGRvbmVDYWxsYmFjayApe1xuICAgIHZhciB1cmwgPSB0aGlzLmNvbnN0cnVjdFVybCgpXG4gICAgICAsIHVzZU5vdGlmaWNhdGlvbnMgPSB0aGlzLm5vdGlmaWNhdGlvbnM7XG5cbiAgICBjb25zb2xlLmxvZyggdGhpcy5yZXNvdXJjZU5hbWUgKyAnOjonICsgbWV0aG9kICsgJyAnICsgdXJsICk7XG4gICAgcmV0dXJuIHRoaXMuaW5zdGFuY2UuX3JlcXVlc3QoIG1ldGhvZCwgdXJsLCBhamF4U2V0dGluZ3MuZGF0YSwgYWpheFNldHRpbmdzLCB1c2VOb3RpZmljYXRpb25zLCBkb25lQ2FsbGJhY2sgKTtcbiAgfVxufTtcblxudmFyIHJlcXVlc3RzVGFibGUgPSBbXTtcblxudmFyIG1ldGhvZHNNYXAgPSB7XG4gICdjcmVhdGUnOiAnUE9TVCcsXG4gICdyZWFkJzogICAnR0VUJyxcbiAgJ3VwZGF0ZSc6ICdQVVQnLFxuICAnZGVsZXRlJzogJ0RFTEVURScsXG4gICdwYXRjaCc6ICAnUEFUQ0gnLFxuXG4gICdwb3N0JzogICAnUE9TVCcsXG4gICdnZXQnOiAgICAnR0VUJyxcbiAgJ3NhdmUnOiAgICdQVVQnXG59O1xuXG5fLmZvckVhY2goIE9iamVjdC5rZXlzKCBtZXRob2RzTWFwICksIGZ1bmN0aW9uKCB2ZXJiICl7XG4gIC8qKlxuICAgKiDQl9Cw0L/RgNC+0YHRiyBjcmVhdGUgcmVhZCB1cGRhdGUgZGVsZXRlIHBhdGNoIGdldCBwb3N0XG4gICAqXG4gICAqINCSIGFqYXhTZXR0aW5ncyDQvNC+0LbQvdC+INGD0LrQsNC30LDRgtGMINC/0L7Qu9C1IGRvTm90U3RvcmUgLSDRh9GC0L7QsdGLINC90LUg0YHQvtGF0YDQsNC90Y/RgtGMINC/0L7Qu9GD0YfQtdC90L3Ri9C5INC+0LHRitC10LrRgiDQsiBzdG9yYWdlXG4gICAqXG4gICAqIEBwYXJhbSBbZGF0YV1cbiAgICogQHBhcmFtIFthamF4U2V0dGluZ3NdXG4gICAqIEBwYXJhbSBbZG9uZUNhbGxiYWNrXVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIHJlc291cmNlTWl4aW5bIHZlcmIgXSA9IGZ1bmN0aW9uKCBkYXRhLCBhamF4U2V0dGluZ3MsIGRvbmVDYWxsYmFjayApe1xuICAgIHZhciByZXNvdXJjZSA9IHRoaXMsXG4gICAgICBpZGVudGl0eSA9IHRoaXMuaWRlbnRpdHksXG4gICAgICBtZXRob2QgPSB0aGlzLmluc3RhbmNlLm1ldGhvZHNNYXBbIHZlcmJdLFxuICAgICAgZG9jdW1lbnRJZFN0cmluZztcblxuICAgIC8vINCV0YHQu9C4IGRhdGEgLSDQtdGB0YLRjCDRhNGD0L3QutGG0LjRjywg0YLQviDRjdGC0L4gZG9uZUNhbGxiYWNrXG4gICAgaWYgKCAkLmlzRnVuY3Rpb24oIGRhdGEgKSApe1xuICAgICAgZG9uZUNhbGxiYWNrID0gZGF0YTtcbiAgICAgIGRhdGEgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGlmICggJC5pc0Z1bmN0aW9uKCBhamF4U2V0dGluZ3MgKSApe1xuICAgICAgZG9uZUNhbGxiYWNrID0gYWpheFNldHRpbmdzO1xuICAgICAgYWpheFNldHRpbmdzID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGFqYXhTZXR0aW5ncyA9IGFqYXhTZXR0aW5ncyB8fCB7fTtcblxuICAgIC8vINCf0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuCDQtNC+0LrRg9C80LXQvdGC0LAg0L3Rg9C20L3QviDRgdC+0YXRgNCw0L3Rj9GC0Ywg0YLQvtC70YzQutC+INC40LfQvNC10L3RkdC90L3Ri9C1INC/0L7Qu9GPXG4gICAgaWYgKCBtZXRob2QgPT09ICdQT1NUJyB8fCBtZXRob2QgPT09ICdQVVQnICl7XG4gICAgICAvLyDQmNC90L7Qs9C00LAg0L/QtdGA0LXQtNCw0Y7RgiDQtNC+0LrRg9C80LXQvdGCXG4gICAgICBpZiAoIGRhdGEgaW5zdGFuY2VvZiBzdG9yYWdlLkRvY3VtZW50ICkge1xuICAgICAgICBkb2N1bWVudElkU3RyaW5nID0gZGF0YS5faWQudG9TdHJpbmcoKTtcbiAgICAgICAgZGF0YSA9IGRhdGEuJF9fZGVsdGEoKTtcblxuICAgICAgICAvLyDQotCw0Log0LzQvtC20L3QviDQv9C+0L3Rj9GC0YwsINGH0YLQviDQvNGLINGB0L7RhdGA0LDQvdGP0LXQvCDRgdGD0YnQtdGC0LLRg9GO0YnQuNC5INC90LAg0YHQtdGA0LLQtdGA0LUgRG9jdW1lbnRcbiAgICAgIH0gZWxzZSBpZiAoIHN0b3JhZ2UuT2JqZWN0SWQuaXNWYWxpZCggaWRlbnRpdHkgKSApIHtcbiAgICAgICAgZG9jdW1lbnRJZFN0cmluZyA9IGlkZW50aXR5O1xuXG4gICAgICAgIC8vINCf0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuCDRh9C10YDQtdC3INC80LXRgtC+0LQgc2F2ZSgpINGDINC00L7QutGD0LzQtdC90YLQsFxuICAgICAgfSBlbHNlIGlmICggZGF0YS5faWQgJiYgc3RvcmFnZS5PYmplY3RJZC5pc1ZhbGlkKCBkYXRhLl9pZCApICkge1xuICAgICAgICBkb2N1bWVudElkU3RyaW5nID0gZGF0YS5faWQudG9TdHJpbmcoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBhamF4U2V0dGluZ3MuZGF0YSA9IGRhdGE7XG5cbiAgICB2YXIgcmVxSW5mbyA9IHtcbiAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgdXJsOiB0aGlzLmNvbnN0cnVjdFVybCgpLFxuICAgICAgYWpheFNldHRpbmdzOiBhamF4U2V0dGluZ3MsXG4gICAgICByZXN1bHQ6IG51bGwsXG4gICAgICBtZXRhOiBudWxsXG4gICAgfTtcblxuICAgIC8vVE9ETzog0LTQvtC00LXQu9Cw0YLRjCDQutGN0YjQuNGA0L7QstCw0L3QuNC1XG4gICAgLy8g0JrRjdGI0LjRgNC+0LLQsNC90LjQtSDQvdCwINGH0YLQtdC90LjQtVxuICAgIGlmICggbWV0aG9kID09PSAnR0VUJyApe1xuICAgICAgdmFyIGluQ2FjaGUgPSBfLmZpbmQoIHJlcXVlc3RzVGFibGUsIHJlcUluZm8gKTtcblxuICAgICAgaWYgKCByZXNvdXJjZS5zdG9yYWdlICYmIGlkZW50aXR5ICYmIGluQ2FjaGUgKXtcbiAgICAgICAgLy8g0JXRgdC70Lgg0LTQsNC90L3QvtC1INC10YHRgtGMIC0g0LLQtdGA0L3Rg9GC0Ywg0LXQs9C+XG4gICAgICAgIGlmICggaW5DYWNoZS5yZXN1bHQgKXtcbiAgICAgICAgICBkb25lQ2FsbGJhY2sgJiYgZG9uZUNhbGxiYWNrKCBpbkNhY2hlLnJlc3VsdCwgaW5DYWNoZS5tZXRhICk7XG4gICAgICAgICAgY2xlYXJJZGVudGl0eSggcmVzb3VyY2UgKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgZGZkID0gJC5EZWZlcnJlZCgpO1xuICAgIHRoaXMuX3Jlc291cmNlUmVxdWVzdCggdmVyYiwgYWpheFNldHRpbmdzICkuZG9uZShmdW5jdGlvbiggcmVzcG9uc2UsIHRleHRTdGF0dXMsIGpxWEhSICl7XG4gICAgICB2YXIgcmVzdWx0LCBmaWVsZHM7XG5cbiAgICAgIC8vI2V4YW1wbGUgICAgdnMuYXBpLnBsYWNlcyh7ZmllbGRzOiAnbmFtZScsIHNraXA6IDEwMH0pLmdldChmdW5jdGlvbihyZXMpe2NvbnNvbGUubG9nKHJlcyl9KTtcbiAgICAgIC8vINCV0YHQu9C4INCx0YvQu9CwINCy0YvQsdC+0YDQutCwINC/0L4g0L/QvtC70Y/QvCwg0L3Rg9C20L3QviDQv9GA0LDQstC40LvRjNC90L4g0L7QsdGA0LDQsdC+0YLQsNGC0Ywg0LXRkSDQuCDQv9C10YDQtdC00LDRgtGMINCyINC00L7QutGD0LzQtdC90YJcbiAgICAgIGlmICggZGF0YSAmJiBkYXRhLmZpZWxkcyApe1xuICAgICAgICBmaWVsZHMgPSByZXNvdXJjZS50cmFuc2Zvcm1GaWVsZHMoIGRhdGEuZmllbGRzICk7XG4gICAgICB9XG5cbiAgICAgIC8vINCV0YHRgtGMINC+0YLQstC10YIg0L3QsNC00L4g0YHQvtGF0YDQsNC90LjRgtGMINCyINGF0YDQsNC90LjQu9C40YnQtVxuICAgICAgaWYgKCByZXNvdXJjZS5zdG9yYWdlICYmICFhamF4U2V0dGluZ3MuZG9Ob3RTdG9yZSApe1xuICAgICAgICAvLyDQn9GA0Lgg0YHQvtGF0YDQsNC90LXQvdC40Lgg0Lgg0L7QsdC90L7QstC70LXQvdC40Lgg0L3Rg9C20L3QviDQvtCx0L3QvtCy0LvRj9GC0Ywg0LTQvtC60YPQvNC10L3RglxuICAgICAgICBpZiAoIG1ldGhvZCA9PT0gJ1BPU1QnIHx8IG1ldGhvZCA9PT0gJ1BVVCcgKXtcbiAgICAgICAgICAvLyDQn9C+0L/RgNC+0LHRg9C10Lwg0YHQvdCw0YfQsNC70LAg0L3QsNC50YLQuCDQtNC+0LrRg9C80LXQvdGCINC/0L4gaWQg0Lgg0L7QsdC90L7QstC40YLRjCDQtdCz0L5cbiAgICAgICAgICByZXN1bHQgPSBzdG9yYWdlWyByZXNvdXJjZS5jb2xsZWN0aW9uTmFtZSBdLmZpbmRCeUlkKCBkb2N1bWVudElkU3RyaW5nICk7XG5cbiAgICAgICAgICBpZiAoIHJlc3VsdCApe1xuICAgICAgICAgICAgLy8g0J7QsdC90L7QstC70Y/QtdC8INC00L7QutGD0LzQtdC90YJcbiAgICAgICAgICAgIHJlc3VsdC5zZXQoIHJlc3BvbnNlLnJlc3VsdCApO1xuXG4gICAgICAgICAgICAvLyDQodC+0LfQtNCw0ZHQvCDRgdGB0YvQu9C60YMg0L/QviDQvdC+0LLQvtC80YMgaWQg0LIg0LrQvtC70LvQtdC60YbQuNC4XG4gICAgICAgICAgICBzdG9yYWdlWyByZXNvdXJjZS5jb2xsZWN0aW9uTmFtZSBdLnVwZGF0ZUlkTGluayggcmVzdWx0ICk7XG5cbiAgICAgICAgICAgIC8vINCt0YLQvtGCINC00L7QutGD0LzQtdC90YIg0YLQtdC/0LXRgNGMINGB0L7RhdGA0LDQvdGR0L0g0L3QsCDRgdC10YDQstC10YDQtSwg0LfQvdCw0YfQuNGCINC+0L0g0YPQttC1INC90LUg0L3QvtCy0YvQuS5cbiAgICAgICAgICAgIHJlc3VsdC5pc05ldyA9IGZhbHNlO1xuXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHN0b3JhZ2VbIHJlc291cmNlLmNvbGxlY3Rpb25OYW1lIF0uYWRkKCByZXNwb25zZS5yZXN1bHQgfHwgcmVzcG9uc2UsIHVuZGVmaW5lZCwgdHJ1ZSApO1xuICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2UgaWYgKCBtZXRob2QgPT09ICdHRVQnICl7XG4gICAgICAgICAgLy8g0J3QtSDQtNC+0LHQsNCy0LvRj9GC0Ywg0LIg0YXRgNCw0L3QuNC70LjRidC1INGA0LXQt9GD0LvRjNGC0LDRgiDQt9Cw0L/RgNC+0YHQvtCyINGBINCy0YvQsdC+0YDQutC+0Lkg0L/QvtC70LXQuVxuICAgICAgICAgIGlmICggZmllbGRzICl7XG4gICAgICAgICAgICByZXN1bHQgPSByZXNwb25zZS5yZXN1bHQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHN0b3JhZ2VbIHJlc291cmNlLmNvbGxlY3Rpb25OYW1lIF0uYWRkKCByZXNwb25zZS5yZXN1bHQgfHwgcmVzcG9uc2UsIGZpZWxkcywgdHJ1ZSApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0ID0gcmVzcG9uc2UucmVzdWx0IHx8IHJlc3BvbnNlO1xuICAgICAgfVxuXG4gICAgICAvLyDQodC+0YXRgNCw0L3QuNGC0Ywg0L/QsNGA0LDQvNC10YLRgNGLINC30LDQv9GA0L7RgdCwINC4INC+0YLQstC10YIg0LTQu9GPINC60Y3RiNC40YDQvtCy0LDQvdC40Y9cbiAgICAgIHJlcUluZm8ucmVzdWx0ID0gcmVzdWx0O1xuICAgICAgcmVxSW5mby5tZXRhID0gcmVzcG9uc2UubWV0YTtcbiAgICAgIHJlcXVlc3RzVGFibGUucHVzaCggcmVxSW5mbyApO1xuXG4gICAgICBkb25lQ2FsbGJhY2sgJiYgZG9uZUNhbGxiYWNrKCByZXN1bHQsIHJlc3BvbnNlLm1ldGEgKTtcbiAgICAgIGRmZC5yZXNvbHZlKCByZXN1bHQsIHJlc3BvbnNlLm1ldGEsIHRleHRTdGF0dXMsIGpxWEhSICk7XG5cbiAgICB9KS5mYWlsKGZ1bmN0aW9uKCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKXtcbiAgICAgIGRmZC5yZWplY3QoIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApO1xuICAgIH0pO1xuXG4gICAgLy9UT0RPOiDQmNGB0L/QvtC70YzQt9C+0LLQsNGC0Ywg0LjQtNC10L7Qu9C+0LPRjiBxdWVyeT8gcXVlcnkg0L7QsdGK0LXQutGCINC00LvRjyDQv9C+0YHRgtGA0L7QtdC90LjRjyDQt9Cw0L/RgNC+0YHQvtCyXG5cbiAgICAvLyBpZGVudGl0eSDRgdC+0YXRgNCw0L3Rj9C10YLRgdGPINC00LvRjyBjb25zdHJ1Y3RVcmwsINC10LPQviDQvdGD0LbQvdC+INC+0YfQuNGB0YLQuNGC0Ywg0LTQu9GPINC/0L7RgdC70LXQtNGD0Y7RidC40YUg0LfQsNC/0YDQvtGB0L7Qsi5cbiAgICBjbGVhcklkZW50aXR5KCByZXNvdXJjZSApO1xuXG4gICAgcmV0dXJuIGRmZDtcbiAgfTtcbn0pO1xuXG4vLyDQntGH0LjRgdGC0LjRgtGMIGlkZW50aXR5INGDINGA0LXRgdGD0YDRgdCwINC4INC10LPQviDRgNC+0LTQuNGC0LXQu9GM0YHQutC40YUg0YDQtdGB0YPRgNGB0L7QsiDRgtC+0LbQtVxuZnVuY3Rpb24gY2xlYXJJZGVudGl0eSggcmVzb3VyY2UgKXtcbiAgd2hpbGUgKCByZXNvdXJjZS5wYXJlbnRSZXNvdXJjZSApIHtcbiAgICByZXNvdXJjZS5pZGVudGl0eSA9ICcnO1xuICAgIHJlc291cmNlID0gcmVzb3VyY2UucGFyZW50UmVzb3VyY2U7XG4gIH1cbn1cblxuLyoqXG4gKiDQmtCw0Log0LHRiyDQutC+0L3RgdGC0YDRg9C60YLQvtGAINGA0LXRgdGD0YDRgdCwLCDQvdC+INCy0L7Qt9Cy0YDQsNGJ0LDQtdGCINGE0YPQvdC60YbQuNGOLdC+0LHRitC10LrRgiDRgSDQv9GA0LjQvNC10YHRj9C80LhcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gcmVzb3VyY2VOYW1lXG4gKiBAcGFyYW0ge29iamVjdH0gcGFyZW50UmVzb3VyY2VcbiAqIEBwYXJhbSB7b2JqZWN0fSB1c2Vyc01peGluXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IHJlc291cmNlXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIFJlc291cmNlID0gZnVuY3Rpb24oIHJlc291cmNlTmFtZSwgcGFyZW50UmVzb3VyY2UsIHVzZXJzTWl4aW4gKXtcblxuICAvKipcbiAgICog0K3RgtGDINGE0YPQvdC60YbQuNGOINC80Ysg0L7RgtC00LDRkdC8INC/0L7Qu9GM0LfQvtCy0LDRgtC10LvRjiDQsiDQutCw0YfQtdGB0YLQstC1INC00L7RgdGC0YPQv9CwINC6INGA0LXRgdGD0YDRgdGDLlxuICAgKiDQntC90LAg0L/QvtC30LLQvtC70Y/QtdGCINC30LDQtNCw0YLRjCBpZGVudGl0eSDQtNC70Y8g0LfQsNC/0YDQvtGB0LAuXG4gICAqXG4gICAqIEBwYXJhbSBbaWRlbnRpdHldXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn1cbiAgICovXG4gIHZhciByZXNvdXJjZSA9IGZ1bmN0aW9uIHJlc291cmNlKCBpZGVudGl0eSApe1xuICAgIGlmICggaWRlbnRpdHkgJiYgIV8uaXNTdHJpbmcoIGlkZW50aXR5ICkgKXtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ2lkZW50aXR5INC00L7Qu9C20LXQvSDQsdGL0YLRjCDRgdGC0YDQvtC60L7QuSwg0LAg0L3QtScsIGlkZW50aXR5ICk7XG4gICAgfVxuXG4gICAgcmVzb3VyY2UuaWRlbnRpdHkgPSBpZGVudGl0eSB8fCAnJztcblxuICAgIHJldHVybiByZXNvdXJjZTtcbiAgfTtcblxuICAkLmV4dGVuZCggcmVzb3VyY2UsIHJlc291cmNlTWl4aW4sIHtcbiAgICByZXNvdXJjZU5hbWU6IHJlc291cmNlTmFtZSxcbiAgICB1cmw6IHJlc291cmNlTmFtZVxuICB9LCB1c2Vyc01peGluICk7XG5cbiAgcmVzb3VyY2UucGFyZW50UmVzb3VyY2UgPSBwYXJlbnRSZXNvdXJjZTtcbiAgcmVzb3VyY2UuaW5zdGFuY2UgPSBwYXJlbnRSZXNvdXJjZS5pbnN0YW5jZSB8fCBwYXJlbnRSZXNvdXJjZTtcblxuICByZXR1cm4gcmVzb3VyY2U7XG59O1xuXG4vKipcbiAqINCh0L7Qt9C00LDRgtGMINC90L7QstGL0Lkg0Y3QutC30LXQvNC/0LvRj9GAIGFwaSDQutC70LjQtdC90YLQsFxuICpcbiAqIEBleGFtcGxlXG4gKiBBcGlDbGllbnQoJy9hcGknLCB7XG4gKiAgIGhvb2tzOiB7XG4gKiAgICAgaGVhZGVyczoge1xuICogICAgICAgdG9rZW46ICdYWFhYWFgnXG4gKiAgICAgfVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiBBcGlDbGllbnQoJ2h0dHBzOi8vZG9tYWluLmNvbS9hcGknLCB7XG4gKiAgIGhvb2tzOiB7XG4gKiAgICAgaGVhZGVyczoge1xuICogICAgICAgdG9rZW46ICdYWFhYWFgnXG4gKiAgICAgfVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiBBcGlDbGllbnQoe1xuICogICB1cmw6ICcvYXBpJ1xuICogICBob29rczoge1xuICogICAgIGhlYWRlcnM6IHtcbiAqICAgICAgIHRva2VuOiAnWFhYWFhYJ1xuICogICAgIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogQHBhcmFtIHVybCAtINGB0YHRi9C70LrQsCDQvdCwINC60L7RgNC10L3RjCBhcGlcbiAqIEBwYXJhbSBvcHRpb25zIC0g0L7Qv9GG0LjQuCDQtNC70Y8g0LrQu9C40LXQvdGC0LBcbiAqL1xudmFyIEFwaUNsaWVudCA9IGZ1bmN0aW9uKCB1cmwsIG9wdGlvbnMgKXtcbiAgcmV0dXJuIG5ldyBBcGlDbGllbnQuaW5zdGFuY2UuaW5pdCggdXJsLCBvcHRpb25zICk7XG59O1xuXG5BcGlDbGllbnQuaW5zdGFuY2UgPSBBcGlDbGllbnQucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogQXBpQ2xpZW50LFxuXG4gIC8qKlxuICAgKiDQmNC90LjRhtC40LDQu9C40LfQsNGG0LjRjyDQvdC+0LLQvtCz0L4g0LDQv9C4INC60LvQuNC10L3RgtCwXG4gICAqIEBwYXJhbSB1cmxcbiAgICogQHBhcmFtIG9wdGlvbnNcbiAgICovXG4gIGluaXQ6IGZ1bmN0aW9uKCB1cmwsIG9wdGlvbnMgKXtcbiAgICBpZiAoIHR5cGVvZiB1cmwgPT09ICdzdHJpbmcnICl7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgIG9wdGlvbnMudXJsID0gdXJsO1xuICAgIH1cblxuICAgIC8vINCf0L4g0YPQvNC+0LvRh9Cw0L3QuNGOLCDRg9Cy0LXQtNC+0LzQu9C10L3QuNGPINC+0YLQutC70Y7Rh9C10L3Ri1xuICAgIHRoaXMubm90aWZpY2F0aW9ucyA9IGZhbHNlO1xuXG4gICAgLyoqXG4gICAgICog0KXRg9C60Lgg0LTQu9GPIGFqYXggc2V0dGluZ3MgKNCy0YvRgdGC0YPQv9Cw0LXRgiDQsiDRgNC+0LvQuCDQsdCw0LfQvtCy0L7Qs9C+IGFqYXhTZXR0aW5ncylcbiAgICAgKiBAc2VlIGh0dHA6Ly9hcGkuanF1ZXJ5LmNvbS9qUXVlcnkuYWpheC9cbiAgICAgKlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgdGhpcy5ob29rcyA9IHtcbiAgICAgIC8vINC00L7Qv9C+0LvQvdC40YLQtdC70YzQvdGL0LUg0LTQsNC90L3Ri9C1INC30LDQv9GA0L7RgdCwXG4gICAgICBkYXRhOiB7fSxcbiAgICAgIC8vINCe0LHRitC10LrRgiDQtNC70Y8g0LTQvtCx0LDQstC70LXQvdC40Y8g0L/RgNC+0LjQt9Cy0L7Qu9GM0L3Ri9GFINC30LDQs9C+0LvQvtCy0LrQvtCyINC60L4g0LLRgdC10Lwg0LfQsNC/0YDQvtGB0LDQvFxuICAgICAgLy8g0YPQtNC+0LHQvdC+INC00LvRjyDQsNCy0YLQvtGA0LjQt9Cw0YbQuNC4INC/0L4g0YLQvtC60LXQvdCw0LxcbiAgICAgIGhlYWRlcnM6IHt9XG4gICAgfTtcblxuICAgICQuZXh0ZW5kKCB0cnVlLCB0aGlzLCAkLmlzUGxhaW5PYmplY3QoIHVybCApID8gdXJsIDogb3B0aW9ucyApO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQlNC+0LHQsNCy0LjRgtGMINC90L7QstGL0Lkg0YDQtdGB0YPRgNGBXG4gICAqIEBzZWUgcmVzb3VyY2VNaXhpbi5hZGRcbiAgICovXG4gIGFkZDogcmVzb3VyY2VNaXhpbi5hZGQsXG5cbiAgbWV0aG9kc01hcDogbWV0aG9kc01hcCxcblxuICBfcHJlcGFyZUFqYXhTZXR0aW5nczogZnVuY3Rpb24oIG1ldGhvZCwgdXJsLCBkYXRhLCBhamF4U2V0dGluZ3MgKXtcbiAgICB2YXIgdHlwZSA9IHRoaXMubWV0aG9kc01hcFsgbWV0aG9kIF1cbiAgICAgICwgX2FqYXhTZXR0aW5ncyA9ICQuZXh0ZW5kKCB0cnVlLCB7fSwgdGhpcy5ob29rcywgYWpheFNldHRpbmdzLCB7XG4gICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgIHVybDogdXJsXG4gICAgICB9KTtcblxuICAgIC8vINCU0L7QsdCw0LLQu9GP0LXQvCDQsNCy0YLQvtGA0LjQt9Cw0YbQuNGOINC/0L4g0YLQvtC60LXQvdGDXG4gICAgaWYgKCB0aGlzLnRva2VuICYmIGFqYXhTZXR0aW5ncy5oZWFkZXJzICYmIGFqYXhTZXR0aW5ncy5oZWFkZXJzLnRva2VuID09IG51bGwgKXtcbiAgICAgIF9hamF4U2V0dGluZ3MuaGVhZGVycy5BdXRob3JpemF0aW9uID0gJ3Rva2VuICcgKyB0aGlzLnRva2VuO1xuICAgICAgLy9BY2NlcHQ6ICdhcHBsaWNhdGlvbi92bmQuZ2l0aHViLnByZXZpZXcnXG4gICAgfVxuXG4gICAgaWYgKCB0eXBlID09PSAnR0VUJyApe1xuICAgICAgXy5hc3NpZ24oIF9hamF4U2V0dGluZ3MuZGF0YSwgZGF0YSApO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyDQldGB0LvQuCDRgdC+0YXRgNCw0L3Rj9C10Lwg0LTQvtC60YPQvNC10L3Rgiwg0L3Rg9C20L3QviDRgdC00LXQu9Cw0YLRjCB0b09iamVjdCh7ZGVwb3B1bGF0ZTogMX0pXG4gICAgICBpZiAoIGRhdGEgJiYgZGF0YS5jb25zdHJ1Y3RvciAmJiBkYXRhLmNvbnN0cnVjdG9yLm5hbWUgJiYgZGF0YS5jb25zdHJ1Y3Rvci5uYW1lID09PSAnRG9jdW1lbnQnICl7XG4gICAgICAgIF8uYXNzaWduKCBfYWpheFNldHRpbmdzLmRhdGEsIGRhdGEudG9PYmplY3Qoe2RlcG9wdWxhdGU6IDF9KSApO1xuXG4gICAgICB9IGVsc2UgaWYgKCBkYXRhICkge1xuICAgICAgICBfLmFzc2lnbiggX2FqYXhTZXR0aW5ncy5kYXRhLCBkYXRhICk7XG4gICAgICB9XG5cbiAgICAgIGlmICggX2FqYXhTZXR0aW5ncy5kYXRhICYmIF9hamF4U2V0dGluZ3MuY29udGVudFR5cGUgPT09ICdhcHBsaWNhdGlvbi9qc29uJyApe1xuICAgICAgICBfYWpheFNldHRpbmdzLmRhdGEgPSBKU09OLnN0cmluZ2lmeSggX2FqYXhTZXR0aW5ncy5kYXRhICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gdG9kbyDQv9GA0L7QstC10YDRgtGMINC90LDQtNC+0LHQvdC+0YHRgtGMINC60L7QtNCwXG4gICAgLy8g0JjRgdC/0L7Qu9GM0LfRg9C10YLRgdGPINC00LvRjyDQsNC70LjQsNGB0L7Qsiwg0LIg0LrQvtGC0L7RgNGL0YUg0LLRgtC+0YDQvtC5INC/0LDRgNCw0LzQtdGC0YAgLSDQtdGB0YLRjCDQvtCx0YrQtdC60YIg0L3QsNGB0YLRgNC+0LXQulxuICAgIGlmICggJC5pc1BsYWluT2JqZWN0KCB1cmwgKSApe1xuICAgICAgY29uc29sZS5pbmZvKCfQkNGFQCrRgtGMLCDQvdGD0LbQvdGL0Lkg0LrQvtC0ISEhIScpO1xuICAgICAgX2FqYXhTZXR0aW5ncyA9IHVybDtcbiAgICAgIGRlYnVnZ2VyO1xuICAgIH1cblxuICAgIHJldHVybiBfYWpheFNldHRpbmdzO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQntGC0L/RgNCw0LLQuNGC0Ywg0LfQsNC/0YDQvtGBINC90LAg0YHQtdGA0LLQtdGAXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtZXRob2QgICDQndCw0LfQstCw0L3QuNC1INC80LXRgtC+0LTQsCAoUE9TVCwgR0VULCBQVVQsIERFTEVURSwgUEFUQ0gpXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgICDQn9C+0LvQvdGL0Lkg0YPRgNC7INGA0LXRgdGD0YDRgdCwXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhICAg0J7QsdGK0LXQutGCINGBINC00LDQvdC90YvQvNC4INC00LvRjyDQt9Cw0L/RgNC+0YHQsFxuICAgKiBAcGFyYW0ge29iamVjdH0gYWpheFNldHRpbmdzICAg0J7QsdGK0LXQutGCINGBINC90LDRgdGC0YDQvtC50LrQsNC80LhcbiAgICogQHBhcmFtIHtib29sZWFufSB1c2VOb3RpZmljYXRpb25zICAg0KTQu9Cw0LMsINC40YHQv9C+0LvRjNC30L7QstCw0YLRjCDQu9C4INGD0LLQtdC00L7QvNC70LXQvdC40Y9cbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gZG9uZUNhbGxiYWNrICAg0KTRg9C90LrRhtC40Y8g0YPRgdC/0LXRiNC90L7Qs9C+INC+0LHRgNCw0YLQvdC+0LPQviDQstGL0LfQvtCy0LBcbiAgICogQHJldHVybnMgeyQuRGVmZXJyZWR9INCy0L7Qt9Cy0YDQsNGJ0LDQtdGCIGpxdWVyeSBhamF4INC+0LHRitC10LrRglxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3JlcXVlc3Q6IGZ1bmN0aW9uKCBtZXRob2QsIHVybCwgZGF0YSwgYWpheFNldHRpbmdzLCB1c2VOb3RpZmljYXRpb25zLCBkb25lQ2FsbGJhY2sgKXtcbiAgICBpZiAoICFfLmlzU3RyaW5nKCBtZXRob2QgKSApe1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCfQn9Cw0YDQsNC80LXRgtGAIGBtZXRob2RgINC00L7Qu9C20LXQvSDQsdGL0YLRjCDRgdGC0YDQvtC60L7QuSwg0LAg0L3QtSAnLCBtZXRob2QgKTtcbiAgICB9XG5cbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICAgICwgdHlwZSA9IHRoaXMubWV0aG9kc01hcFsgbWV0aG9kIF1cbiAgICAgICwgbm90aWZpY2F0aW9uVHlwZSA9IHR5cGUgPT09ICdHRVQnID8gJ2xvYWQnIDogKCB0eXBlID09PSAnUE9TVCcgfHwgdHlwZSA9PT0gJ1BVVCcgfHwgdHlwZSA9PT0gJ1BBVENIJyApID8gJ3NhdmUnIDogJ2RlbGV0ZSdcbiAgICAgICwgX2FqYXhTZXR0aW5ncyA9IHRoaXMuX3ByZXBhcmVBamF4U2V0dGluZ3MoIG1ldGhvZCwgdXJsLCBkYXRhLCBhamF4U2V0dGluZ3MgKTtcblxuICAgIC8vINCY0YHQv9C+0LvRjNC30L7QstCw0YLRjCDQt9C90LDRh9C10L3QuNC1INC/0L4g0YPQvNC+0LvRh9Cw0L3QuNGOLCDQtdGB0LvQuCB1c2VOb3RpZmljYXRpb25zINC90LUg0LfQsNC00LDQvVxuICAgIC8vINGC0YPRgiDQttC1INC/0L7RgNCy0LXRgNGP0LXQvCwg0L/QvtC00LrQu9GO0YfQtdC90Ysg0LvQuCDRg9Cy0LXQtNC+0LzQu9C10L3QuNGPXG4gICAgaWYgKCBfLmlzQm9vbGVhbiggdXNlTm90aWZpY2F0aW9ucyApICl7XG4gICAgICB1c2VOb3RpZmljYXRpb25zID0gdXNlTm90aWZpY2F0aW9ucyAmJiBjZi5ub3RpZmljYXRpb247XG4gICAgfSBlbHNlIHtcbiAgICAgIHVzZU5vdGlmaWNhdGlvbnMgPSB0aGlzLm5vdGlmaWNhdGlvbnMgJiYgY2Yubm90aWZpY2F0aW9uO1xuICAgIH1cblxuICAgIGlmICggdXNlTm90aWZpY2F0aW9ucyApe1xuICAgICAgY2Yubm90aWZpY2F0aW9uWyBub3RpZmljYXRpb25UeXBlIF0uc2hvdygpO1xuICAgIH1cblxuICAgIHJldHVybiAkLmFqYXgoIF9hamF4U2V0dGluZ3MgKS5mYWlsKGZ1bmN0aW9uKCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKXtcbiAgICAgIGNvbnNvbGUud2FybigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICk7XG5cbiAgICAgIC8vIFVuYXV0aG9yaXplZCBDYWxsYmFja1xuICAgICAgaWYgKCBqcVhIUi5zdGF0dXMgPT09IDQwMSAmJiBzZWxmLnVuYXV0aG9yaXplZENhbGxiYWNrICl7XG4gICAgICAgIHNlbGYudW5hdXRob3JpemVkQ2FsbGJhY2soIGpxWEhSLCBtZXRob2QsIHVybCwgZGF0YSwgYWpheFNldHRpbmdzLCBkb25lQ2FsbGJhY2sgKTtcblxuICAgICAgICAvLyDQndC1INC/0L7QutCw0LfRi9Cy0LDRgtGMINGB0L7QvtCx0YnQtdC90LjQtSDRgSDQvtGI0LjQsdC60L7QuSDQv9GA0LggNDAxLCDQtdGB0LvQuCDQstGB0ZEg0L/Qu9C+0YXQviwg0YLQviDRgNC+0YPRgtC10YAg0YHQsNC8INC/0LXRgNC10LrQuNC90LXRgiDQvdCwINGE0L7RgNC80YMg0LLRhdC+0LTQsFxuICAgICAgICBpZiAoIHVzZU5vdGlmaWNhdGlvbnMgKXtcbiAgICAgICAgICBjZi5ub3RpZmljYXRpb25bIG5vdGlmaWNhdGlvblR5cGUgXS5oaWRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICggdXNlTm90aWZpY2F0aW9ucyApe1xuICAgICAgICBjZi5ub3RpZmljYXRpb25bIG5vdGlmaWNhdGlvblR5cGUgXS5mYWlsKCk7XG4gICAgICB9XG5cbiAgICB9KS5kb25lKGZ1bmN0aW9uKCl7XG4gICAgICBpZiAoIHVzZU5vdGlmaWNhdGlvbnMgKXtcbiAgICAgICAgY2Yubm90aWZpY2F0aW9uWyBub3RpZmljYXRpb25UeXBlIF0uaGlkZSgpO1xuICAgICAgfVxuICAgIH0pLmRvbmUoIGRvbmVDYWxsYmFjayApO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQnNC10YLQvtC0INC00LvRjyDRh9GC0LXQvdC40Y8g0LrQvtGA0L3RjyBhcGlcbiAgICpcbiAgICogQHBhcmFtIGFqYXhTZXR0aW5nc1xuICAgKiBAcGFyYW0gZG9uZUNhbGxiYWNrXG4gICAqIEByZXR1cm5zIHskLkRlZmVycmVkfVxuICAgKi9cbiAgcmVhZDogZnVuY3Rpb24oIGFqYXhTZXR0aW5ncywgZG9uZUNhbGxiYWNrICl7XG4gICAgY29uc29sZS5sb2coICdhcGk6OnJlYWQnICk7XG4gICAgaWYgKCAkLmlzRnVuY3Rpb24oIGFqYXhTZXR0aW5ncyApICl7XG4gICAgICBkb25lQ2FsbGJhY2sgPSBhamF4U2V0dGluZ3M7XG4gICAgICBhamF4U2V0dGluZ3MgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgYWpheFNldHRpbmdzID0gYWpheFNldHRpbmdzIHx8IHt9O1xuXG4gICAgcmV0dXJuIHRoaXMuX3JlcXVlc3QoJ3JlYWQnLCB0aGlzLnVybCwgdW5kZWZpbmVkLCBhamF4U2V0dGluZ3MsIGZhbHNlLCBkb25lQ2FsbGJhY2sgKTtcbiAgfVxufTtcblxuQXBpQ2xpZW50Lmluc3RhbmNlLmluaXQucHJvdG90eXBlID0gQXBpQ2xpZW50Lmluc3RhbmNlO1xuXG4vLyBleHBvcnRzXG5tb2R1bGUuZXhwb3J0cyA9IEFwaUNsaWVudDsiXX0=
(1)
});
