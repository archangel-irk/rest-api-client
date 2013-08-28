REST api client
---

Примеры
---
```javascript
var github = api('https://api.github.com', {
  token: '8fbfc540f1ed1417083c70a990b4db3c9aa86efe'
});

github.add('user');          // /user
github.add('users');         // /users
github.users.add('repos');   // /users/repos

github.user.read();                                                // GET /user
github.users('archangel-irk').repos.read();                        // GET /users/archangel-irk/repos
github.users('archangel-irk').repos({ sort: 'pushed' }).read();    // GET /users/archangel-irk/repos?sort=pushed
```

Архитектура библиотеки
---
```api()``` - функция-объект для создания инстанса api  
```api.instance``` - объект инстанса api  
```api.extend()``` - расширить api  
```api.instance.extend()``` - расширить инстанс api  

```api._request( method, url, data, headers )``` - отправить ajax запрос  
```api._request( settings )``` - отправить ajax запрос  



api.instance.add
Resource


API
---
Создать новый апи
```javascript
api( url, options );
```
url - адрес к апи, может быть относительным или полным  
options - будет полностью скопирован методом ```$.extend``` в объект апи

Example:
```javascript
var github = api('https://api.github.com', {
  token: '8fbfc540f1ed1417083c70a990b4db3c9aa86efe'
});
```
