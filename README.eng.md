# RESTfull api client (alpha)
[english](README.eng.md) | [по-русски](README.md)

Build easy client to the RESTfull server api.  
The library uses the approach of "chaining" for the organization transparent query.  
Authorization is available on the token.  

## Dependencies
1. lodash
2. jQuery for ajax

## Basic usage
```javascript
var github = ApiClient('https://api.github.com', {
  hooks: {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: 'token XXXXXX'
    }
  },
  unauthorizedCallback: function(){} // Called whenever a response code from the server 401
});

github.read();               // GET https://api.github.com

github.add('user');          // /user
github.add('users');         // /users
github.users.add('repos');   // /users/repos

github.user.read();                                                // GET /user
github.users('archangel-irk').repos.read();                        // GET /users/archangel-irk/repos
github.users('archangel-irk').repos.read({ sort: 'pushed' });      // GET /users/archangel-irk/repos?sort=pushed
```

## Call parent functions
```javascript
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

github.search.users.usersMethod(); // search::searchMethod
```
