var HappnerClient = require('happner-client');

module.exports = function (clusterConfig) {
  return function (mesh, logger) {

    var opts = {
      requestTimeout: clusterConfig.requestTimeout,
      responseTimeout: clusterConfig.responseTimeout,
      logger: logger
    };

    var client = new HappnerClient(opts);

    mesh._mesh.clusterClient = client;

    // return the happner plugin

    return {
      start: function (callback) {
        Object.keys(mesh._mesh.elements).forEach(function (componentName) {
          var $happner = mesh._mesh.elements[componentName].component.instance;
          var package = mesh._mesh.elements[componentName].module.package;
          var model;

          if (!package.happner) return;
          if (!package.happner.dependencies) return;
          if (!package.happner.dependencies[componentName]) return;

          // get dependencies for specific component
          model = package.happner.dependencies[componentName];

          // amend $happner with model
          client.construct(model, $happner);
        });

        // mount .peers in orchestrator
        client.mount(mesh._mesh.happn.server.services.orchestrator);

        callback();
      },

      stop: function (callback) {
        client.unmount();
        client = undefined;
        callback();
      }
    }
  }
};
