'use strict';

var util = require('./util');

function prepareOptions(element, options) {

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
}

function styleToPoint(style) {
  return style.split(' ').map(function (v) {
    if (v.indexOf('px') >= 0) return parseInt(v);
    return parseInt(v) / 100;
  });
}

function pointToStyle(point, unit) {
  unit = unit || 'px';
  var d = unit === '%' ? 100 : 1;
  return point.map(function (v) { return v * d + unit; }).join(' ');
}

function computeImageTransform(image, element, style) {
  var w = element.offsetWidth;
  var h = element.offsetHeight;
  var t = { x: 0, y: 0, w: w, h: h };
  if (style['background-size'] === 'cover') {
    var iw = image.naturalWidth;
    var ih = image.naturalHeight;
    if (t.w / iw > t.h / ih) {
      t.h = t.w / iw * ih;
    } else {
      t.w = t.h / ih * iw;
    }
  }
  if (style['background-position']) {
    var d = styleToPoint(style['background-position']);
    if (style['background-position'].indexOf('%') >= 0) {
      t.x = -(t.w - w) * d[0];
      t.y = -(t.h - h) * d[1];
    } else {
      t.x = d[0];
      t.y = d[1];
    }
  }
  return t;
}

function makeTile(x, y, w, h, t, imgUrl) {
  var tile = document.createElement('div');
  tile.classList.add('tile');
  tile.style.position = 'absolute';
  tile.style['background-image'] = imgUrl;
  tile.style.left = x * w + 'px';
  tile.style.top = y * h + 'px';
  tile.style.width = w + 'px';
  tile.style.height = h + 'px';
  tile.style['background-size'] = pointToStyle([t.w, t.h]);
  tile.style['background-position'] = pointToStyle([Math.round(t.x - x * w), Math.round(t.y - y * h)]);
  return tile;
}

// image transition
module.exports = function (element, fromImage, toImage, options, done) {

  prepareOptions(element, options);

  var elementStyle = window.getComputedStyle(element);
  var fromImageTransform = computeImageTransform(fromImage, element, elementStyle);
  var toImageTransform = computeImageTransform(toImage, element, elementStyle);
  var fromImageUrl = util.urlFromimage(fromImage);
  var toImageUrl = util.urlFromimage(toImage);

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
    var fromTile = makeTile(x, y, w, h, fromImageTransform, fromImageUrl);
    var toTile = makeTile(x, y, w, h, toImageTransform, toImageUrl);

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
