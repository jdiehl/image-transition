'use strict';

var util = require('./util');

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

// image transition
module.exports = function (element, fromImage, toImage, options, done) {

  function prepareOptions() {
    var elementStyle = window.getComputedStyle(element);

    // determine the number of tiles to create
    if (options.tileSize) {
      options.tiles = Math.round(Math.max(element.offsetWidth, element.offsetHeight) / options.tileSize);
    }
    if (options.tiles) {
      if (element.offsetWidth > element.offsetHeight) {
        options.cols = options.tiles;
        options.rows = Math.round(options.tiles / element.offsetWidth * element.offsetHeight);
      } else {
        options.cols = Math.round(options.tiles / element.offsetHeight * element.offsetWidth);
        options.rows = options.tiles;
      }
    }
    options.cols = options.cols || 1;
    options.rows = options.rows || 1;

    // determine how long tiles should transition
    options.duration = options.duration || 1000;
    options.delay = options.delay || function (x, y) { return (x + y) * 50; };

    // determine the image origin and size
    if (elementStyle.backgroundSize === 'cover') {
      // nothing
    }
  }

  prepareOptions();

  var tiles = [];
  var tilesCount = options.cols * options.rows;
  function tileDone(tile) {
    tiles.push(tile);
    if (tiles.length === tilesCount) {
      element.style['background-image'] = util.urlFromimage(toImage);
      tiles.forEach(element.removeChild.bind(element));
      if (done) done();
    }
  }

  function makeTransitionTile(i, next) {
    var w = Math.round(element.offsetWidth / options.cols);
    var h = Math.round(element.offsetHeight / options.rows);
    var x = i % options.cols;
    var y = Math.floor(i / options.cols);
    var fromTile = makeTile(x, y, w, h, util.urlFromimage(fromImage));
    var toTile = makeTile(x, y, w, h, util.urlFromimage(toImage));

    util.prepend(element, fromTile);

    setTimeout(function () {
      fromTile.style.animation = 'image-transition-' + options.transition + '-out ' + options.duration + 'ms';
      toTile.style.animation = 'image-transition-' + options.transition + '-in ' + options.duration + 'ms';
      util.prepend(element, toTile);
    }, options.delay(x, y));

    toTile.addEventListener('animationend', function () {
      element.removeChild(fromTile);
      next(toTile);
    });
  }


  for (var i = 0; i < tilesCount; i++) {
    makeTransitionTile(i, tileDone);
  }
  element.style['background-image'] = 'none';

};
