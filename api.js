// API Client
// ---------------

// Example
/*
 var github = ApiClient('https://api.github.com', {
  token: '7d3268a2396ee7f4a601a37054ca8778dd45e8d5'
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

(function(){
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
    // условие с recursionCall добавляет слэш в урл перед знаком вопроса
    var identity = this.identity ? '/' + this.identity : recursionCall ? '' : '/';

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

        // При сохранении через метод save() у документа
      } else if ( data._id && storage.ObjectId.isValid( data._id ) ) {
        documentIdString = data._id.toString();

        // Так можно понять, что мы сохраняем сущетвующий на сервере Document
      } else if ( storage.ObjectId.isValid( identity ) ) {
        documentIdString = identity;
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
*   token: 'XXXXXX'
* });
 *
 * ApiClient('https://domain.com/api', {
*   token: 'XXXXXX'
* });
 *
 * ApiClient({
*   url: '/api'
*   token: 'XXXXXX'
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

    if ( this.token && ajaxSettings.headers.token == null ){
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
    /*if ( _.isBoolean( useNotifications ) ){
      useNotifications = useNotifications && cf.notification;
    } else {
      useNotifications = this.notifications && cf.notification;
    }*/

    /*if ( useNotifications ){
      cf.notification[ notificationType ].show();
    }*/

    return $.ajax( _ajaxSettings ).fail(function( jqXHR, textStatus, errorThrown ){
      console.warn( jqXHR, textStatus, errorThrown );

      // Unauthorized Callback
      if ( jqXHR.status === 401 && self.unauthorizedCallback ){
        self.unauthorizedCallback( jqXHR, method, url, data, ajaxSettings, doneCallback );

        // Не показывать сообщение с ошибкой при 401, если всё плохо, то роутер сам перекинет на форму входа
        /*if ( useNotifications ){
          cf.notification[ notificationType ].hide();
        }*/

        return;
      }

      /*if ( useNotifications ){
        cf.notification[ notificationType ].fail();
      }*/

    }).done(function(){
      /*if ( useNotifications ){
        cf.notification[ notificationType ].hide();
      }*/
    }).done( doneCallback );
  },

  read: function( ajaxSettings, doneCallback ){
    console.log( 'api::read' );
    if ( $.isFunction( ajaxSettings ) ){
      doneCallback = ajaxSettings;
      ajaxSettings = undefined;
    }

    return this._request('read', this.url, undefined, ajaxSettings, false, doneCallback );
  }
};

ApiClient.instance.init.prototype = ApiClient.instance;

// Добавим extend для возможности расширения
ApiClient.extend = ApiClient.instance.extend = $.extend;
//cf.ApiClient = ApiClient;

})();