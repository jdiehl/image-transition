(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var tiled = require('./tiled-transition');
var util = require('./util');

function make(transition, defaults) {
  return function (element, toImageSrc, options, done) {

    if (!options) options = {};

    // optional options parameter
    if (typeof options === 'function') {
      done = options;
      options = {};
    }

    // apply defaults from the make function
    util.applyDefaults(options, defaults);

    // fetch the element
    if (typeof element === 'string') element = document.querySelector(element);

    // preload images
    var fromImageSrc = util.getImageSrcFromElement(element);
    util.preloadImages([fromImageSrc, toImageSrc], function (images) {

      // execute the transition
      transition(element, images[0], images[1], options, done);

    });
  };
}

// image-transition api
window.ImageTransition = module.exports = {
  tiled: make(tiled),
  mosaic: make(tiled, { tiles: 10, duration: 500, transition: 'rotatey' })
};

},{"./tiled-transition":2,"./util":3}],2:[function(require,module,exports){
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

},{"./util":3}],3:[function(require,module,exports){
'use strict';

exports.applyDefaults = function (options, defaults) {
  if (!defaults) return;
  Object.keys(defaults).forEach(function (key) {
    if (options[key] === undefined) options[key] = defaults[key];
  });
};

// insert an item as the new first child
exports.prepend = function (parent, element) {
  parent.insertBefore(element, parent.firstChild);
};

// get image src from background image
exports.getImageSrcFromElement = function (element) {
  if (element.src) return element.src;
  var style = window.getComputedStyle(element);
  var styleSrc = style['background-image'];
  if (!styleSrc) return;
  return styleSrc.substr(0, styleSrc.length - 1).substr(4);
};

exports.urlFromimage = function (image) {
  return 'url(' + image.src + ')';
};

// apply the given arguments to a function multiple times in series
exports.applySeries = function (fn, argsList, done) {
  var resList = [];
  function next(res) {
    resList.push(res);
    if (resList.length === argsList.length) done(resList);
  }
  argsList.forEach(function (args) {
    if (!(args instanceof Array)) args = [args];
    args.push(next);
    fn.apply(null, args);
  });
};

// preload images
exports.preloadImages = function (imageSrcs, done) {
  exports.applySeries(function (src, next) {
    var image = new Image();
    image.src = src;
    image.addEventListener('load', function () {
      next(image);
    });
  }, imageSrcs, done);
};


},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qZGllaGwvRG9jdW1lbnRzL1ByaXZhdGUvaW1hZ2UtdHJhbnNpdGlvbi9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2pkaWVobC9Eb2N1bWVudHMvUHJpdmF0ZS9pbWFnZS10cmFuc2l0aW9uL3NyYy9mYWtlX2FkYjAzM2E1LmpzIiwiL1VzZXJzL2pkaWVobC9Eb2N1bWVudHMvUHJpdmF0ZS9pbWFnZS10cmFuc2l0aW9uL3NyYy90aWxlZC10cmFuc2l0aW9uLmpzIiwiL1VzZXJzL2pkaWVobC9Eb2N1bWVudHMvUHJpdmF0ZS9pbWFnZS10cmFuc2l0aW9uL3NyYy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdGlsZWQgPSByZXF1aXJlKCcuL3RpbGVkLXRyYW5zaXRpb24nKTtcbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbmZ1bmN0aW9uIG1ha2UodHJhbnNpdGlvbiwgZGVmYXVsdHMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIChlbGVtZW50LCB0b0ltYWdlU3JjLCBvcHRpb25zLCBkb25lKSB7XG5cbiAgICBpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fTtcblxuICAgIC8vIG9wdGlvbmFsIG9wdGlvbnMgcGFyYW1ldGVyXG4gICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBkb25lID0gb3B0aW9ucztcbiAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG5cbiAgICAvLyBhcHBseSBkZWZhdWx0cyBmcm9tIHRoZSBtYWtlIGZ1bmN0aW9uXG4gICAgdXRpbC5hcHBseURlZmF1bHRzKG9wdGlvbnMsIGRlZmF1bHRzKTtcblxuICAgIC8vIGZldGNoIHRoZSBlbGVtZW50XG4gICAgaWYgKHR5cGVvZiBlbGVtZW50ID09PSAnc3RyaW5nJykgZWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoZWxlbWVudCk7XG5cbiAgICAvLyBwcmVsb2FkIGltYWdlc1xuICAgIHZhciBmcm9tSW1hZ2VTcmMgPSB1dGlsLmdldEltYWdlU3JjRnJvbUVsZW1lbnQoZWxlbWVudCk7XG4gICAgdXRpbC5wcmVsb2FkSW1hZ2VzKFtmcm9tSW1hZ2VTcmMsIHRvSW1hZ2VTcmNdLCBmdW5jdGlvbiAoaW1hZ2VzKSB7XG5cbiAgICAgIC8vIGV4ZWN1dGUgdGhlIHRyYW5zaXRpb25cbiAgICAgIHRyYW5zaXRpb24oZWxlbWVudCwgaW1hZ2VzWzBdLCBpbWFnZXNbMV0sIG9wdGlvbnMsIGRvbmUpO1xuXG4gICAgfSk7XG4gIH07XG59XG5cbi8vIGltYWdlLXRyYW5zaXRpb24gYXBpXG53aW5kb3cuSW1hZ2VUcmFuc2l0aW9uID0gbW9kdWxlLmV4cG9ydHMgPSB7XG4gIHRpbGVkOiBtYWtlKHRpbGVkKSxcbiAgbW9zYWljOiBtYWtlKHRpbGVkLCB7IHRpbGVzOiAxMCwgZHVyYXRpb246IDUwMCwgdHJhbnNpdGlvbjogJ3JvdGF0ZXknIH0pXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG5mdW5jdGlvbiBwcmVwYXJlT3B0aW9ucyhlbGVtZW50LCBvcHRpb25zKSB7XG5cbiAgLy8gZGV0ZXJtaW5lIHRoZSBudW1iZXIgb2YgdGlsZXMgdG8gY3JlYXRlXG4gIGlmIChvcHRpb25zLnRpbGVTaXplKSB7XG4gICAgb3B0aW9ucy50aWxlcyA9IE1hdGgucm91bmQoTWF0aC5tYXgoZWxlbWVudC5vZmZzZXRXaWR0aCwgZWxlbWVudC5vZmZzZXRIZWlnaHQpIC8gb3B0aW9ucy50aWxlU2l6ZSk7XG4gIH1cbiAgaWYgKG9wdGlvbnMudGlsZXMpIHtcbiAgICBpZiAoZWxlbWVudC5vZmZzZXRXaWR0aCA+IGVsZW1lbnQub2Zmc2V0SGVpZ2h0KSB7XG4gICAgICBvcHRpb25zLmNvbHMgPSBvcHRpb25zLnRpbGVzO1xuICAgICAgb3B0aW9ucy5yb3dzID0gTWF0aC5yb3VuZChvcHRpb25zLnRpbGVzIC8gZWxlbWVudC5vZmZzZXRXaWR0aCAqIGVsZW1lbnQub2Zmc2V0SGVpZ2h0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0aW9ucy5jb2xzID0gTWF0aC5yb3VuZChvcHRpb25zLnRpbGVzIC8gZWxlbWVudC5vZmZzZXRIZWlnaHQgKiBlbGVtZW50Lm9mZnNldFdpZHRoKTtcbiAgICAgIG9wdGlvbnMucm93cyA9IG9wdGlvbnMudGlsZXM7XG4gICAgfVxuICB9XG4gIG9wdGlvbnMuY29scyA9IG9wdGlvbnMuY29scyB8fCAxO1xuICBvcHRpb25zLnJvd3MgPSBvcHRpb25zLnJvd3MgfHwgMTtcblxuICAvLyBkZXRlcm1pbmUgaG93IGxvbmcgdGlsZXMgc2hvdWxkIHRyYW5zaXRpb25cbiAgb3B0aW9ucy5kdXJhdGlvbiA9IG9wdGlvbnMuZHVyYXRpb24gfHwgMTAwMDtcbiAgb3B0aW9ucy5kZWxheSA9IG9wdGlvbnMuZGVsYXkgfHwgZnVuY3Rpb24gKHgsIHkpIHsgcmV0dXJuICh4ICsgeSkgKiA1MDsgfTtcbn1cblxuZnVuY3Rpb24gc3R5bGVUb1BvaW50KHN0eWxlKSB7XG4gIHJldHVybiBzdHlsZS5zcGxpdCgnICcpLm1hcChmdW5jdGlvbiAodikge1xuICAgIGlmICh2LmluZGV4T2YoJ3B4JykgPj0gMCkgcmV0dXJuIHBhcnNlSW50KHYpO1xuICAgIHJldHVybiBwYXJzZUludCh2KSAvIDEwMDtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHBvaW50VG9TdHlsZShwb2ludCwgdW5pdCkge1xuICB1bml0ID0gdW5pdCB8fCAncHgnO1xuICB2YXIgZCA9IHVuaXQgPT09ICclJyA/IDEwMCA6IDE7XG4gIHJldHVybiBwb2ludC5tYXAoZnVuY3Rpb24gKHYpIHsgcmV0dXJuIHYgKiBkICsgdW5pdDsgfSkuam9pbignICcpO1xufVxuXG5mdW5jdGlvbiBjb21wdXRlSW1hZ2VUcmFuc2Zvcm0oaW1hZ2UsIGVsZW1lbnQsIHN0eWxlKSB7XG4gIHZhciB3ID0gZWxlbWVudC5vZmZzZXRXaWR0aDtcbiAgdmFyIGggPSBlbGVtZW50Lm9mZnNldEhlaWdodDtcbiAgdmFyIHQgPSB7IHg6IDAsIHk6IDAsIHc6IHcsIGg6IGggfTtcbiAgaWYgKHN0eWxlWydiYWNrZ3JvdW5kLXNpemUnXSA9PT0gJ2NvdmVyJykge1xuICAgIHZhciBpdyA9IGltYWdlLm5hdHVyYWxXaWR0aDtcbiAgICB2YXIgaWggPSBpbWFnZS5uYXR1cmFsSGVpZ2h0O1xuICAgIGlmICh0LncgLyBpdyA+IHQuaCAvIGloKSB7XG4gICAgICB0LmggPSB0LncgLyBpdyAqIGloO1xuICAgIH0gZWxzZSB7XG4gICAgICB0LncgPSB0LmggLyBpaCAqIGl3O1xuICAgIH1cbiAgfVxuICBpZiAoc3R5bGVbJ2JhY2tncm91bmQtcG9zaXRpb24nXSkge1xuICAgIHZhciBkID0gc3R5bGVUb1BvaW50KHN0eWxlWydiYWNrZ3JvdW5kLXBvc2l0aW9uJ10pO1xuICAgIGlmIChzdHlsZVsnYmFja2dyb3VuZC1wb3NpdGlvbiddLmluZGV4T2YoJyUnKSA+PSAwKSB7XG4gICAgICB0LnggPSAtKHQudyAtIHcpICogZFswXTtcbiAgICAgIHQueSA9IC0odC5oIC0gaCkgKiBkWzFdO1xuICAgIH0gZWxzZSB7XG4gICAgICB0LnggPSBkWzBdO1xuICAgICAgdC55ID0gZFsxXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHQ7XG59XG5cbmZ1bmN0aW9uIG1ha2VUaWxlKHgsIHksIHcsIGgsIHQsIGltZ1VybCkge1xuICB2YXIgdGlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICB0aWxlLmNsYXNzTGlzdC5hZGQoJ3RpbGUnKTtcbiAgdGlsZS5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG4gIHRpbGUuc3R5bGVbJ2JhY2tncm91bmQtaW1hZ2UnXSA9IGltZ1VybDtcbiAgdGlsZS5zdHlsZS5sZWZ0ID0geCAqIHcgKyAncHgnO1xuICB0aWxlLnN0eWxlLnRvcCA9IHkgKiBoICsgJ3B4JztcbiAgdGlsZS5zdHlsZS53aWR0aCA9IHcgKyAncHgnO1xuICB0aWxlLnN0eWxlLmhlaWdodCA9IGggKyAncHgnO1xuICB0aWxlLnN0eWxlWydiYWNrZ3JvdW5kLXNpemUnXSA9IHBvaW50VG9TdHlsZShbdC53LCB0LmhdKTtcbiAgdGlsZS5zdHlsZVsnYmFja2dyb3VuZC1wb3NpdGlvbiddID0gcG9pbnRUb1N0eWxlKFtNYXRoLnJvdW5kKHQueCAtIHggKiB3KSwgTWF0aC5yb3VuZCh0LnkgLSB5ICogaCldKTtcbiAgcmV0dXJuIHRpbGU7XG59XG5cbi8vIGltYWdlIHRyYW5zaXRpb25cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGVsZW1lbnQsIGZyb21JbWFnZSwgdG9JbWFnZSwgb3B0aW9ucywgZG9uZSkge1xuXG4gIHByZXBhcmVPcHRpb25zKGVsZW1lbnQsIG9wdGlvbnMpO1xuXG4gIHZhciBlbGVtZW50U3R5bGUgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShlbGVtZW50KTtcbiAgdmFyIGZyb21JbWFnZVRyYW5zZm9ybSA9IGNvbXB1dGVJbWFnZVRyYW5zZm9ybShmcm9tSW1hZ2UsIGVsZW1lbnQsIGVsZW1lbnRTdHlsZSk7XG4gIHZhciB0b0ltYWdlVHJhbnNmb3JtID0gY29tcHV0ZUltYWdlVHJhbnNmb3JtKHRvSW1hZ2UsIGVsZW1lbnQsIGVsZW1lbnRTdHlsZSk7XG4gIHZhciBmcm9tSW1hZ2VVcmwgPSB1dGlsLnVybEZyb21pbWFnZShmcm9tSW1hZ2UpO1xuICB2YXIgdG9JbWFnZVVybCA9IHV0aWwudXJsRnJvbWltYWdlKHRvSW1hZ2UpO1xuXG4gIHZhciB0aWxlcyA9IFtdO1xuICB2YXIgdGlsZXNDb3VudCA9IG9wdGlvbnMuY29scyAqIG9wdGlvbnMucm93cztcbiAgZnVuY3Rpb24gdGlsZURvbmUodGlsZSkge1xuICAgIHRpbGVzLnB1c2godGlsZSk7XG4gICAgaWYgKHRpbGVzLmxlbmd0aCA9PT0gdGlsZXNDb3VudCkge1xuICAgICAgZWxlbWVudC5zdHlsZVsnYmFja2dyb3VuZC1pbWFnZSddID0gdXRpbC51cmxGcm9taW1hZ2UodG9JbWFnZSk7XG4gICAgICB0aWxlcy5mb3JFYWNoKGVsZW1lbnQucmVtb3ZlQ2hpbGQuYmluZChlbGVtZW50KSk7XG4gICAgICBpZiAoZG9uZSkgZG9uZSgpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG1ha2VUcmFuc2l0aW9uVGlsZShpLCBuZXh0KSB7XG4gICAgdmFyIHcgPSBNYXRoLnJvdW5kKGVsZW1lbnQub2Zmc2V0V2lkdGggLyBvcHRpb25zLmNvbHMpO1xuICAgIHZhciBoID0gTWF0aC5yb3VuZChlbGVtZW50Lm9mZnNldEhlaWdodCAvIG9wdGlvbnMucm93cyk7XG4gICAgdmFyIHggPSBpICUgb3B0aW9ucy5jb2xzO1xuICAgIHZhciB5ID0gTWF0aC5mbG9vcihpIC8gb3B0aW9ucy5jb2xzKTtcbiAgICB2YXIgZnJvbVRpbGUgPSBtYWtlVGlsZSh4LCB5LCB3LCBoLCBmcm9tSW1hZ2VUcmFuc2Zvcm0sIGZyb21JbWFnZVVybCk7XG4gICAgdmFyIHRvVGlsZSA9IG1ha2VUaWxlKHgsIHksIHcsIGgsIHRvSW1hZ2VUcmFuc2Zvcm0sIHRvSW1hZ2VVcmwpO1xuXG4gICAgdXRpbC5wcmVwZW5kKGVsZW1lbnQsIGZyb21UaWxlKTtcblxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgZnJvbVRpbGUuc3R5bGUuYW5pbWF0aW9uID0gJ2ltYWdlLXRyYW5zaXRpb24tJyArIG9wdGlvbnMudHJhbnNpdGlvbiArICctb3V0ICcgKyBvcHRpb25zLmR1cmF0aW9uICsgJ21zJztcbiAgICAgIHRvVGlsZS5zdHlsZS5hbmltYXRpb24gPSAnaW1hZ2UtdHJhbnNpdGlvbi0nICsgb3B0aW9ucy50cmFuc2l0aW9uICsgJy1pbiAnICsgb3B0aW9ucy5kdXJhdGlvbiArICdtcyc7XG4gICAgICB1dGlsLnByZXBlbmQoZWxlbWVudCwgdG9UaWxlKTtcbiAgICB9LCBvcHRpb25zLmRlbGF5KHgsIHkpKTtcblxuICAgIHRvVGlsZS5hZGRFdmVudExpc3RlbmVyKCdhbmltYXRpb25lbmQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBlbGVtZW50LnJlbW92ZUNoaWxkKGZyb21UaWxlKTtcbiAgICAgIG5leHQodG9UaWxlKTtcbiAgICB9KTtcbiAgfVxuXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aWxlc0NvdW50OyBpKyspIHtcbiAgICBtYWtlVHJhbnNpdGlvblRpbGUoaSwgdGlsZURvbmUpO1xuICB9XG4gIGVsZW1lbnQuc3R5bGVbJ2JhY2tncm91bmQtaW1hZ2UnXSA9ICdub25lJztcblxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5hcHBseURlZmF1bHRzID0gZnVuY3Rpb24gKG9wdGlvbnMsIGRlZmF1bHRzKSB7XG4gIGlmICghZGVmYXVsdHMpIHJldHVybjtcbiAgT2JqZWN0LmtleXMoZGVmYXVsdHMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgIGlmIChvcHRpb25zW2tleV0gPT09IHVuZGVmaW5lZCkgb3B0aW9uc1trZXldID0gZGVmYXVsdHNba2V5XTtcbiAgfSk7XG59O1xuXG4vLyBpbnNlcnQgYW4gaXRlbSBhcyB0aGUgbmV3IGZpcnN0IGNoaWxkXG5leHBvcnRzLnByZXBlbmQgPSBmdW5jdGlvbiAocGFyZW50LCBlbGVtZW50KSB7XG4gIHBhcmVudC5pbnNlcnRCZWZvcmUoZWxlbWVudCwgcGFyZW50LmZpcnN0Q2hpbGQpO1xufTtcblxuLy8gZ2V0IGltYWdlIHNyYyBmcm9tIGJhY2tncm91bmQgaW1hZ2VcbmV4cG9ydHMuZ2V0SW1hZ2VTcmNGcm9tRWxlbWVudCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gIGlmIChlbGVtZW50LnNyYykgcmV0dXJuIGVsZW1lbnQuc3JjO1xuICB2YXIgc3R5bGUgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShlbGVtZW50KTtcbiAgdmFyIHN0eWxlU3JjID0gc3R5bGVbJ2JhY2tncm91bmQtaW1hZ2UnXTtcbiAgaWYgKCFzdHlsZVNyYykgcmV0dXJuO1xuICByZXR1cm4gc3R5bGVTcmMuc3Vic3RyKDAsIHN0eWxlU3JjLmxlbmd0aCAtIDEpLnN1YnN0cig0KTtcbn07XG5cbmV4cG9ydHMudXJsRnJvbWltYWdlID0gZnVuY3Rpb24gKGltYWdlKSB7XG4gIHJldHVybiAndXJsKCcgKyBpbWFnZS5zcmMgKyAnKSc7XG59O1xuXG4vLyBhcHBseSB0aGUgZ2l2ZW4gYXJndW1lbnRzIHRvIGEgZnVuY3Rpb24gbXVsdGlwbGUgdGltZXMgaW4gc2VyaWVzXG5leHBvcnRzLmFwcGx5U2VyaWVzID0gZnVuY3Rpb24gKGZuLCBhcmdzTGlzdCwgZG9uZSkge1xuICB2YXIgcmVzTGlzdCA9IFtdO1xuICBmdW5jdGlvbiBuZXh0KHJlcykge1xuICAgIHJlc0xpc3QucHVzaChyZXMpO1xuICAgIGlmIChyZXNMaXN0Lmxlbmd0aCA9PT0gYXJnc0xpc3QubGVuZ3RoKSBkb25lKHJlc0xpc3QpO1xuICB9XG4gIGFyZ3NMaXN0LmZvckVhY2goZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICBpZiAoIShhcmdzIGluc3RhbmNlb2YgQXJyYXkpKSBhcmdzID0gW2FyZ3NdO1xuICAgIGFyZ3MucHVzaChuZXh0KTtcbiAgICBmbi5hcHBseShudWxsLCBhcmdzKTtcbiAgfSk7XG59O1xuXG4vLyBwcmVsb2FkIGltYWdlc1xuZXhwb3J0cy5wcmVsb2FkSW1hZ2VzID0gZnVuY3Rpb24gKGltYWdlU3JjcywgZG9uZSkge1xuICBleHBvcnRzLmFwcGx5U2VyaWVzKGZ1bmN0aW9uIChzcmMsIG5leHQpIHtcbiAgICB2YXIgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcbiAgICBpbWFnZS5zcmMgPSBzcmM7XG4gICAgaW1hZ2UuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgIG5leHQoaW1hZ2UpO1xuICAgIH0pO1xuICB9LCBpbWFnZVNyY3MsIGRvbmUpO1xufTtcblxuIl19
