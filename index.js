(function () {
  'use strict';

  var cols = 8;
  var rows = 5;
  var delay = 20;

  function preloadImage(imgSrc, done) {
    var image = new Image();
    image.src = imgSrc;
    image.addEventListener('load', done);
  }

  function makeTile(i, element, imgSrc) {
    var w = Math.round(element.offsetWidth / cols);
    var h = Math.round(element.offsetHeight / rows);
    var x = Math.floor(i / rows) * w;
    var y = i % rows * h;
    var bx = -x;
    var by = -y;

    var tile = document.createElement('div');
    tile.classList.add('tile');
    tile.style['background-image'] = imgSrc;
    tile.style.left = x + 'px';
    tile.style.top = y + 'px';
    tile.style.width = w + 'px';
    tile.style.height = h + 'px';
    tile.style['background-position'] = bx + 'px ' + by + 'px';
    return tile;
  }

  function makeTransitionTile(i, element, imgOut, imgIn, done) {
    var tileOut = makeTile(i, element, imgOut);
    element.appendChild(tileOut);
    tileOut.addEventListener('animationend', function () {
      var tileIn = makeTile(i, element, imgIn);
      element.appendChild(tileIn);
      element.removeChild(tileOut);

      tileIn.classList.add('in');
      tileIn.addEventListener('animationend', function () {
        done(tileIn);
      });
    });

    setTimeout(function () {
      tileOut.classList.add('out');
    }, i * delay);
  }

  function makeTransition(element, imgSrc, done) {
    var tiles = [];
    var count = cols * rows;
    var style = window.getComputedStyle(element);
    var imgOut = style['background-image'];
    var imgIn = 'url(' + imgSrc + ')';

    function tileDone(tile) {
      tiles.push(tile);
      if (tiles.length === count) {
        element.style['background-image'] = imgIn;
        tiles.forEach(element.removeChild.bind(element));
        done();
      }
    }

    for (var i = 0; i < count; i++) {
      makeTransitionTile(i, element, imgOut, imgIn, tileDone);
    }

    element.style['background-image'] = 'none';
  }

  function transitionImage(element, imgSrc) {
    preloadImage(imgSrc, function () {
      makeTransition(element, imgSrc, function () {
        console.log('done');
      });
    });
  }

  var active = 1;
  document.addEventListener('click', function () {
    active = active === 1 ? 2 : 1;
    transitionImage(document.getElementById('image'), 'img' + active + '.jpg');
  });


}());
