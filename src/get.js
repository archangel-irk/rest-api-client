/**
 * User: Constantine Melnikov
 * Email: ka.melnikov@gmail.com
 * Date: 29.01.15
 * Time: 15:12
 */
import { utils } from './utils.js';

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
export function getRequest( data, ajaxSettings, done ){
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
