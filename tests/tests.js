/**
 * User: Constantine Melnikov
 * Email: ka.melnikov@gmail.com
 * Date: 22.01.15
 * Time: 17:30
 */
(function(){
'use strict';

/*QUnit.test('hello test', function( assert ) {
  assert.ok( 1 == '1', 'Passed!' );

  var server = sinon.fakeServer.create();

  server.respondWith(function(xhr){
    console.log("before request.respond()");

    xhr.respond(200, null, "Hello world");

    console.log("after request.respond()");
  });

  var github = ApiClient('https://api.github.com', {
    hooks: {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: 'token e31ba2b2c80dfec76606d3a636e722fe4db0e64c'
      }
    },
    unauthorizedCallback: function(){}
  });

  window.github = github;

  console.log("before make request");

  github.read().done(function( result ){
    console.log( result );

    assert.equal(result, 'Hello world', "id was extracted from the response object");
  });

  console.log("before server.respond()");

  server.respond();

  console.log("after server.respond()");
});*/

describe('collection', function(){
  it('create', function(done){
    done();
  });
});

})();

// Надо подумать, как лучше организовать тестирование
// Вот список вкладок, которые могут понадобиться
// http://qunitjs.com/cookbook/#asynchronous-callbacks
// https://github.com/cjohansen/Sinon.JS
// https://github.com/WP-API/client-js/blob/gh-pages/tests%2Ftests-post.js
// http://www.wenda.io/questions/2580277/sinon-js-1-10-jquery-2-1-and-synchronous-request.html
// http://stackoverflow.com/questions/24961056/sinon-js-1-10-jquery-2-1-and-synchronous-request
// http://jsfiddle.net/kHFf5/
// http://unitjs.com/guide/sinon-js.html
// http://taylor.fausak.me/2013/02/17/testing-a-node-js-http-server-with-mocha/
// https://github.com/narirou/gulp-develop-server
// http://expressjs.com/starter/basic-routing.html