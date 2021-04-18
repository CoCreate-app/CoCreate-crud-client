(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(["@cocreate/socket-client", "@cocreate/crud-client/src/crud.js"], function(CoCreateSocket, CoCreateCRUD) {
        	return factory(true, CoCreateSocket, CoCreateCRUD)
        });
    } else if (typeof module === 'object' && module.exports) {
      let wnd = {
        config: {},
        File: {}
      }
      const CoCreateCRUD = require("@cocreate/crud-client/src/crud.js")
      const CoCreateSocket = require("@cocreate/socket-client")
      module.exports = factory(false, CoCreateSocket, CoCreateCRUD);
    } else {
        root.returnExports = factory(true, root["@cocreate/socket-client"], root["@cocreate/crud-client/src/crud.js"]);
  }
}(typeof self !== 'undefined' ? self : this, function (isBrowser, CoCreateSocket, CoCreateCRUD) {
  if (isBrowser) {
    let crud_socket = new CoCreateSocket('ws');
    CoCreateCRUD.setSocket(crud_socket);
    CoCreateCRUD.createSocket(window.config.host ? window.config.host : window.location.hostname, window.config.organization_Id)
  } 
  return CoCreateCRUD;
}));