/**
 * User: Constantine Melnikov
 * Email: ka.melnikov@gmail.com
 * Date: 29.01.15
 * Time: 15:18
 */
'use strict';

var utils = require('./utils');

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

exports.postLikeRequest = postLikeRequest;
exports.createPostLikeRequest = createPostLikeRequest;