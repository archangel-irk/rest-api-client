/**
 * User: Constantine Melnikov
 * Email: ka.melnikov@gmail.com
 * Date: 22.01.15
 * Time: 17:30
 */
(function(){
'use strict';

describe('utils', function(){
  describe('select', function(){
    it('with 0 args', function(){
      assert.equal( undefined, ApiClient.utils.select() );
    });

    it('accepts an object', function(){
      var o = { x: 1, y: 1 };
      assert.deepEqual( ApiClient.utils.select( o ), o );
    });

    it('accepts a string', function(){
      var o = 'x -y';
      assert.deepEqual( ApiClient.utils.select( o ), { x: 1, y: 0 });
    });

    it('does not accept an array', function( done ){
      assert.throws(function(){
        var o = ['x', '-y'];
        ApiClient.utils.select( o );
      }, /Invalid select/);
      done();
    });

    it('rejects non-string, object, arrays', function(){
      assert.throws(function(){
        ApiClient.utils.select(function(){});
      }, /Invalid select\(\) argument/);
    });

    it('accepts aguments objects', function(){
      function t(){
        var fields = ApiClient.utils.select( arguments );
        assert.deepEqual( fields, { x: 1, y: 0 });
      }

      t('x', '-y');
    });
  });
});

describe('ApiClient', function(){
  //this.timeout( 0 );

  it('read root', function( done ){
    var api = new ApiClient('http://0.0.0.0:3000');

    api.read().done(function( data ){
      assert.equal( data.user, 'tobi' );

      done();
    });
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