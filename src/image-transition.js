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
