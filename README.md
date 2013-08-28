REST api client
===


API
===
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
