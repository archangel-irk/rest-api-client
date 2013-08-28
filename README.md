REST api client
---

Пример
---
```javascript
var github = api('https://api.github.com', {
  token: '8fbfc540f1ed1417083c70a990b4db3c9aa86efe'
});

github.read();               // GET https://api.github.com

github.add('user');          // /user
github.add('users');         // /users
github.users.add('repos');   // /users/repos

github.user.read();                                                // GET /user
github.users('archangel-irk').repos.read();                        // GET /users/archangel-irk/repos
github.users('archangel-irk').repos({ sort: 'pushed' }).read();    // GET /users/archangel-irk/repos?sort=pushed
```

Архитектура библиотеки
---
Сначала опишем самый верхний уровень.  
```api()``` - функция-конструктор апи клиента, но также используется как обычный объект с методами.  

Базовые методы для отправки запросов (все они возвращают jsXHR).  
```api._request( method, url, data, headers )``` - отправить кастомный ajax запрос.  
```api._request( settings )``` - отправить кастомный ajax запрос, передав любые настройки.  
Для удобства есть алиасы ```create read update delete patch```  
```api.create( settings )``` - отправить кастомный post запрос.  

Так же этот объект можно дополнить своими методами или свойствами используя ```api.extend( object )```.  

Тепепь поговорим о апи клиенте, который возвращает функция-конструктор ```api()```.  
```api.instance``` - прототип апи клиента.  
```api.instance.add``` - добавить ресурс к апи клиенту.  
```api.instance.extend( object )``` - расширить прототип апи клиента.  
У апи клиента для отправки запросов есть методы```_request( method, url, data, headers )``` и
```read()``` т.к. другие методы (post, delete и т.д.) просто не нужны для корня апи.  

И немного о самих ресурсах.  
Resource - это функция со свойствами и методами, позволяющая делать запросы к ресурсам апи.  
Как мы уже знаем, чтобы добавить ресурс к апи, нужно просто вызвать метод ```.add( resourceName )``` у апи клиента.  
Теперь посмотрим что же есть в самих ресурсах:  
```._request( method, headers )``` - отправить кастомный запрос на ресурс с заданным методом и заголовками

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
