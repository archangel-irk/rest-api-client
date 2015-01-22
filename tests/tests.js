/**
 * User: Constantine Melnikov
 * Email: ka.melnikov@gmail.com
 * Date: 22.01.15
 * Time: 17:30
 */
(function(){
'use strict';

QUnit.test('hello test', function( assert ) {
  assert.ok( 1 == '1', 'Passed!' );
});

})();

// Надо подумать, как лучше организовать тестирование
// Вот список вкладок, которые могут понадобиться
// http://qunitjs.com/cookbook/#asynchronous-callbacks
// https://github.com/cjohansen/Sinon.JS
// http://sinonjs.org/docs/#fakeServer
// http://sinonjs.org/qunit/
// http://jsfiddle.net/jonkemp/ZGrTK/
// http://tutorials.jumpstartlab.com/projects/javascript/testing/2-ajax-and-sinon.html
// https://github.com/tj/supertest
// https://github.com/ded/reqwest - тут есть тесты
// https://github.com/pyrsmk/qwest - тут есть тесты
// https://github.com/natevw/fermata