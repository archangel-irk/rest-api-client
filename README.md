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
```api()``` - функция-конструктор для апи, а так же объект с методами
```api.extend()``` - расширить api  

Все запросы возвращают jsXHR  
```api._request( method, url, data, headers )``` - отправить кастомный ajax запрос  
```api._request( settings )``` - отправить кастомный ajax запрос, передав любые настройки  

Для удобства есть методы ```create read update delete patch```  
```api.create( doneCallback )``` - отправить кастомный post запрос  

Во всех примерах github - это инстанс
```api.instance``` - объект инстанса api  
```api.instance.extend()``` - расширить инстанс api  

```api.instance.add```
```Resource```


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
