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
// http://sinonjs.org/docs/#fakeServer
// http://sinonjs.org/qunit/
// http://jsfiddle.net/jonkemp/ZGrTK/
// http://tutorials.jumpstartlab.com/projects/javascript/testing/2-ajax-and-sinon.html
// https://github.com/tj/supertest
// https://github.com/ded/reqwest - тут есть тесты
// https://github.com/pyrsmk/qwest - тут есть тесты
// https://github.com/natevw/fermata