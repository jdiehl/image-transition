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
  styleSrc = styleSrc.substr(0, styleSrc.length - 1).substr(4);
  if (styleSrc[0] === '"') styleSrc = styleSrc.substr(0, styleSrc.length - 1).substr(1);
  return styleSrc;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qZGllaGwvRG9jdW1lbnRzL0NvZGluZy9ub2RlL2ltYWdlLXRyYW5zaXRpb24vbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9qZGllaGwvRG9jdW1lbnRzL0NvZGluZy9ub2RlL2ltYWdlLXRyYW5zaXRpb24vc3JjL2Zha2VfYzQ1ODM5MTIuanMiLCIvVXNlcnMvamRpZWhsL0RvY3VtZW50cy9Db2Rpbmcvbm9kZS9pbWFnZS10cmFuc2l0aW9uL3NyYy90aWxlZC10cmFuc2l0aW9uLmpzIiwiL1VzZXJzL2pkaWVobC9Eb2N1bWVudHMvQ29kaW5nL25vZGUvaW1hZ2UtdHJhbnNpdGlvbi9zcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbnZhciB0aWxlZCA9IHJlcXVpcmUoJy4vdGlsZWQtdHJhbnNpdGlvbicpO1xudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuZnVuY3Rpb24gbWFrZSh0cmFuc2l0aW9uLCBkZWZhdWx0cykge1xuICByZXR1cm4gZnVuY3Rpb24gKGVsZW1lbnQsIHRvSW1hZ2VTcmMsIG9wdGlvbnMsIGRvbmUpIHtcblxuICAgIGlmICghb3B0aW9ucykgb3B0aW9ucyA9IHt9O1xuXG4gICAgLy8gb3B0aW9uYWwgb3B0aW9ucyBwYXJhbWV0ZXJcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGRvbmUgPSBvcHRpb25zO1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cblxuICAgIC8vIGFwcGx5IGRlZmF1bHRzIGZyb20gdGhlIG1ha2UgZnVuY3Rpb25cbiAgICB1dGlsLmFwcGx5RGVmYXVsdHMob3B0aW9ucywgZGVmYXVsdHMpO1xuXG4gICAgLy8gZmV0Y2ggdGhlIGVsZW1lbnRcbiAgICBpZiAodHlwZW9mIGVsZW1lbnQgPT09ICdzdHJpbmcnKSBlbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihlbGVtZW50KTtcblxuICAgIC8vIHByZWxvYWQgaW1hZ2VzXG4gICAgdmFyIGZyb21JbWFnZVNyYyA9IHV0aWwuZ2V0SW1hZ2VTcmNGcm9tRWxlbWVudChlbGVtZW50KTtcbiAgICB1dGlsLnByZWxvYWRJbWFnZXMoW2Zyb21JbWFnZVNyYywgdG9JbWFnZVNyY10sIGZ1bmN0aW9uIChpbWFnZXMpIHtcblxuICAgICAgLy8gZXhlY3V0ZSB0aGUgdHJhbnNpdGlvblxuICAgICAgdHJhbnNpdGlvbihlbGVtZW50LCBpbWFnZXNbMF0sIGltYWdlc1sxXSwgb3B0aW9ucywgZG9uZSk7XG5cbiAgICB9KTtcbiAgfTtcbn1cblxuLy8gaW1hZ2UtdHJhbnNpdGlvbiBhcGlcbndpbmRvdy5JbWFnZVRyYW5zaXRpb24gPSBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgdGlsZWQ6IG1ha2UodGlsZWQpLFxuICBtb3NhaWM6IG1ha2UodGlsZWQsIHsgdGlsZXM6IDEwLCBkdXJhdGlvbjogNTAwLCB0cmFuc2l0aW9uOiAncm90YXRleScgfSlcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbmZ1bmN0aW9uIHByZXBhcmVPcHRpb25zKGVsZW1lbnQsIG9wdGlvbnMpIHtcblxuICAvLyBkZXRlcm1pbmUgdGhlIG51bWJlciBvZiB0aWxlcyB0byBjcmVhdGVcbiAgaWYgKG9wdGlvbnMudGlsZVNpemUpIHtcbiAgICBvcHRpb25zLnRpbGVzID0gTWF0aC5yb3VuZChNYXRoLm1heChlbGVtZW50Lm9mZnNldFdpZHRoLCBlbGVtZW50Lm9mZnNldEhlaWdodCkgLyBvcHRpb25zLnRpbGVTaXplKTtcbiAgfVxuICBpZiAob3B0aW9ucy50aWxlcykge1xuICAgIGlmIChlbGVtZW50Lm9mZnNldFdpZHRoID4gZWxlbWVudC5vZmZzZXRIZWlnaHQpIHtcbiAgICAgIG9wdGlvbnMuY29scyA9IG9wdGlvbnMudGlsZXM7XG4gICAgICBvcHRpb25zLnJvd3MgPSBNYXRoLnJvdW5kKG9wdGlvbnMudGlsZXMgLyBlbGVtZW50Lm9mZnNldFdpZHRoICogZWxlbWVudC5vZmZzZXRIZWlnaHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvcHRpb25zLmNvbHMgPSBNYXRoLnJvdW5kKG9wdGlvbnMudGlsZXMgLyBlbGVtZW50Lm9mZnNldEhlaWdodCAqIGVsZW1lbnQub2Zmc2V0V2lkdGgpO1xuICAgICAgb3B0aW9ucy5yb3dzID0gb3B0aW9ucy50aWxlcztcbiAgICB9XG4gIH1cbiAgb3B0aW9ucy5jb2xzID0gb3B0aW9ucy5jb2xzIHx8IDE7XG4gIG9wdGlvbnMucm93cyA9IG9wdGlvbnMucm93cyB8fCAxO1xuXG4gIC8vIGRldGVybWluZSBob3cgbG9uZyB0aWxlcyBzaG91bGQgdHJhbnNpdGlvblxuICBvcHRpb25zLmR1cmF0aW9uID0gb3B0aW9ucy5kdXJhdGlvbiB8fCAxMDAwO1xuICBvcHRpb25zLmRlbGF5ID0gb3B0aW9ucy5kZWxheSB8fCBmdW5jdGlvbiAoeCwgeSkgeyByZXR1cm4gKHggKyB5KSAqIDUwOyB9O1xufVxuXG5mdW5jdGlvbiBzdHlsZVRvUG9pbnQoc3R5bGUpIHtcbiAgcmV0dXJuIHN0eWxlLnNwbGl0KCcgJykubWFwKGZ1bmN0aW9uICh2KSB7XG4gICAgaWYgKHYuaW5kZXhPZigncHgnKSA+PSAwKSByZXR1cm4gcGFyc2VJbnQodik7XG4gICAgcmV0dXJuIHBhcnNlSW50KHYpIC8gMTAwO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gcG9pbnRUb1N0eWxlKHBvaW50LCB1bml0KSB7XG4gIHVuaXQgPSB1bml0IHx8ICdweCc7XG4gIHZhciBkID0gdW5pdCA9PT0gJyUnID8gMTAwIDogMTtcbiAgcmV0dXJuIHBvaW50Lm1hcChmdW5jdGlvbiAodikgeyByZXR1cm4gdiAqIGQgKyB1bml0OyB9KS5qb2luKCcgJyk7XG59XG5cbmZ1bmN0aW9uIGNvbXB1dGVJbWFnZVRyYW5zZm9ybShpbWFnZSwgZWxlbWVudCwgc3R5bGUpIHtcbiAgdmFyIHcgPSBlbGVtZW50Lm9mZnNldFdpZHRoO1xuICB2YXIgaCA9IGVsZW1lbnQub2Zmc2V0SGVpZ2h0O1xuICB2YXIgdCA9IHsgeDogMCwgeTogMCwgdzogdywgaDogaCB9O1xuICBpZiAoc3R5bGVbJ2JhY2tncm91bmQtc2l6ZSddID09PSAnY292ZXInKSB7XG4gICAgdmFyIGl3ID0gaW1hZ2UubmF0dXJhbFdpZHRoO1xuICAgIHZhciBpaCA9IGltYWdlLm5hdHVyYWxIZWlnaHQ7XG4gICAgaWYgKHQudyAvIGl3ID4gdC5oIC8gaWgpIHtcbiAgICAgIHQuaCA9IHQudyAvIGl3ICogaWg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHQudyA9IHQuaCAvIGloICogaXc7XG4gICAgfVxuICB9XG4gIGlmIChzdHlsZVsnYmFja2dyb3VuZC1wb3NpdGlvbiddKSB7XG4gICAgdmFyIGQgPSBzdHlsZVRvUG9pbnQoc3R5bGVbJ2JhY2tncm91bmQtcG9zaXRpb24nXSk7XG4gICAgaWYgKHN0eWxlWydiYWNrZ3JvdW5kLXBvc2l0aW9uJ10uaW5kZXhPZignJScpID49IDApIHtcbiAgICAgIHQueCA9IC0odC53IC0gdykgKiBkWzBdO1xuICAgICAgdC55ID0gLSh0LmggLSBoKSAqIGRbMV07XG4gICAgfSBlbHNlIHtcbiAgICAgIHQueCA9IGRbMF07XG4gICAgICB0LnkgPSBkWzFdO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdDtcbn1cblxuZnVuY3Rpb24gbWFrZVRpbGUoeCwgeSwgdywgaCwgdCwgaW1nVXJsKSB7XG4gIHZhciB0aWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIHRpbGUuY2xhc3NMaXN0LmFkZCgndGlsZScpO1xuICB0aWxlLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcbiAgdGlsZS5zdHlsZVsnYmFja2dyb3VuZC1pbWFnZSddID0gaW1nVXJsO1xuICB0aWxlLnN0eWxlLmxlZnQgPSB4ICogdyArICdweCc7XG4gIHRpbGUuc3R5bGUudG9wID0geSAqIGggKyAncHgnO1xuICB0aWxlLnN0eWxlLndpZHRoID0gdyArICdweCc7XG4gIHRpbGUuc3R5bGUuaGVpZ2h0ID0gaCArICdweCc7XG4gIHRpbGUuc3R5bGVbJ2JhY2tncm91bmQtc2l6ZSddID0gcG9pbnRUb1N0eWxlKFt0LncsIHQuaF0pO1xuICB0aWxlLnN0eWxlWydiYWNrZ3JvdW5kLXBvc2l0aW9uJ10gPSBwb2ludFRvU3R5bGUoW01hdGgucm91bmQodC54IC0geCAqIHcpLCBNYXRoLnJvdW5kKHQueSAtIHkgKiBoKV0pO1xuICByZXR1cm4gdGlsZTtcbn1cblxuLy8gaW1hZ2UgdHJhbnNpdGlvblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoZWxlbWVudCwgZnJvbUltYWdlLCB0b0ltYWdlLCBvcHRpb25zLCBkb25lKSB7XG5cbiAgcHJlcGFyZU9wdGlvbnMoZWxlbWVudCwgb3B0aW9ucyk7XG5cbiAgdmFyIGVsZW1lbnRTdHlsZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsZW1lbnQpO1xuICB2YXIgZnJvbUltYWdlVHJhbnNmb3JtID0gY29tcHV0ZUltYWdlVHJhbnNmb3JtKGZyb21JbWFnZSwgZWxlbWVudCwgZWxlbWVudFN0eWxlKTtcbiAgdmFyIHRvSW1hZ2VUcmFuc2Zvcm0gPSBjb21wdXRlSW1hZ2VUcmFuc2Zvcm0odG9JbWFnZSwgZWxlbWVudCwgZWxlbWVudFN0eWxlKTtcbiAgdmFyIGZyb21JbWFnZVVybCA9IHV0aWwudXJsRnJvbWltYWdlKGZyb21JbWFnZSk7XG4gIHZhciB0b0ltYWdlVXJsID0gdXRpbC51cmxGcm9taW1hZ2UodG9JbWFnZSk7XG5cbiAgdmFyIHRpbGVzID0gW107XG4gIHZhciB0aWxlc0NvdW50ID0gb3B0aW9ucy5jb2xzICogb3B0aW9ucy5yb3dzO1xuICBmdW5jdGlvbiB0aWxlRG9uZSh0aWxlKSB7XG4gICAgdGlsZXMucHVzaCh0aWxlKTtcbiAgICBpZiAodGlsZXMubGVuZ3RoID09PSB0aWxlc0NvdW50KSB7XG4gICAgICBlbGVtZW50LnN0eWxlWydiYWNrZ3JvdW5kLWltYWdlJ10gPSB1dGlsLnVybEZyb21pbWFnZSh0b0ltYWdlKTtcbiAgICAgIHRpbGVzLmZvckVhY2goZWxlbWVudC5yZW1vdmVDaGlsZC5iaW5kKGVsZW1lbnQpKTtcbiAgICAgIGlmIChkb25lKSBkb25lKCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbWFrZVRyYW5zaXRpb25UaWxlKGksIG5leHQpIHtcbiAgICB2YXIgdyA9IE1hdGgucm91bmQoZWxlbWVudC5vZmZzZXRXaWR0aCAvIG9wdGlvbnMuY29scyk7XG4gICAgdmFyIGggPSBNYXRoLnJvdW5kKGVsZW1lbnQub2Zmc2V0SGVpZ2h0IC8gb3B0aW9ucy5yb3dzKTtcbiAgICB2YXIgeCA9IGkgJSBvcHRpb25zLmNvbHM7XG4gICAgdmFyIHkgPSBNYXRoLmZsb29yKGkgLyBvcHRpb25zLmNvbHMpO1xuICAgIHZhciBmcm9tVGlsZSA9IG1ha2VUaWxlKHgsIHksIHcsIGgsIGZyb21JbWFnZVRyYW5zZm9ybSwgZnJvbUltYWdlVXJsKTtcbiAgICB2YXIgdG9UaWxlID0gbWFrZVRpbGUoeCwgeSwgdywgaCwgdG9JbWFnZVRyYW5zZm9ybSwgdG9JbWFnZVVybCk7XG5cbiAgICB1dGlsLnByZXBlbmQoZWxlbWVudCwgZnJvbVRpbGUpO1xuXG4gICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICBmcm9tVGlsZS5zdHlsZS5hbmltYXRpb24gPSAnaW1hZ2UtdHJhbnNpdGlvbi0nICsgb3B0aW9ucy50cmFuc2l0aW9uICsgJy1vdXQgJyArIG9wdGlvbnMuZHVyYXRpb24gKyAnbXMnO1xuICAgICAgdG9UaWxlLnN0eWxlLmFuaW1hdGlvbiA9ICdpbWFnZS10cmFuc2l0aW9uLScgKyBvcHRpb25zLnRyYW5zaXRpb24gKyAnLWluICcgKyBvcHRpb25zLmR1cmF0aW9uICsgJ21zJztcbiAgICAgIHV0aWwucHJlcGVuZChlbGVtZW50LCB0b1RpbGUpO1xuICAgIH0sIG9wdGlvbnMuZGVsYXkoeCwgeSkpO1xuXG4gICAgdG9UaWxlLmFkZEV2ZW50TGlzdGVuZXIoJ2FuaW1hdGlvbmVuZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGVsZW1lbnQucmVtb3ZlQ2hpbGQoZnJvbVRpbGUpO1xuICAgICAgbmV4dCh0b1RpbGUpO1xuICAgIH0pO1xuICB9XG5cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRpbGVzQ291bnQ7IGkrKykge1xuICAgIG1ha2VUcmFuc2l0aW9uVGlsZShpLCB0aWxlRG9uZSk7XG4gIH1cbiAgZWxlbWVudC5zdHlsZVsnYmFja2dyb3VuZC1pbWFnZSddID0gJ25vbmUnO1xuXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLmFwcGx5RGVmYXVsdHMgPSBmdW5jdGlvbiAob3B0aW9ucywgZGVmYXVsdHMpIHtcbiAgaWYgKCFkZWZhdWx0cykgcmV0dXJuO1xuICBPYmplY3Qua2V5cyhkZWZhdWx0cykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgaWYgKG9wdGlvbnNba2V5XSA9PT0gdW5kZWZpbmVkKSBvcHRpb25zW2tleV0gPSBkZWZhdWx0c1trZXldO1xuICB9KTtcbn07XG5cbi8vIGluc2VydCBhbiBpdGVtIGFzIHRoZSBuZXcgZmlyc3QgY2hpbGRcbmV4cG9ydHMucHJlcGVuZCA9IGZ1bmN0aW9uIChwYXJlbnQsIGVsZW1lbnQpIHtcbiAgcGFyZW50Lmluc2VydEJlZm9yZShlbGVtZW50LCBwYXJlbnQuZmlyc3RDaGlsZCk7XG59O1xuXG4vLyBnZXQgaW1hZ2Ugc3JjIGZyb20gYmFja2dyb3VuZCBpbWFnZVxuZXhwb3J0cy5nZXRJbWFnZVNyY0Zyb21FbGVtZW50ID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgaWYgKGVsZW1lbnQuc3JjKSByZXR1cm4gZWxlbWVudC5zcmM7XG4gIHZhciBzdHlsZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsZW1lbnQpO1xuICB2YXIgc3R5bGVTcmMgPSBzdHlsZVsnYmFja2dyb3VuZC1pbWFnZSddO1xuICBpZiAoIXN0eWxlU3JjKSByZXR1cm47XG4gIHN0eWxlU3JjID0gc3R5bGVTcmMuc3Vic3RyKDAsIHN0eWxlU3JjLmxlbmd0aCAtIDEpLnN1YnN0cig0KTtcbiAgaWYgKHN0eWxlU3JjWzBdID09PSAnXCInKSBzdHlsZVNyYyA9IHN0eWxlU3JjLnN1YnN0cigwLCBzdHlsZVNyYy5sZW5ndGggLSAxKS5zdWJzdHIoMSk7XG4gIHJldHVybiBzdHlsZVNyYztcbn07XG5cbmV4cG9ydHMudXJsRnJvbWltYWdlID0gZnVuY3Rpb24gKGltYWdlKSB7XG4gIHJldHVybiAndXJsKCcgKyBpbWFnZS5zcmMgKyAnKSc7XG59O1xuXG4vLyBhcHBseSB0aGUgZ2l2ZW4gYXJndW1lbnRzIHRvIGEgZnVuY3Rpb24gbXVsdGlwbGUgdGltZXMgaW4gc2VyaWVzXG5leHBvcnRzLmFwcGx5U2VyaWVzID0gZnVuY3Rpb24gKGZuLCBhcmdzTGlzdCwgZG9uZSkge1xuICB2YXIgcmVzTGlzdCA9IFtdO1xuICBmdW5jdGlvbiBuZXh0KHJlcykge1xuICAgIHJlc0xpc3QucHVzaChyZXMpO1xuICAgIGlmIChyZXNMaXN0Lmxlbmd0aCA9PT0gYXJnc0xpc3QubGVuZ3RoKSBkb25lKHJlc0xpc3QpO1xuICB9XG4gIGFyZ3NMaXN0LmZvckVhY2goZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICBpZiAoIShhcmdzIGluc3RhbmNlb2YgQXJyYXkpKSBhcmdzID0gW2FyZ3NdO1xuICAgIGFyZ3MucHVzaChuZXh0KTtcbiAgICBmbi5hcHBseShudWxsLCBhcmdzKTtcbiAgfSk7XG59O1xuXG4vLyBwcmVsb2FkIGltYWdlc1xuZXhwb3J0cy5wcmVsb2FkSW1hZ2VzID0gZnVuY3Rpb24gKGltYWdlU3JjcywgZG9uZSkge1xuICBleHBvcnRzLmFwcGx5U2VyaWVzKGZ1bmN0aW9uIChzcmMsIG5leHQpIHtcbiAgICB2YXIgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcbiAgICBpbWFnZS5zcmMgPSBzcmM7XG4gICAgaW1hZ2UuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgIG5leHQoaW1hZ2UpO1xuICAgIH0pO1xuICB9LCBpbWFnZVNyY3MsIGRvbmUpO1xufTtcblxuIl19
