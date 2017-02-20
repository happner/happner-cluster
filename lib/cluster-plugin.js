var HappnerClient = require('happner-client');

module.exports = function (clusterConfig) {
  return function (mesh, logger, callback) {

    // 1. iterates over component instances passing them to HappnerClient.construct()
    // 2. calls HappnerClient.mount() with Orchestrator list of replication clients

    var opts = {
      requestTimeout: clusterConfig.requestTimeout,
      responseTimeout: clusterConfig.responseTimeout,
      logger: logger
    };

    var client = new HappnerClient(opts);

    Object.keys(mesh._mesh.elements).forEach(function (componentName) {

      var $happner = mesh._mesh.elements[componentName].component.instance;
      var package = mesh._mesh.elements[componentName].module.package;
      var model;

      if (!package.happner) return;
      if (!package.happner.dependencies) return;

      model = package.happner.dependencies;

      // amend $happner with model
      client.construct(model, $happner);

    });

    // mount .peers in orchastrator
    client.mount(mesh._mesh.happn.server.services.orchestrator);

    callback();
  }
};
