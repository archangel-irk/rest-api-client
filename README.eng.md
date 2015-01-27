# RESTfull api client (alpha)
Build easy client to the RESTfull server api.  
The library uses the approach of "chaining" challenges for the organization transparent query.  
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
      Authorization: 'token 8fbfc540f1ed1417083c70a990b4db3c9aa86efe'
    }
  },
  unauthorizedCallback: function(){} // Вызывается всякий раз, когда код ответа от сервера 401
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
