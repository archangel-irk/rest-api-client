import { ApiClient } from '../dist/api-client.development.js';


describe('ApiClient', () => {
  it('create without `new`', function() {
    assert.ok(ApiClient() instanceof ApiClient);
  });

  it('read root .done()', function(done) {
    var api = new ApiClient('http://0.0.0.0:3000');

    api.read().done(function(data) {
      assert.equal(data.user, 'tobi');

      done();
    });
  });

  it('read root with callback', function(done) {
    var api = new ApiClient('http://0.0.0.0:3000');

    api.read(function(data) {
      assert.equal(data.user, 'tobi');

      done();
    });
  });

  describe('GET', function() {
    it('users with resource function call and .done()', function(done) {
      var api = new ApiClient('http://0.0.0.0:3000');

      api.add('users');

      api.users().read().done(function(data) {
        assert.deepEqual(data, [{ user: 'tobi' }, { user: 'loki' }]);

        done();
      });
    });

    it('users without resource function call and .done()', function(done) {
      var api = new ApiClient('http://0.0.0.0:3000');

      api.add('users');

      api.users.read().done(function(data) {
        assert.deepEqual(data, [{ user: 'tobi' }, { user: 'loki' }]);

        done();
      });
    });

    it('users with resource function call and callback', function(done) {
      var api = new ApiClient('http://0.0.0.0:3000');

      api.add('users');

      api.users().read(function(data) {
        assert.deepEqual(data, [{ user: 'tobi' }, { user: 'loki' }]);

        done();
      });
    });

    it('users without resource function call and callback', function(done) {
      var api = new ApiClient('http://0.0.0.0:3000');

      api.add('users');

      api.users.read(function(data) {
        assert.deepEqual(data, [{ user: 'tobi' }, { user: 'loki' }]);

        done();
      });
    });
  });

  describe('POST', function() {
    it('users', function(done) {
      var api = new ApiClient('http://0.0.0.0:3000');

      api.add('users');

      api.users.post({
        username: 'login',
        password: 'password',
      }).done(function(data) {
        assert.deepEqual(data, { username: 'login', password: 'password' });

        done();
      });
    });
  });

  describe('cache', function() {
    it('works', function(done) {
      var api = new ApiClient('http://0.0.0.0:3000');

      api.add('users');

      api.users.get().done(function(response) {
        assert.deepEqual(response, [{ user: 'tobi' }, { user: 'loki' }]);

        api.users.get().done(function(response) {
          var resArr = [{ user: 'tobi' }, { user: 'loki' }];
          resArr.__cached = true;

          assert.deepEqual(response, resArr);

          done();
        });
      });
    });
  });
});
