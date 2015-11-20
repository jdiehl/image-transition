window.ImageTransition = (function () {
  'use strict';

  function preloadImage(imgSrc, done) {
    var image = new Image();
    image.src = imgSrc;
    image.addEventListener('load', done);
  }

  function makeTile(x, y, w, h, imgSrc) {
    var tile = document.createElement('div');
    tile.classList.add('tile');
    tile.style.position = 'absolute';
    tile.style['background-image'] = imgSrc;
    tile.style.left = x * w + 'px';
    tile.style.top = y * h + 'px';
    tile.style.width = w + 'px';
    tile.style.height = h + 'px';
    tile.style['background-position'] = -x * w + 'px ' + -y * h + 'px';
    return tile;
  }

  function transition(element, imageSrc, options, done) {

    // get the element to transition
    if (typeof element === 'string') element = document.querySelector(element);

    // determine the image to transition from and to
    var elementStyle = window.getComputedStyle(element);
    var fromImage = elementStyle['background-image'] || 'url(' + elementStyle.src + ')';
    var toImage = 'url(' + imageSrc + ')';

    // determine the number of tiles to create
    var tiles = [];
    if (options.tileSize) {
      options.tiles = Math.round(Math.max(element.offsetWidth, element.offsetHeight) / options.tileSize);
    }
    if (options.tiles) {
      if (element.offsetWidth > element.offsetHeight) {
        options.cols = options.tiles;
        options.rows = Math.round(options.tiles / element.offsetWidth * element.offsetHeight);
      } else {
        options.rows = options.tiles;
        options.cols = Math.round(options.tiles / element.offsetWidth * element.offsetHeight);
      }
    }
    options.cols = options.cols || 1;
    options.rows = options.rows || 1;
    var tilesCount = options.cols * options.rows;

    // determine how long tiles should transition
    options.duration = options.duration || 1000;
    options.delay = options.delay || function (x, y) { return (x + y) * 20; };

    // determine the number of tiles to create

    function tileDone(tile) {
      tiles.push(tile);
      if (tiles.length === tilesCount) {
        element.style['background-image'] = toImage;
        tiles.forEach(element.removeChild.bind(element));
        if (done) done();
      }
    }

    function makeTransitionTile(i, next) {
      var w = Math.round(element.offsetWidth / options.cols);
      var h = Math.round(element.offsetHeight / options.rows);
      var x = i % options.cols;
      var y = Math.floor(i / options.cols);
      var fromTile = makeTile(x, y, w, h, fromImage);
      var toTile = makeTile(x, y, w, h, toImage);

      element.appendChild(fromTile);

      setTimeout(function () {
        fromTile.style.animation = 'image-transition-' + options.transition + '-out ' + options.duration + 'ms';
        toTile.style.animation = 'image-transition-' + options.transition + '-in ' + options.duration + 'ms';
        element.appendChild(toTile);
      }, options.delay(x, y));

      toTile.addEventListener('animationend', function () {
        element.removeChild(fromTile);
        next(toTile);
      });
    }

    preloadImage(imageSrc, function () {
      for (var i = 0; i < tilesCount; i++) {
        makeTransitionTile(i, tileDone);
      }
      element.style['background-image'] = 'none';
    });
  }

  function make(options) {
    return function (element, image, done) {
      transition(element, image, options, done);
    };
  }

  return {
    transition: transition,
    mosaic: make({ tileSize: 10, duration: 500, transition: 'rotatey' })
  };

}(window));
