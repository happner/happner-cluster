var HappnerClient = require('happner-client');

module.exports = function(clusterConfig) {
  return function(mesh, logger) {

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
      broker: null,
      start: function(callback) {

        var _this = this;
        var brokeredModels = {};

        try{

          Object.keys(mesh._mesh.elements).forEach(function(componentName) {
            var $happn = mesh._mesh.elements[componentName].component.instance;
            var package = mesh._mesh.elements[componentName].module.package;
            var model;

            if (!package.happner) return;
            if (!package.happner.dependencies) return;

            if (package.happner.dependencies['$broker']){
              brokeredModels[componentName] = {
                package: package.happner.dependencies['$broker'],
                $happn:$happn
              };

              model = package.happner.dependencies['$broker'];
              client.construct(model, $happn);
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

          if (Object.keys(brokeredModels).length > 0) {
            _this.brokerage = require('./brokerage').create(brokeredModels, mesh, client);
            return _this.brokerage.inject(function(injectError){
              callback(injectError);
            });
          }

          callback();
        }catch(e){
          return callback(e);
        }
      },

      stop: function(callback) {
        client.unmount();
        client = undefined;
        if (this.brokerage) return this.brokerage.detach(callback);
        callback();
      }
    }
  }
};
