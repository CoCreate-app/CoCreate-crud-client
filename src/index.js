(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(["./crud"], function(CoCreateCrud) {
        	return factory(CoCreateCrud)
        });
    } else if (typeof module === 'object' && module.exports) {
      const CoCreateCrud = require("./crud.js")
      module.exports = factory(CoCreateCrud);
    } else {
        root.returnExports = factory(root["./crud.js"]);
  }
}(typeof self !== 'undefined' ? self : this, function (CoCreateCrud) {
  return CoCreateCrud;
}));