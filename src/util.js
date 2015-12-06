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

