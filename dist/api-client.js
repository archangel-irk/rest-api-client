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

 Работа с документами, он сам преобразуется через метод $__delta()
 simpleApi.post( Document );
 simpleApi.save( Document );


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

  // Пробежаться по всем родителям и собрать url (без query string)
  constructUrl: function constructUrl( recursionCall ){
    // todo: проверить надобность закомментированного кода
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
          this.identity = '';
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

      // При использовании параметра doNotStore - не надо сохранять ответ в хранилище
      if ( resource.storage && !ajaxSettings.doNotStore ){
        // При сохранении и обновлении нужно обновлять документ
        if ( method === 'POST' || method === 'PUT' ){
          // Попробуем сначала найти документ по id и обновить его
          result = storage[ resource.collectionName ].findById( documentIdString );

          if ( result ){
            // Обновляем документ
            result.set( response.result );

            // Создаём ссылку по новому id в коллекции
            storage[ resource.collectionName ].documents[ documentIdString ] = result;

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
    this.identity = '';

    return dfd;
  };
});

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
   * Она позволяет задать identity и дополнительные параметры в запрос.
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
 * @param url
 * @param options
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

    if ( this.token && ajaxSettings.headers && ajaxSettings.headers.token == null ){
      _ajaxSettings.headers.Authorization = 'token ' + this.token;
      //Accept: 'application/vnd.github.preview'
    }

    if ( type === 'GET' ){
      _.assign( _ajaxSettings.data, data );
    } else if ( data ){
      // Если сохраняем документ, нужно сделать toObject({depopulate: 1})
      if ( data.constructor && data.constructor.name && data.constructor.name === 'Document' ){
        _.assign( _ajaxSettings.data, data.toObject({depopulate: 1}) );

      } else {
        _.assign( _ajaxSettings.data, data );
      }

      if ( _ajaxSettings.contentType === 'application/json' ){
        _ajaxSettings.data = JSON.stringify( _ajaxSettings.data );
      }
    }

    // todo проверть надобность кода
    // Используется для алиасов, в которых второй параметр - есть объект настроек
    if ( $.isPlainObject( url ) ){
      console.info('Ахуеть, нужный код!!!!');
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

// Добавим extend для возможности расширения
ApiClient.extend = ApiClient.instance.extend = $.extend;

// exports
module.exports = ApiClient;
},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9yZXN0LWFwaS1jbGllbnQvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3Jlc3QtYXBpLWNsaWVudC9zcmMvZmFrZV9mMWQxMmY2My5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIEFQSSBDbGllbnRcbi8vIC0tLS0tLS0tLS0tLS0tLVxuXG4vLyBFeGFtcGxlXG4vKlxuIHZhciBnaXRodWIgPSBBcGlDbGllbnQoJ2h0dHBzOi8vYXBpLmdpdGh1Yi5jb20nLCB7XG4gICBob29rczoge1xuICAgICBoZWFkZXJzOiB7XG4gICAgICAgQWNjZXB0OiAnYXBwbGljYXRpb24vdm5kLmdpdGh1Yi52Mytqc29uJyxcbiAgICAgICBBdXRob3JpemF0aW9uOiAndG9rZW4gOGZiZmM1NDBmMWVkMTQxNzA4M2M3MGE5OTBiNGRiM2M5YWE4NmVmZSdcbiAgICAgfVxuICAgfVxuIH0pO1xuXG4gZ2l0aHViLmFkZCgnc2VhcmNoJywge1xuICBzZWFyY2hNZXRob2Q6IGZ1bmN0aW9uKCl7XG4gICAgY29uc29sZS5sb2coICdzZWFyY2g6OnNlYXJjaE1ldGhvZCcgKTtcbiAgfVxuIH0pO1xuIGdpdGh1Yi5zZWFyY2guYWRkKCd1c2VycycsIHtcbiAgdXNlcnNNZXRob2Q6IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5wYXJlbnQuc2VhcmNoTWV0aG9kKCk7XG4gIH1cbiB9KTtcblxuIC8vINCU0L7QsdCw0LLQu9GP0LXQvCDRgNC10YHRg9GA0YHRi1xuIGdpdGh1Yi5hZGQoJ3VzZXInKTtcbiBnaXRodWIuYWRkKCd1c2VycycpO1xuIGdpdGh1Yi51c2Vycy5hZGQoJ3JlcG9zJyk7XG5cbiAvLyDQn9GA0L7Rh9C40YLQsNGC0Ywg0YDQtdC/0L7Qt9C40YLQvtGA0LjQuCAo0L7RgtC/0YDQsNCy0LjRgtGMINCz0LXRgiDQt9Cw0L/RgNC+0YEg0L3QsCBodHRwczovL2FwaS5naXRodWIuY29tL3VzZXJzL3JlcG9zLylcbiBnaXRodWIudXNlcnMucmVwb3MucmVhZCgpO1xuXG4gLy8g0J3QtSDRgdC+0LLRgdC10LwgUkVTVCwg0LLRgdC1INC30LDQv9GA0L7RgdGLINC40LTRg9GCINC90LAg0L7QtNC40L0g0LDQtNGA0LXRgVxuIHZhciBzaW1wbGVBcGkgPSBBcGlDbGllbnQoJ2FwaS5leGFtcGxlLmNvbScsIHt9KTtcblxuIHNpbXBsZUFwaSgpLnJlYWQoe1xuICBlOiAnL0Jhc2UvRGVwYXJ0bWVudCdcbiB9KTtcblxuIHNpbXBsZUFwaS5wb3N0KHsgZGF0YSB9KTtcbiBzaW1wbGVBcGkoJ2lkZW50aXR5JykucG9zdCh7IGRhdGEgfSwgeyBhamF4U2V0dGluZ3MgfSk7XG4gc2ltcGxlQXBpKCdpZGVudGl0eScpLnBvc3QoIG51bGwsIHsgYWpheFNldHRpbmdzIH0pO1xuIHNpbXBsZUFwaS5wb3N0KHsgZGF0YSB9LCB7IGFqYXhTZXR0aW5ncyB9KTtcbiBzaW1wbGVBcGkucG9zdCggbnVsbCwgeyBhamF4U2V0dGluZ3MgfSk7XG5cbiBzaW1wbGVBcGkucmVhZChkb25lQ2FsbGJhY2spLmRvbmUoY2FsbGJhY2spLmZhaWwoY2FsbGJhY2spO1xuXG4g0KDQsNCx0L7RgtCwINGBINC00L7QutGD0LzQtdC90YLQsNC80LgsINC+0L0g0YHQsNC8INC/0YDQtdC+0LHRgNCw0LfRg9C10YLRgdGPINGH0LXRgNC10Lcg0LzQtdGC0L7QtCAkX19kZWx0YSgpXG4gc2ltcGxlQXBpLnBvc3QoIERvY3VtZW50ICk7XG4gc2ltcGxlQXBpLnNhdmUoIERvY3VtZW50ICk7XG5cblxuIGFqYXhTZXR0aW5ncyDQtNC70Y8g0LrQsNC20LTQvtCz0L4g0LfQsNC/0YDQvtGB0LBcbiBJZGVudGl0eSDQtNC70Y8g0LrQsNC20LTQvtCz0L4g0LfQsNC/0YDQvtGB0LBcblxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHJlc291cmNlTWl4aW4gPSB7XG4gIHJlc291cmNlTmFtZTogJ3Jlc291cmNlJyxcbiAgdXJsOiAnJywgLy8gPSByZXNvdXJjZU5hbWVcblxuICAvKipcbiAgICog0JTQvtCx0LDQstC40YLRjCDQvdC+0LLRi9C5INGA0LXRgdGD0YDRgVxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gcmVzb3VyY2VOYW1lXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbcGFyZW50UmVzb3VyY2VdIC0g0YDQvtC00LjRgtC10LvRjNGB0LrQuNC5INGA0LXRgdGD0YDRgVxuICAgKiBAcGFyYW0ge29iamVjdH0gW3VzZXJzTWl4aW5dIC0g0L/QvtC70YzQt9C+0LLQsNGC0LXQu9GM0YHQutCw0Y8g0L/RgNC40LzQtdGB0YxcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBhZGQ6IGZ1bmN0aW9uKCByZXNvdXJjZU5hbWUsIHBhcmVudFJlc291cmNlLCB1c2Vyc01peGluICl7XG4gICAgaWYgKCAhdXNlcnNNaXhpbiApIHtcbiAgICAgIHVzZXJzTWl4aW4gPSBwYXJlbnRSZXNvdXJjZSB8fCB7fTtcbiAgICAgIHBhcmVudFJlc291cmNlID0gdGhpcztcbiAgICB9XG5cbiAgICAvLyDQkdGA0L7RgdC40YLRjCDQuNGB0LrQu9GO0YfQtdC90LjQtSwg0LXRgdC70Lgg0YLQsNC60L7QuSDRgNC10YHRg9GA0YEg0YPQttC1INC10YHRgtGMXG4gICAgaWYgKCB0aGlzWyByZXNvdXJjZU5hbWUgXSApe1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcign0KDQtdGB0YPRgNGBINGBINC90LDQt9Cy0LDQvdC40LXQvCAnICsgcmVzb3VyY2VOYW1lICsgJ9GD0LbQtSDQtdGB0YLRjC4nKTtcbiAgICB9XG5cbiAgICAvLyDQm9GO0LHQvtC5INC40Lcg0Y3RgtC40YUg0L/QsNGA0LDQvNC10YLRgNC+0LIg0YPQutCw0LfRi9Cy0LDQtdGCINC90LAg0L3QtdC+0LHRhdC+0LTQuNC80L7RgdGC0Ywg0LjRgdC/0L7Qu9GM0LfQvtCy0LDRgtGMINGF0YDQsNC90LjQu9C40YnQtVxuICAgIGlmICggdXNlcnNNaXhpbi5zY2hlbWFOYW1lIHx8IHVzZXJzTWl4aW4uY29sbGVjdGlvbk5hbWUgfHwgdXNlcnNNaXhpbi5zdG9yYWdlICkge1xuICAgICAgLy8g0J7Qv9GA0LXQtNC10LvQuNC8INC90LDQt9Cy0LDQvdC40LUg0YHQvtC30LTQsNCy0LDQtdC80L7QuSDQutC+0LvQu9C10LrRhtC40LhcbiAgICAgIHVzZXJzTWl4aW4uY29sbGVjdGlvbk5hbWUgPSB1c2Vyc01peGluLmNvbGxlY3Rpb25OYW1lIHx8IHJlc291cmNlTmFtZTtcbiAgICB9XG5cbiAgICAvLyDQn9C10YDQtdC0INGB0L7Qt9C00LDQvdC40LXQvCDQutC+0LvQu9C10LrRhtC40Lgg0L3Rg9C20L3QviDRgdC+0LfQtNCw0YLRjCDRgNC10YHRg9GA0YEsINGH0YLQvtCx0Ysg0YMg0LrQvtC70LvQtdC60YbQuNC4INCx0YvQu9CwINGB0YHRi9C70LrQsCDQvdCwINC90LXQs9C+XG4gICAgdGhpc1sgcmVzb3VyY2VOYW1lIF0gPSBuZXcgUmVzb3VyY2UoIHJlc291cmNlTmFtZSwgcGFyZW50UmVzb3VyY2UsIHVzZXJzTWl4aW4gKTtcblxuICAgIC8vINCh0L7Qt9C00LDRgtGMINC60L7Qu9C70LXQutGG0LjRjiwg0LXRgdC70Lgg0Y3RgtC+0LPQviDQtdGJ0LUg0L3QtSDRgdC00LXQu9Cw0LvQuFxuICAgIGlmICggdXNlcnNNaXhpbi5jb2xsZWN0aW9uTmFtZSAmJiAhc3RvcmFnZVsgdXNlcnNNaXhpbi5jb2xsZWN0aW9uTmFtZSBdICl7XG4gICAgICAvLyDQmNGJ0LXQvCDRgdGF0LXQvNGDLCDQtdGB0LvQuCDQvtC90LAg0YPQutCw0LfQsNC90LBcbiAgICAgIHZhciBzY2hlbWEgPSBzdG9yYWdlLnNjaGVtYXNbIHVzZXJzTWl4aW4uc2NoZW1hTmFtZSBdO1xuXG4gICAgICBpZiAoIHNjaGVtYSApe1xuICAgICAgICBzdG9yYWdlLmNyZWF0ZUNvbGxlY3Rpb24oIHVzZXJzTWl4aW4uY29sbGVjdGlvbk5hbWUsIHNjaGVtYSwgdGhpc1sgcmVzb3VyY2VOYW1lIF0gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Jlc291cmNlOjonICsgcmVzb3VyY2VOYW1lICsgJyDQndC10LvRjNC30Y8g0LjRgdC/0L7Qu9GM0LfQvtCy0LDRgtGMINGF0YDQsNC90LjQu9C40YnQtSAo0YHQvtC30LTQsNGC0Ywg0LrQvtC70LvQtdC60YbQuNGOKSwg0L3QtSDRg9C60LDQt9Cw0LIg0YHRhdC10LzRgyDQtNCw0L3QvdGL0YUnKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1sgcmVzb3VyY2VOYW1lIF07XG4gIH0sXG5cbiAgLyoqXG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9haGVja21hbm4vbXF1ZXJ5L2Jsb2IvbWFzdGVyL2xpYi9tcXVlcnkuanNcbiAgICogbXF1ZXJ5LnNlbGVjdFxuICAgKlxuICAgKiBTcGVjaWZpZXMgd2hpY2ggZG9jdW1lbnQgZmllbGRzIHRvIGluY2x1ZGUgb3IgZXhjbHVkZVxuICAgKlxuICAgKiAjIyMjU3RyaW5nIHN5bnRheFxuICAgKlxuICAgKiBXaGVuIHBhc3NpbmcgYSBzdHJpbmcsIHByZWZpeGluZyBhIHBhdGggd2l0aCBgLWAgd2lsbCBmbGFnIHRoYXQgcGF0aCBhcyBleGNsdWRlZC4gV2hlbiBhIHBhdGggZG9lcyBub3QgaGF2ZSB0aGUgYC1gIHByZWZpeCwgaXQgaXMgaW5jbHVkZWQuXG4gICAqXG4gICAqICMjIyNFeGFtcGxlXG4gICAqXG4gICAqICAgICAvLyBpbmNsdWRlIGEgYW5kIGIsIGV4Y2x1ZGUgY1xuICAgKiAgICAgcXVlcnkuc2VsZWN0KCdhIGIgLWMnKTtcbiAgICpcbiAgICogICAgIC8vIG9yIHlvdSBtYXkgdXNlIG9iamVjdCBub3RhdGlvbiwgdXNlZnVsIHdoZW5cbiAgICogICAgIC8vIHlvdSBoYXZlIGtleXMgYWxyZWFkeSBwcmVmaXhlZCB3aXRoIGEgXCItXCJcbiAgICogICAgIHF1ZXJ5LnNlbGVjdCh7YTogMSwgYjogMSwgYzogMH0pO1xuICAgKlxuICAgKiAjIyMjTm90ZVxuICAgKlxuICAgKiBDYW5ub3QgYmUgdXNlZCB3aXRoIGBkaXN0aW5jdCgpYFxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdHxTdHJpbmd9IGFyZ1xuICAgKiBAcmV0dXJuIHtRdWVyeX0gdGhpc1xuICAgKiBAc2VlIFNjaGVtYVR5cGVcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHRyYW5zZm9ybUZpZWxkczogZnVuY3Rpb24gc2VsZWN0ICgpIHtcbiAgICB2YXIgYXJnID0gYXJndW1lbnRzWzBdO1xuICAgIGlmICghYXJnKSByZXR1cm4gdGhpcztcblxuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHNlbGVjdDogc2VsZWN0IG9ubHkgdGFrZXMgMSBhcmd1bWVudFwiKTtcbiAgICB9XG5cbiAgICB2YXIgZmllbGRzID0gdGhpcy5fZmllbGRzIHx8ICh0aGlzLl9maWVsZHMgPSB7fSk7XG4gICAgdmFyIHR5cGUgPSB0eXBlb2YgYXJnO1xuXG4gICAgaWYgKCdzdHJpbmcnID09IHR5cGUgfHwgJ29iamVjdCcgPT0gdHlwZSAmJiAnbnVtYmVyJyA9PSB0eXBlb2YgYXJnLmxlbmd0aCAmJiAhQXJyYXkuaXNBcnJheShhcmcpKSB7XG4gICAgICBpZiAoJ3N0cmluZycgPT0gdHlwZSlcbiAgICAgICAgYXJnID0gYXJnLnNwbGl0KC9cXHMrLyk7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBhcmcubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgdmFyIGZpZWxkID0gYXJnW2ldO1xuICAgICAgICBpZiAoIWZpZWxkKSBjb250aW51ZTtcbiAgICAgICAgdmFyIGluY2x1ZGUgPSAnLScgPT0gZmllbGRbMF0gPyAwIDogMTtcbiAgICAgICAgaWYgKGluY2x1ZGUgPT09IDApIGZpZWxkID0gZmllbGQuc3Vic3RyaW5nKDEpO1xuICAgICAgICBmaWVsZHNbZmllbGRdID0gaW5jbHVkZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgaWYgKF8uaXNPYmplY3QoYXJnKSAmJiAhQXJyYXkuaXNBcnJheShhcmcpKSB7XG4gICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGFyZyk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgZmllbGRzW2tleXNbaV1dID0gYXJnW2tleXNbaV1dO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBzZWxlY3QoKSBhcmd1bWVudC4gTXVzdCBiZSBzdHJpbmcgb3Igb2JqZWN0LicpO1xuICB9LFxuXG4gIC8vINCf0YDQvtCx0LXQttCw0YLRjNGB0Y8g0L/QviDQstGB0LXQvCDRgNC+0LTQuNGC0LXQu9GP0Lwg0Lgg0YHQvtCx0YDQsNGC0YwgdXJsICjQsdC10LcgcXVlcnkgc3RyaW5nKVxuICBjb25zdHJ1Y3RVcmw6IGZ1bmN0aW9uIGNvbnN0cnVjdFVybCggcmVjdXJzaW9uQ2FsbCApe1xuICAgIC8vIHRvZG86INC/0YDQvtCy0LXRgNC40YLRjCDQvdCw0LTQvtCx0L3QvtGB0YLRjCDQt9Cw0LrQvtC80LzQtdC90YLQuNGA0L7QstCw0L3QvdC+0LPQviDQutC+0LTQsFxuICAgIC8vINGD0YHQu9C+0LLQuNC1INGBIHJlY3Vyc2lvbkNhbGwg0LTQvtCx0LDQstC70Y/QtdGCINGB0LvRjdGIINCyINGD0YDQuyDQv9C10YDQtdC0INC30L3QsNC60L7QvCDQstC+0L/RgNC+0YHQsFxuICAgIC8vdmFyIGlkZW50aXR5ID0gdGhpcy5pZGVudGl0eSA/ICcvJyArIHRoaXMuaWRlbnRpdHkgOiByZWN1cnNpb25DYWxsID8gJycgOiAnLyc7XG4gICAgdmFyIGlkZW50aXR5ID0gdGhpcy5pZGVudGl0eSA/ICcvJyArIHRoaXMuaWRlbnRpdHkgOiAnJztcblxuICAgIC8vINCf0YDQvtCx0LXQttCw0YLRjNGB0Y8g0L/QviDQstGB0LXQvCDRgNC10YHRg9GA0YHQsNC8INC4INC30LDQs9C70Y/QvdGD0YLRjCDQsiDQutC+0YDQtdC90Ywg0LDQv9C4LCDRh9GC0L7QsdGLINGB0L7QsdGA0LDRgtGMIHVybFxuICAgIHJldHVybiB0aGlzLnBhcmVudFJlc291cmNlXG4gICAgICA/IGNvbnN0cnVjdFVybC5jYWxsKCB0aGlzLnBhcmVudFJlc291cmNlLCB0cnVlICkgKyAnLycgKyB0aGlzLnVybCArIGlkZW50aXR5XG4gICAgICA6IHRoaXMudXJsO1xuICB9LFxuXG4gIF9yZXNvdXJjZVJlcXVlc3Q6IGZ1bmN0aW9uKCBtZXRob2QsIGFqYXhTZXR0aW5ncywgZG9uZUNhbGxiYWNrICl7XG4gICAgdmFyIHVybCA9IHRoaXMuY29uc3RydWN0VXJsKClcbiAgICAgICwgdXNlTm90aWZpY2F0aW9ucyA9IHRoaXMubm90aWZpY2F0aW9ucztcblxuICAgIGNvbnNvbGUubG9nKCB0aGlzLnJlc291cmNlTmFtZSArICc6OicgKyBtZXRob2QgKyAnICcgKyB1cmwgKTtcbiAgICByZXR1cm4gdGhpcy5pbnN0YW5jZS5fcmVxdWVzdCggbWV0aG9kLCB1cmwsIGFqYXhTZXR0aW5ncy5kYXRhLCBhamF4U2V0dGluZ3MsIHVzZU5vdGlmaWNhdGlvbnMsIGRvbmVDYWxsYmFjayApO1xuICB9XG59O1xuXG52YXIgcmVxdWVzdHNUYWJsZSA9IFtdO1xuXG52YXIgbWV0aG9kc01hcCA9IHtcbiAgJ2NyZWF0ZSc6ICdQT1NUJyxcbiAgJ3JlYWQnOiAgICdHRVQnLFxuICAndXBkYXRlJzogJ1BVVCcsXG4gICdkZWxldGUnOiAnREVMRVRFJyxcbiAgJ3BhdGNoJzogICdQQVRDSCcsXG5cbiAgJ3Bvc3QnOiAgICdQT1NUJyxcbiAgJ2dldCc6ICAgICdHRVQnLFxuICAnc2F2ZSc6ICAgJ1BVVCdcbn07XG5cbl8uZm9yRWFjaCggT2JqZWN0LmtleXMoIG1ldGhvZHNNYXAgKSwgZnVuY3Rpb24oIHZlcmIgKXtcbiAgLyoqXG4gICAqINCX0LDQv9GA0L7RgdGLIGNyZWF0ZSByZWFkIHVwZGF0ZSBkZWxldGUgcGF0Y2ggZ2V0IHBvc3RcbiAgICpcbiAgICog0JIgYWpheFNldHRpbmdzINC80L7QttC90L4g0YPQutCw0LfQsNGC0Ywg0L/QvtC70LUgZG9Ob3RTdG9yZSAtINGH0YLQvtCx0Ysg0L3QtSDRgdC+0YXRgNCw0L3Rj9GC0Ywg0L/QvtC70YPRh9C10L3QvdGL0Lkg0L7QsdGK0LXQutGCINCyIHN0b3JhZ2VcbiAgICpcbiAgICogQHBhcmFtIFtkYXRhXVxuICAgKiBAcGFyYW0gW2FqYXhTZXR0aW5nc11cbiAgICogQHBhcmFtIFtkb25lQ2FsbGJhY2tdXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgcmVzb3VyY2VNaXhpblsgdmVyYiBdID0gZnVuY3Rpb24oIGRhdGEsIGFqYXhTZXR0aW5ncywgZG9uZUNhbGxiYWNrICl7XG4gICAgdmFyIHJlc291cmNlID0gdGhpcyxcbiAgICAgIGlkZW50aXR5ID0gdGhpcy5pZGVudGl0eSxcbiAgICAgIG1ldGhvZCA9IHRoaXMuaW5zdGFuY2UubWV0aG9kc01hcFsgdmVyYl0sXG4gICAgICBkb2N1bWVudElkU3RyaW5nO1xuXG4gICAgLy8g0JXRgdC70LggZGF0YSAtINC10YHRgtGMINGE0YPQvdC60YbQuNGPLCDRgtC+INGN0YLQviBkb25lQ2FsbGJhY2tcbiAgICBpZiAoICQuaXNGdW5jdGlvbiggZGF0YSApICl7XG4gICAgICBkb25lQ2FsbGJhY2sgPSBkYXRhO1xuICAgICAgZGF0YSA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgaWYgKCAkLmlzRnVuY3Rpb24oIGFqYXhTZXR0aW5ncyApICl7XG4gICAgICBkb25lQ2FsbGJhY2sgPSBhamF4U2V0dGluZ3M7XG4gICAgICBhamF4U2V0dGluZ3MgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgYWpheFNldHRpbmdzID0gYWpheFNldHRpbmdzIHx8IHt9O1xuXG4gICAgLy8g0J/RgNC4INGB0L7RhdGA0LDQvdC10L3QuNC4INC00L7QutGD0LzQtdC90YLQsCDQvdGD0LbQvdC+INGB0L7RhdGA0LDQvdGP0YLRjCDRgtC+0LvRjNC60L4g0LjQt9C80LXQvdGR0L3QvdGL0LUg0L/QvtC70Y9cbiAgICBpZiAoIG1ldGhvZCA9PT0gJ1BPU1QnIHx8IG1ldGhvZCA9PT0gJ1BVVCcgKXtcbiAgICAgIC8vINCY0L3QvtCz0LTQsCDQv9C10YDQtdC00LDRjtGCINC00L7QutGD0LzQtdC90YJcbiAgICAgIGlmICggZGF0YSBpbnN0YW5jZW9mIHN0b3JhZ2UuRG9jdW1lbnQgKSB7XG4gICAgICAgIGRvY3VtZW50SWRTdHJpbmcgPSBkYXRhLl9pZC50b1N0cmluZygpO1xuICAgICAgICBkYXRhID0gZGF0YS4kX19kZWx0YSgpO1xuXG4gICAgICAgIC8vINCi0LDQuiDQvNC+0LbQvdC+INC/0L7QvdGP0YLRjCwg0YfRgtC+INC80Ysg0YHQvtGF0YDQsNC90Y/QtdC8INGB0YPRidC10YLQstGD0Y7RidC40Lkg0L3QsCDRgdC10YDQstC10YDQtSBEb2N1bWVudFxuICAgICAgfSBlbHNlIGlmICggc3RvcmFnZS5PYmplY3RJZC5pc1ZhbGlkKCBpZGVudGl0eSApICkge1xuICAgICAgICBkb2N1bWVudElkU3RyaW5nID0gaWRlbnRpdHk7XG5cbiAgICAgICAgLy8g0J/RgNC4INGB0L7RhdGA0LDQvdC10L3QuNC4INGH0LXRgNC10Lcg0LzQtdGC0L7QtCBzYXZlKCkg0YMg0LTQvtC60YPQvNC10L3RgtCwXG4gICAgICB9IGVsc2UgaWYgKCBkYXRhLl9pZCAmJiBzdG9yYWdlLk9iamVjdElkLmlzVmFsaWQoIGRhdGEuX2lkICkgKSB7XG4gICAgICAgIGRvY3VtZW50SWRTdHJpbmcgPSBkYXRhLl9pZC50b1N0cmluZygpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGFqYXhTZXR0aW5ncy5kYXRhID0gZGF0YTtcblxuICAgIHZhciByZXFJbmZvID0ge1xuICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICB1cmw6IHRoaXMuY29uc3RydWN0VXJsKCksXG4gICAgICBhamF4U2V0dGluZ3M6IGFqYXhTZXR0aW5ncyxcbiAgICAgIHJlc3VsdDogbnVsbCxcbiAgICAgIG1ldGE6IG51bGxcbiAgICB9O1xuXG4gICAgLy9UT0RPOiDQtNC+0LTQtdC70LDRgtGMINC60Y3RiNC40YDQvtCy0LDQvdC40LVcbiAgICAvLyDQmtGN0YjQuNGA0L7QstCw0L3QuNC1INC90LAg0YfRgtC10L3QuNC1XG4gICAgaWYgKCBtZXRob2QgPT09ICdHRVQnICl7XG4gICAgICB2YXIgaW5DYWNoZSA9IF8uZmluZCggcmVxdWVzdHNUYWJsZSwgcmVxSW5mbyApO1xuXG4gICAgICBpZiAoIHJlc291cmNlLnN0b3JhZ2UgJiYgaWRlbnRpdHkgJiYgaW5DYWNoZSApe1xuICAgICAgICAvLyDQldGB0LvQuCDQtNCw0L3QvdC+0LUg0LXRgdGC0YwgLSDQstC10YDQvdGD0YLRjCDQtdCz0L5cbiAgICAgICAgaWYgKCBpbkNhY2hlLnJlc3VsdCApe1xuICAgICAgICAgIGRvbmVDYWxsYmFjayAmJiBkb25lQ2FsbGJhY2soIGluQ2FjaGUucmVzdWx0LCBpbkNhY2hlLm1ldGEgKTtcbiAgICAgICAgICB0aGlzLmlkZW50aXR5ID0gJyc7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGRmZCA9ICQuRGVmZXJyZWQoKTtcbiAgICB0aGlzLl9yZXNvdXJjZVJlcXVlc3QoIHZlcmIsIGFqYXhTZXR0aW5ncyApLmRvbmUoZnVuY3Rpb24oIHJlc3BvbnNlLCB0ZXh0U3RhdHVzLCBqcVhIUiApe1xuICAgICAgdmFyIHJlc3VsdCwgZmllbGRzO1xuXG4gICAgICAvLyNleGFtcGxlICAgIHZzLmFwaS5wbGFjZXMoe2ZpZWxkczogJ25hbWUnLCBza2lwOiAxMDB9KS5nZXQoZnVuY3Rpb24ocmVzKXtjb25zb2xlLmxvZyhyZXMpfSk7XG4gICAgICAvLyDQldGB0LvQuCDQsdGL0LvQsCDQstGL0LHQvtGA0LrQsCDQv9C+INC/0L7Qu9GP0LwsINC90YPQttC90L4g0L/RgNCw0LLQuNC70YzQvdC+INC+0LHRgNCw0LHQvtGC0LDRgtGMINC10ZEg0Lgg0L/QtdGA0LXQtNCw0YLRjCDQsiDQtNC+0LrRg9C80LXQvdGCXG4gICAgICBpZiAoIGRhdGEgJiYgZGF0YS5maWVsZHMgKXtcbiAgICAgICAgZmllbGRzID0gcmVzb3VyY2UudHJhbnNmb3JtRmllbGRzKCBkYXRhLmZpZWxkcyApO1xuICAgICAgfVxuXG4gICAgICAvLyDQn9GA0Lgg0LjRgdC/0L7Qu9GM0LfQvtCy0LDQvdC40Lgg0L/QsNGA0LDQvNC10YLRgNCwIGRvTm90U3RvcmUgLSDQvdC1INC90LDQtNC+INGB0L7RhdGA0LDQvdGP0YLRjCDQvtGC0LLQtdGCINCyINGF0YDQsNC90LjQu9C40YnQtVxuICAgICAgaWYgKCByZXNvdXJjZS5zdG9yYWdlICYmICFhamF4U2V0dGluZ3MuZG9Ob3RTdG9yZSApe1xuICAgICAgICAvLyDQn9GA0Lgg0YHQvtGF0YDQsNC90LXQvdC40Lgg0Lgg0L7QsdC90L7QstC70LXQvdC40Lgg0L3Rg9C20L3QviDQvtCx0L3QvtCy0LvRj9GC0Ywg0LTQvtC60YPQvNC10L3RglxuICAgICAgICBpZiAoIG1ldGhvZCA9PT0gJ1BPU1QnIHx8IG1ldGhvZCA9PT0gJ1BVVCcgKXtcbiAgICAgICAgICAvLyDQn9C+0L/RgNC+0LHRg9C10Lwg0YHQvdCw0YfQsNC70LAg0L3QsNC50YLQuCDQtNC+0LrRg9C80LXQvdGCINC/0L4gaWQg0Lgg0L7QsdC90L7QstC40YLRjCDQtdCz0L5cbiAgICAgICAgICByZXN1bHQgPSBzdG9yYWdlWyByZXNvdXJjZS5jb2xsZWN0aW9uTmFtZSBdLmZpbmRCeUlkKCBkb2N1bWVudElkU3RyaW5nICk7XG5cbiAgICAgICAgICBpZiAoIHJlc3VsdCApe1xuICAgICAgICAgICAgLy8g0J7QsdC90L7QstC70Y/QtdC8INC00L7QutGD0LzQtdC90YJcbiAgICAgICAgICAgIHJlc3VsdC5zZXQoIHJlc3BvbnNlLnJlc3VsdCApO1xuXG4gICAgICAgICAgICAvLyDQodC+0LfQtNCw0ZHQvCDRgdGB0YvQu9C60YMg0L/QviDQvdC+0LLQvtC80YMgaWQg0LIg0LrQvtC70LvQtdC60YbQuNC4XG4gICAgICAgICAgICBzdG9yYWdlWyByZXNvdXJjZS5jb2xsZWN0aW9uTmFtZSBdLmRvY3VtZW50c1sgZG9jdW1lbnRJZFN0cmluZyBdID0gcmVzdWx0O1xuXG4gICAgICAgICAgICAvLyDQrdGC0L7RgiDQtNC+0LrRg9C80LXQvdGCINGC0LXQv9C10YDRjCDRgdC+0YXRgNCw0L3RkdC9INC90LAg0YHQtdGA0LLQtdGA0LUsINC30L3QsNGH0LjRgiDQvtC9INGD0LbQtSDQvdC1INC90L7QstGL0LkuXG4gICAgICAgICAgICByZXN1bHQuaXNOZXcgPSBmYWxzZTtcblxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQgPSBzdG9yYWdlWyByZXNvdXJjZS5jb2xsZWN0aW9uTmFtZSBdLmFkZCggcmVzcG9uc2UucmVzdWx0IHx8IHJlc3BvbnNlLCB1bmRlZmluZWQsIHRydWUgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIGlmICggbWV0aG9kID09PSAnR0VUJyApe1xuICAgICAgICAgIC8vINCd0LUg0LTQvtCx0LDQstC70Y/RgtGMINCyINGF0YDQsNC90LjQu9C40YnQtSDRgNC10LfRg9C70YzRgtCw0YIg0LfQsNC/0YDQvtGB0L7QsiDRgSDQstGL0LHQvtGA0LrQvtC5INC/0L7Qu9C10LlcbiAgICAgICAgICBpZiAoIGZpZWxkcyApe1xuICAgICAgICAgICAgcmVzdWx0ID0gcmVzcG9uc2UucmVzdWx0O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQgPSBzdG9yYWdlWyByZXNvdXJjZS5jb2xsZWN0aW9uTmFtZSBdLmFkZCggcmVzcG9uc2UucmVzdWx0IHx8IHJlc3BvbnNlLCBmaWVsZHMsIHRydWUgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdCA9IHJlc3BvbnNlLnJlc3VsdCB8fCByZXNwb25zZTtcbiAgICAgIH1cblxuICAgICAgLy8g0KHQvtGF0YDQsNC90LjRgtGMINC/0LDRgNCw0LzQtdGC0YDRiyDQt9Cw0L/RgNC+0YHQsCDQuCDQvtGC0LLQtdGCINC00LvRjyDQutGN0YjQuNGA0L7QstCw0L3QuNGPXG4gICAgICByZXFJbmZvLnJlc3VsdCA9IHJlc3VsdDtcbiAgICAgIHJlcUluZm8ubWV0YSA9IHJlc3BvbnNlLm1ldGE7XG4gICAgICByZXF1ZXN0c1RhYmxlLnB1c2goIHJlcUluZm8gKTtcblxuICAgICAgZG9uZUNhbGxiYWNrICYmIGRvbmVDYWxsYmFjayggcmVzdWx0LCByZXNwb25zZS5tZXRhICk7XG4gICAgICBkZmQucmVzb2x2ZSggcmVzdWx0LCByZXNwb25zZS5tZXRhLCB0ZXh0U3RhdHVzLCBqcVhIUiApO1xuXG4gICAgfSkuZmFpbChmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICl7XG4gICAgICBkZmQucmVqZWN0KCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKTtcbiAgICB9KTtcblxuICAgIC8vVE9ETzog0JjRgdC/0L7Qu9GM0LfQvtCy0LDRgtGMINC40LTQtdC+0LvQvtCz0Y4gcXVlcnk/IHF1ZXJ5INC+0LHRitC10LrRgiDQtNC70Y8g0L/QvtGB0YLRgNC+0LXQvdC40Y8g0LfQsNC/0YDQvtGB0L7QslxuXG4gICAgLy8gaWRlbnRpdHkg0YHQvtGF0YDQsNC90Y/QtdGC0YHRjyDQtNC70Y8gY29uc3RydWN0VXJsLCDQtdCz0L4g0L3Rg9C20L3QviDQvtGH0LjRgdGC0LjRgtGMINC00LvRjyDQv9C+0YHQu9C10LTRg9GO0YnQuNGFINC30LDQv9GA0L7RgdC+0LIuXG4gICAgdGhpcy5pZGVudGl0eSA9ICcnO1xuXG4gICAgcmV0dXJuIGRmZDtcbiAgfTtcbn0pO1xuXG4vKipcbiAqINCa0LDQuiDQsdGLINC60L7QvdGB0YLRgNGD0LrRgtC+0YAg0YDQtdGB0YPRgNGB0LAsINC90L4g0LLQvtC30LLRgNCw0YnQsNC10YIg0YTRg9C90LrRhtC40Y4t0L7QsdGK0LXQutGCINGBINC/0YDQuNC80LXRgdGP0LzQuFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSByZXNvdXJjZU5hbWVcbiAqIEBwYXJhbSB7b2JqZWN0fSBwYXJlbnRSZXNvdXJjZVxuICogQHBhcmFtIHtvYmplY3R9IHVzZXJzTWl4aW5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gcmVzb3VyY2VcbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgUmVzb3VyY2UgPSBmdW5jdGlvbiggcmVzb3VyY2VOYW1lLCBwYXJlbnRSZXNvdXJjZSwgdXNlcnNNaXhpbiApe1xuXG4gIC8qKlxuICAgKiDQrdGC0YMg0YTRg9C90LrRhtC40Y4g0LzRiyDQvtGC0LTQsNGR0Lwg0L/QvtC70YzQt9C+0LLQsNGC0LXQu9GOINCyINC60LDRh9C10YHRgtCy0LUg0LTQvtGB0YLRg9C/0LAg0Log0YDQtdGB0YPRgNGB0YMuXG4gICAqINCe0L3QsCDQv9C+0LfQstC+0LvRj9C10YIg0LfQsNC00LDRgtGMIGlkZW50aXR5INC4INC00L7Qv9C+0LvQvdC40YLQtdC70YzQvdGL0LUg0L/QsNGA0LDQvNC10YLRgNGLINCyINC30LDQv9GA0L7RgS5cbiAgICpcbiAgICogQHBhcmFtIFtpZGVudGl0eV1cbiAgICogQHJldHVybnMge0Z1bmN0aW9ufVxuICAgKi9cbiAgdmFyIHJlc291cmNlID0gZnVuY3Rpb24gcmVzb3VyY2UoIGlkZW50aXR5ICl7XG4gICAgaWYgKCBpZGVudGl0eSAmJiAhXy5pc1N0cmluZyggaWRlbnRpdHkgKSApe1xuICAgICAgY29uc29sZS5lcnJvcignaWRlbnRpdHkg0LTQvtC70LbQtdC9INCx0YvRgtGMINGB0YLRgNC+0LrQvtC5LCDQsCDQvdC1JywgaWRlbnRpdHkgKTtcbiAgICB9XG5cbiAgICByZXNvdXJjZS5pZGVudGl0eSA9IGlkZW50aXR5IHx8ICcnO1xuXG4gICAgcmV0dXJuIHJlc291cmNlO1xuICB9O1xuXG4gICQuZXh0ZW5kKCByZXNvdXJjZSwgcmVzb3VyY2VNaXhpbiwge1xuICAgIHJlc291cmNlTmFtZTogcmVzb3VyY2VOYW1lLFxuICAgIHVybDogcmVzb3VyY2VOYW1lXG4gIH0sIHVzZXJzTWl4aW4gKTtcblxuICByZXNvdXJjZS5wYXJlbnRSZXNvdXJjZSA9IHBhcmVudFJlc291cmNlO1xuICByZXNvdXJjZS5pbnN0YW5jZSA9IHBhcmVudFJlc291cmNlLmluc3RhbmNlIHx8IHBhcmVudFJlc291cmNlO1xuXG4gIHJldHVybiByZXNvdXJjZTtcbn07XG5cbi8qKlxuICog0KHQvtC30LTQsNGC0Ywg0L3QvtCy0YvQuSDRjdC60LfQtdC80L/Qu9GP0YAgYXBpINC60LvQuNC10L3RgtCwXG4gKlxuICogQGV4YW1wbGVcbiAqIEFwaUNsaWVudCgnL2FwaScsIHtcbiAqICAgaG9va3M6IHtcbiAqICAgICBoZWFkZXJzOiB7XG4gKiAgICAgICB0b2tlbjogJ1hYWFhYWCdcbiAqICAgICB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIEFwaUNsaWVudCgnaHR0cHM6Ly9kb21haW4uY29tL2FwaScsIHtcbiAqICAgaG9va3M6IHtcbiAqICAgICBoZWFkZXJzOiB7XG4gKiAgICAgICB0b2tlbjogJ1hYWFhYWCdcbiAqICAgICB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIEFwaUNsaWVudCh7XG4gKiAgIHVybDogJy9hcGknXG4gKiAgIGhvb2tzOiB7XG4gKiAgICAgaGVhZGVyczoge1xuICogICAgICAgdG9rZW46ICdYWFhYWFgnXG4gKiAgICAgfVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG52YXIgQXBpQ2xpZW50ID0gZnVuY3Rpb24oIHVybCwgb3B0aW9ucyApe1xuICByZXR1cm4gbmV3IEFwaUNsaWVudC5pbnN0YW5jZS5pbml0KCB1cmwsIG9wdGlvbnMgKTtcbn07XG5cbkFwaUNsaWVudC5pbnN0YW5jZSA9IEFwaUNsaWVudC5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBBcGlDbGllbnQsXG5cbiAgLyoqXG4gICAqINCY0L3QuNGG0LjQsNC70LjQt9Cw0YbQuNGPINC90L7QstC+0LPQviDQsNC/0Lgg0LrQu9C40LXQvdGC0LBcbiAgICogQHBhcmFtIHVybFxuICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgKi9cbiAgaW5pdDogZnVuY3Rpb24oIHVybCwgb3B0aW9ucyApe1xuICAgIGlmICggdHlwZW9mIHVybCA9PT0gJ3N0cmluZycgKXtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgb3B0aW9ucy51cmwgPSB1cmw7XG4gICAgfVxuXG4gICAgLy8g0J/QviDRg9C80L7Qu9GH0LDQvdC40Y4sINGD0LLQtdC00L7QvNC70LXQvdC40Y8g0L7RgtC60LvRjtGH0LXQvdGLXG4gICAgdGhpcy5ub3RpZmljYXRpb25zID0gZmFsc2U7XG5cbiAgICAvKipcbiAgICAgKiDQpdGD0LrQuCDQtNC70Y8gYWpheCBzZXR0aW5ncyAo0LLRi9GB0YLRg9C/0LDQtdGCINCyINGA0L7Qu9C4INCx0LDQt9C+0LLQvtCz0L4gYWpheFNldHRpbmdzKVxuICAgICAqIEBzZWUgaHR0cDovL2FwaS5qcXVlcnkuY29tL2pRdWVyeS5hamF4L1xuICAgICAqXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICB0aGlzLmhvb2tzID0ge1xuICAgICAgLy8g0LTQvtC/0L7Qu9C90LjRgtC10LvRjNC90YvQtSDQtNCw0L3QvdGL0LUg0LfQsNC/0YDQvtGB0LBcbiAgICAgIGRhdGE6IHt9LFxuICAgICAgLy8g0J7QsdGK0LXQutGCINC00LvRjyDQtNC+0LHQsNCy0LvQtdC90LjRjyDQv9GA0L7QuNC30LLQvtC70YzQvdGL0YUg0LfQsNCz0L7Qu9C+0LLQutC+0LIg0LrQviDQstGB0LXQvCDQt9Cw0L/RgNC+0YHQsNC8XG4gICAgICAvLyDRg9C00L7QsdC90L4g0LTQu9GPINCw0LLRgtC+0YDQuNC30LDRhtC40Lgg0L/QviDRgtC+0LrQtdC90LDQvFxuICAgICAgaGVhZGVyczoge31cbiAgICB9O1xuXG4gICAgJC5leHRlbmQoIHRydWUsIHRoaXMsICQuaXNQbGFpbk9iamVjdCggdXJsICkgPyB1cmwgOiBvcHRpb25zICk7XG4gIH0sXG5cbiAgLyoqXG4gICAqINCU0L7QsdCw0LLQuNGC0Ywg0L3QvtCy0YvQuSDRgNC10YHRg9GA0YFcbiAgICogQHNlZSByZXNvdXJjZU1peGluLmFkZFxuICAgKi9cbiAgYWRkOiByZXNvdXJjZU1peGluLmFkZCxcblxuICBtZXRob2RzTWFwOiBtZXRob2RzTWFwLFxuXG4gIF9wcmVwYXJlQWpheFNldHRpbmdzOiBmdW5jdGlvbiggbWV0aG9kLCB1cmwsIGRhdGEsIGFqYXhTZXR0aW5ncyApe1xuICAgIHZhciB0eXBlID0gdGhpcy5tZXRob2RzTWFwWyBtZXRob2QgXVxuICAgICAgLCBfYWpheFNldHRpbmdzID0gJC5leHRlbmQoIHRydWUsIHt9LCB0aGlzLmhvb2tzLCBhamF4U2V0dGluZ3MsIHtcbiAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgdXJsOiB1cmxcbiAgICAgIH0pO1xuXG4gICAgaWYgKCB0aGlzLnRva2VuICYmIGFqYXhTZXR0aW5ncy5oZWFkZXJzICYmIGFqYXhTZXR0aW5ncy5oZWFkZXJzLnRva2VuID09IG51bGwgKXtcbiAgICAgIF9hamF4U2V0dGluZ3MuaGVhZGVycy5BdXRob3JpemF0aW9uID0gJ3Rva2VuICcgKyB0aGlzLnRva2VuO1xuICAgICAgLy9BY2NlcHQ6ICdhcHBsaWNhdGlvbi92bmQuZ2l0aHViLnByZXZpZXcnXG4gICAgfVxuXG4gICAgaWYgKCB0eXBlID09PSAnR0VUJyApe1xuICAgICAgXy5hc3NpZ24oIF9hamF4U2V0dGluZ3MuZGF0YSwgZGF0YSApO1xuICAgIH0gZWxzZSBpZiAoIGRhdGEgKXtcbiAgICAgIC8vINCV0YHQu9C4INGB0L7RhdGA0LDQvdGP0LXQvCDQtNC+0LrRg9C80LXQvdGCLCDQvdGD0LbQvdC+INGB0LTQtdC70LDRgtGMIHRvT2JqZWN0KHtkZXBvcHVsYXRlOiAxfSlcbiAgICAgIGlmICggZGF0YS5jb25zdHJ1Y3RvciAmJiBkYXRhLmNvbnN0cnVjdG9yLm5hbWUgJiYgZGF0YS5jb25zdHJ1Y3Rvci5uYW1lID09PSAnRG9jdW1lbnQnICl7XG4gICAgICAgIF8uYXNzaWduKCBfYWpheFNldHRpbmdzLmRhdGEsIGRhdGEudG9PYmplY3Qoe2RlcG9wdWxhdGU6IDF9KSApO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBfLmFzc2lnbiggX2FqYXhTZXR0aW5ncy5kYXRhLCBkYXRhICk7XG4gICAgICB9XG5cbiAgICAgIGlmICggX2FqYXhTZXR0aW5ncy5jb250ZW50VHlwZSA9PT0gJ2FwcGxpY2F0aW9uL2pzb24nICl7XG4gICAgICAgIF9hamF4U2V0dGluZ3MuZGF0YSA9IEpTT04uc3RyaW5naWZ5KCBfYWpheFNldHRpbmdzLmRhdGEgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyB0b2RvINC/0YDQvtCy0LXRgNGC0Ywg0L3QsNC00L7QsdC90L7RgdGC0Ywg0LrQvtC00LBcbiAgICAvLyDQmNGB0L/QvtC70YzQt9GD0LXRgtGB0Y8g0LTQu9GPINCw0LvQuNCw0YHQvtCyLCDQsiDQutC+0YLQvtGA0YvRhSDQstGC0L7RgNC+0Lkg0L/QsNGA0LDQvNC10YLRgCAtINC10YHRgtGMINC+0LHRitC10LrRgiDQvdCw0YHRgtGA0L7QtdC6XG4gICAgaWYgKCAkLmlzUGxhaW5PYmplY3QoIHVybCApICl7XG4gICAgICBjb25zb2xlLmluZm8oJ9CQ0YXRg9C10YLRjCwg0L3Rg9C20L3Ri9C5INC60L7QtCEhISEnKTtcbiAgICAgIF9hamF4U2V0dGluZ3MgPSB1cmw7XG4gICAgICBkZWJ1Z2dlcjtcbiAgICB9XG5cbiAgICByZXR1cm4gX2FqYXhTZXR0aW5ncztcbiAgfSxcblxuICAvKipcbiAgICog0J7RgtC/0YDQsNCy0LjRgtGMINC30LDQv9GA0L7RgSDQvdCwINGB0LXRgNCy0LXRgFxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbWV0aG9kICAg0J3QsNC30LLQsNC90LjQtSDQvNC10YLQvtC00LAgKFBPU1QsIEdFVCwgUFVULCBERUxFVEUsIFBBVENIKVxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXJsICAg0J/QvtC70L3Ri9C5INGD0YDQuyDRgNC10YHRg9GA0YHQsFxuICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAgINCe0LHRitC10LrRgiDRgSDQtNCw0L3QvdGL0LzQuCDQtNC70Y8g0LfQsNC/0YDQvtGB0LBcbiAgICogQHBhcmFtIHtvYmplY3R9IGFqYXhTZXR0aW5ncyAgINCe0LHRitC10LrRgiDRgSDQvdCw0YHRgtGA0L7QudC60LDQvNC4XG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gdXNlTm90aWZpY2F0aW9ucyAgINCk0LvQsNCzLCDQuNGB0L/QvtC70YzQt9C+0LLQsNGC0Ywg0LvQuCDRg9Cy0LXQtNC+0LzQu9C10L3QuNGPXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGRvbmVDYWxsYmFjayAgINCk0YPQvdC60YbQuNGPINGD0YHQv9C10YjQvdC+0LPQviDQvtCx0YDQsNGC0L3QvtCz0L4g0LLRi9C30L7QstCwXG4gICAqIEByZXR1cm5zIHskLkRlZmVycmVkfSDQstC+0LfQstGA0LDRidCw0LXRgiBqcXVlcnkgYWpheCDQvtCx0YrQtdC60YJcbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9yZXF1ZXN0OiBmdW5jdGlvbiggbWV0aG9kLCB1cmwsIGRhdGEsIGFqYXhTZXR0aW5ncywgdXNlTm90aWZpY2F0aW9ucywgZG9uZUNhbGxiYWNrICl7XG4gICAgaWYgKCAhXy5pc1N0cmluZyggbWV0aG9kICkgKXtcbiAgICAgIHRocm93IG5ldyBFcnJvcign0J/QsNGA0LDQvNC10YLRgCBgbWV0aG9kYCDQtNC+0LvQttC10L0g0LHRi9GC0Ywg0YHRgtGA0L7QutC+0LksINCwINC90LUgJywgbWV0aG9kICk7XG4gICAgfVxuXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgICAsIHR5cGUgPSB0aGlzLm1ldGhvZHNNYXBbIG1ldGhvZCBdXG4gICAgICAsIG5vdGlmaWNhdGlvblR5cGUgPSB0eXBlID09PSAnR0VUJyA/ICdsb2FkJyA6ICggdHlwZSA9PT0gJ1BPU1QnIHx8IHR5cGUgPT09ICdQVVQnIHx8IHR5cGUgPT09ICdQQVRDSCcgKSA/ICdzYXZlJyA6ICdkZWxldGUnXG4gICAgICAsIF9hamF4U2V0dGluZ3MgPSB0aGlzLl9wcmVwYXJlQWpheFNldHRpbmdzKCBtZXRob2QsIHVybCwgZGF0YSwgYWpheFNldHRpbmdzICk7XG5cbiAgICAvLyDQmNGB0L/QvtC70YzQt9C+0LLQsNGC0Ywg0LfQvdCw0YfQtdC90LjQtSDQv9C+INGD0LzQvtC70YfQsNC90LjRjiwg0LXRgdC70LggdXNlTm90aWZpY2F0aW9ucyDQvdC1INC30LDQtNCw0L1cbiAgICAvLyDRgtGD0YIg0LbQtSDQv9C+0YDQstC10YDRj9C10LwsINC/0L7QtNC60LvRjtGH0LXQvdGLINC70Lgg0YPQstC10LTQvtC80LvQtdC90LjRj1xuICAgIGlmICggXy5pc0Jvb2xlYW4oIHVzZU5vdGlmaWNhdGlvbnMgKSApe1xuICAgICAgdXNlTm90aWZpY2F0aW9ucyA9IHVzZU5vdGlmaWNhdGlvbnMgJiYgY2Yubm90aWZpY2F0aW9uO1xuICAgIH0gZWxzZSB7XG4gICAgICB1c2VOb3RpZmljYXRpb25zID0gdGhpcy5ub3RpZmljYXRpb25zICYmIGNmLm5vdGlmaWNhdGlvbjtcbiAgICB9XG5cbiAgICBpZiAoIHVzZU5vdGlmaWNhdGlvbnMgKXtcbiAgICAgIGNmLm5vdGlmaWNhdGlvblsgbm90aWZpY2F0aW9uVHlwZSBdLnNob3coKTtcbiAgICB9XG5cbiAgICByZXR1cm4gJC5hamF4KCBfYWpheFNldHRpbmdzICkuZmFpbChmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICl7XG4gICAgICBjb25zb2xlLndhcm4oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApO1xuXG4gICAgICAvLyBVbmF1dGhvcml6ZWQgQ2FsbGJhY2tcbiAgICAgIGlmICgganFYSFIuc3RhdHVzID09PSA0MDEgJiYgc2VsZi51bmF1dGhvcml6ZWRDYWxsYmFjayApe1xuICAgICAgICBzZWxmLnVuYXV0aG9yaXplZENhbGxiYWNrKCBqcVhIUiwgbWV0aG9kLCB1cmwsIGRhdGEsIGFqYXhTZXR0aW5ncywgZG9uZUNhbGxiYWNrICk7XG5cbiAgICAgICAgLy8g0J3QtSDQv9C+0LrQsNC30YvQstCw0YLRjCDRgdC+0L7QsdGJ0LXQvdC40LUg0YEg0L7RiNC40LHQutC+0Lkg0L/RgNC4IDQwMSwg0LXRgdC70Lgg0LLRgdGRINC/0LvQvtGF0L4sINGC0L4g0YDQvtGD0YLQtdGAINGB0LDQvCDQv9C10YDQtdC60LjQvdC10YIg0L3QsCDRhNC+0YDQvNGDINCy0YXQvtC00LBcbiAgICAgICAgaWYgKCB1c2VOb3RpZmljYXRpb25zICl7XG4gICAgICAgICAgY2Yubm90aWZpY2F0aW9uWyBub3RpZmljYXRpb25UeXBlIF0uaGlkZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoIHVzZU5vdGlmaWNhdGlvbnMgKXtcbiAgICAgICAgY2Yubm90aWZpY2F0aW9uWyBub3RpZmljYXRpb25UeXBlIF0uZmFpbCgpO1xuICAgICAgfVxuXG4gICAgfSkuZG9uZShmdW5jdGlvbigpe1xuICAgICAgaWYgKCB1c2VOb3RpZmljYXRpb25zICl7XG4gICAgICAgIGNmLm5vdGlmaWNhdGlvblsgbm90aWZpY2F0aW9uVHlwZSBdLmhpZGUoKTtcbiAgICAgIH1cbiAgICB9KS5kb25lKCBkb25lQ2FsbGJhY2sgKTtcbiAgfSxcblxuICByZWFkOiBmdW5jdGlvbiggYWpheFNldHRpbmdzLCBkb25lQ2FsbGJhY2sgKXtcbiAgICBjb25zb2xlLmxvZyggJ2FwaTo6cmVhZCcgKTtcbiAgICBpZiAoICQuaXNGdW5jdGlvbiggYWpheFNldHRpbmdzICkgKXtcbiAgICAgIGRvbmVDYWxsYmFjayA9IGFqYXhTZXR0aW5ncztcbiAgICAgIGFqYXhTZXR0aW5ncyA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBhamF4U2V0dGluZ3MgPSBhamF4U2V0dGluZ3MgfHwge307XG5cbiAgICByZXR1cm4gdGhpcy5fcmVxdWVzdCgncmVhZCcsIHRoaXMudXJsLCB1bmRlZmluZWQsIGFqYXhTZXR0aW5ncywgZmFsc2UsIGRvbmVDYWxsYmFjayApO1xuICB9XG59O1xuXG5BcGlDbGllbnQuaW5zdGFuY2UuaW5pdC5wcm90b3R5cGUgPSBBcGlDbGllbnQuaW5zdGFuY2U7XG5cbi8vINCU0L7QsdCw0LLQuNC8IGV4dGVuZCDQtNC70Y8g0LLQvtC30LzQvtC20L3QvtGB0YLQuCDRgNCw0YHRiNC40YDQtdC90LjRj1xuQXBpQ2xpZW50LmV4dGVuZCA9IEFwaUNsaWVudC5pbnN0YW5jZS5leHRlbmQgPSAkLmV4dGVuZDtcblxuLy8gZXhwb3J0c1xubW9kdWxlLmV4cG9ydHMgPSBBcGlDbGllbnQ7Il19
(1)
});
