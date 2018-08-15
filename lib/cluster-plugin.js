var HappnerClient = require('happner-client');

module.exports = function (clusterConfig) {
  return function (mesh, logger) {

    clusterConfig = clusterConfig || {};

    var opts = {
      requestTimeout: clusterConfig.requestTimeout,
      responseTimeout: clusterConfig.responseTimeout,
      logger: logger
    };

    var client = new HappnerClient(opts);

    mesh._mesh.clusterClient = client;

    // return the happner plugin

    return {
      broker:null,
      start: function (callback) {
        Object.keys(mesh._mesh.elements).forEach(function (componentName) {
          var $happn = mesh._mesh.elements[componentName].component.instance;
          var package = mesh._mesh.elements[componentName].module.package;
          var model;

          if (!package.happner) return;
          if (!package.happner.dependencies) return;
          if (package.happner.dependencies['$broker']) {
            this.broker = require('./broker-component').bridge(package, mesh, client);
            return;
          }
          if (!package.happner.dependencies[componentName]) return;

          // get dependencies for specific component
          model = package.happner.dependencies[componentName];

          // amend $happn with model
          client.construct(model, $happn);
        });

        // mount .peers in orchestrator
        client.mount(mesh._mesh.happn.server.services.orchestrator);

        callback();
      },

      stop: function (callback) {
        client.unmount();
        client = undefined;
        if (this.broker) this.broker.break();
        callback();
      }
    }
  }
};
