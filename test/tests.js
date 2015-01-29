/**
 * User: Constantine Melnikov
 * Email: ka.melnikov@gmail.com
 * Date: 22.01.15
 * Time: 17:30
 */
(function(){
'use strict';

describe('utils', function(){
  describe('deepMerge', function(){
    it('add keys in target that do not exist at the root', function(){
      var src = {key1: 'value1', key2: 'value2'};
      var target = {};

      var res = ApiClient.utils.deepMerge( target, src );

      assert.deepEqual( target, {}, 'merge should be immutable' );
      assert.deepEqual( res, src );
    });

    it('merge existing simple keys in target at the roots', function(){
      var src = {key1: 'changed', key2: 'value2'};
      var target = {key1: 'value1', key3: 'value3'};

      var expected = {
        key1: 'changed', key2: 'value2', key3: 'value3'
      };

      assert.deepEqual( target, {key1: 'value1', key3: 'value3'} );
      assert.deepEqual( ApiClient.utils.deepMerge( target, src ), expected );
    });

    it('merge nested objects into target', function(){
      var src = {
        key1: {
          subkey1: 'changed', subkey3: 'added'
        }
      };
      var target = {
        key1: {
          subkey1: 'value1', subkey2: 'value2'
        }
      };

      var expected = {
        key1: {
          subkey1: 'changed', subkey2: 'value2', subkey3: 'added'
        }
      };

      assert.deepEqual( target, {
        key1: {
          subkey1: 'value1', subkey2: 'value2'
        }
      } );
      assert.deepEqual( ApiClient.utils.deepMerge( target, src ), expected );
    });

    it('replace simple key with nested object in target', function(){
      var src = {
        key1: {
          subkey1: 'subvalue1', subkey2: 'subvalue2'
        }
      };
      var target = {
        key1: 'value1', key2: 'value2'
      };

      var expected = {
        key1: {
          subkey1: 'subvalue1', subkey2: 'subvalue2'
        }, key2: 'value2'
      };

      assert.deepEqual( target, {key1: 'value1', key2: 'value2'} );
      assert.deepEqual( ApiClient.utils.deepMerge( target, src ), expected );
    });

    it('should add nested object in target', function(){
      var src = {
        "b": {
          "c": {}
        }
      };

      var target = {
        "a": {}
      };

      var expected = {
        "a": {}, "b": {
          "c": {}
        }
      };

      assert.deepEqual( ApiClient.utils.deepMerge( target, src ), expected );
    });

    it('should replace object with simple key in target', function(){
      var src = {key1: 'value1'};
      var target = {
        key1: {
          subkey1: 'subvalue1', subkey2: 'subvalue2'
        }, key2: 'value2'
      };

      var expected = {key1: 'value1', key2: 'value2'};

      assert.deepEqual( target, {
        key1: {
          subkey1: 'subvalue1', subkey2: 'subvalue2'
        }, key2: 'value2'
      } );
      assert.deepEqual( ApiClient.utils.deepMerge( target, src ), expected );
    });

    it('should work on simple array', function(){
      var src = ['one', 'three'];
      var target = ['one', 'two'];

      var expected = ['one', 'two', 'three'];

      assert.deepEqual( target, ['one', 'two'] );
      assert.deepEqual( ApiClient.utils.deepMerge( target, src ), expected );
      assert.ok( Array.isArray( ApiClient.utils.deepMerge( target, src ) ) );
    });

    it('should work on another simple array', function(){
      var target = ["a1", "a2", "c1", "f1", "p1"];
      var src = ["t1", "s1", "c2", "r1", "p2", "p3"];

      var expected = ["a1", "a2", "c1", "f1", "p1", "t1", "s1", "c2", "r1", "p2", "p3"];
      assert.deepEqual( target, ["a1", "a2", "c1", "f1", "p1"] );
      assert.deepEqual( ApiClient.utils.deepMerge( target, src ), expected );
      assert.ok( Array.isArray( ApiClient.utils.deepMerge( target, src ) ) );
    });

    it('should work on array properties', function(){
      var src = {
        key1: ['one', 'three'], key2: ['four']
      };
      var target = {
        key1: ['one', 'two']
      };

      var expected = {
        key1: ['one', 'two', 'three'], key2: ['four']
      };

      assert.deepEqual( target, {
        key1: ['one', 'two']
      });

      assert.deepEqual( ApiClient.utils.deepMerge( target, src ), expected );
      assert.ok( Array.isArray( ApiClient.utils.deepMerge( target, src ).key1 ) );
      assert.ok( Array.isArray( ApiClient.utils.deepMerge( target, src ).key2 ) );
    });

    it('should work on array of objects', function(){
      var src = [{key1: ['one', 'three'], key2: ['one']}, {key3: ['five']}];
      var target = [{key1: ['one', 'two']}, {key3: ['four']}];

      var expected = [{key1: ['one', 'two', 'three'], key2: ['one']}, {key3: ['four', 'five']}];

      assert.deepEqual( target, [{key1: ['one', 'two']}, {key3: ['four']}] );
      assert.deepEqual( ApiClient.utils.deepMerge( target, src ), expected );
      assert.ok( Array.isArray( ApiClient.utils.deepMerge( target, src ) ), 'result should be an array' );
      assert.ok( Array.isArray( ApiClient.utils.deepMerge( target, src )[0].key1 ), 'subkey should be an array too' );
    });

    it('should work on arrays of nested objects', function(){
      var target = [{key1: {subkey: 'one'}}];

      var src = [{key1: {subkey: 'two'}}, {key2: {subkey: 'three'}}];

      var expected = [{key1: {subkey: 'two'}}, {key2: {subkey: 'three'}}];

      assert.deepEqual( ApiClient.utils.deepMerge( target, src ), expected );
    });
  });

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

  it('create without `new`', function(  ){
    assert.ok( ApiClient() instanceof ApiClient );
  });

  it('read root .done()', function( done ){
    var api = new ApiClient('http://0.0.0.0:3000');

    api.read().done(function( data ){
      assert.equal( data.user, 'tobi' );

      done();
    });
  });

  it('read root with callback', function( done ){
    var api = new ApiClient('http://0.0.0.0:3000');

    api.read(function( data ){
      assert.equal( data.user, 'tobi' );

      done();
    });
  });

  describe('GET', function(){
    it('users with resource function call and .done()', function( done ){
      var api = new ApiClient('http://0.0.0.0:3000');

      api.add('users');

      api.users().read().done(function( data ){
        assert.deepEqual( data, [{ user: 'tobi' },{ user: 'loki' }] );

        done();
      });
    });

    it('users without resource function call and .done()', function( done ){
      var api = new ApiClient('http://0.0.0.0:3000');

      api.add('users');

      api.users.read().done(function( data ){
        assert.deepEqual( data, [{ user: 'tobi' },{ user: 'loki' }] );

        done();
      });
    });

    it('users with resource function call and callback', function( done ){
      var api = new ApiClient('http://0.0.0.0:3000');

      api.add('users');

      api.users().read(function( data ){
        assert.deepEqual( data, [{ user: 'tobi' },{ user: 'loki' }] );

        done();
      });
    });

    it('users without resource function call and callback', function( done ){
      var api = new ApiClient('http://0.0.0.0:3000');

      api.add('users');

      api.users.read(function( data ){
        assert.deepEqual( data, [{ user: 'tobi' },{ user: 'loki' }] );

        done();
      });
    });
  });


  describe('POST', function(){
    it('base', function( done ){
      var api = new ApiClient('http://0.0.0.0:3000');

      api.add('users');

      api.users.post({
        username: 'login',
        password: 'password'
      }).done(function( data ){
        assert.deepEqual( data, { username: 'login', password: 'password' });

        done();
      });
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