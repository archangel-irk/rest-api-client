import { ApiClient } from '../dist/api-client.development.js';


const API_URL = 'http://0.0.0.0:3022';

describe('ApiClient', () => {
  it('create without `new`', function() {
    assert.ok(ApiClient() instanceof ApiClient);
  });

  it('read root .done()', function(done) {
    var api = new ApiClient(API_URL);

    api.read().done(function(data) {
      assert.equal(data.user, 'tobi');

      done();
    });
  });

  it('read root with callback', function(done) {
    var api = new ApiClient(API_URL);

    api.read(function(data) {
      assert.equal(data.user, 'tobi');

      done();
    });
  });

  describe('GET', function() {
    it('users with resource function call and .done()', function(done) {
      var api = new ApiClient(API_URL);

      api.add('users');

      api.users().read().done(function(data) {
        assert.deepEqual(data, [{ user: 'tobi' }, { user: 'loki' }]);

        done();
      });
    });

    it('users without resource function call and .done()', function(done) {
      var api = new ApiClient(API_URL);

      api.add('users');

      api.users.read().done(function(data) {
        assert.deepEqual(data, [{ user: 'tobi' }, { user: 'loki' }]);

        done();
      });
    });

    it('users with resource function call and callback', function(done) {
      var api = new ApiClient(API_URL);

      api.add('users');

      api.users().read(function(data) {
        assert.deepEqual(data, [{ user: 'tobi' }, { user: 'loki' }]);

        done();
      });
    });

    it('users without resource function call and callback', function(done) {
      var api = new ApiClient(API_URL);

      api.add('users');

      api.users.read(function(data) {
        assert.deepEqual(data, [{ user: 'tobi' }, { user: 'loki' }]);

        done();
      });
    });
  });

  describe('POST', function() {
    it('users', function(done) {
      var api = new ApiClient(API_URL);

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
});
