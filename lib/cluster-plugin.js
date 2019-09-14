const HappnerClient = require('happner-client');

module.exports = function(clusterConfig) {
  return function(mesh, logger) {
    clusterConfig = clusterConfig || {};

    let opts = {
      requestTimeout: clusterConfig.requestTimeout,
      responseTimeout: clusterConfig.responseTimeout,
      logger: logger
    };

    let client = new HappnerClient(opts);
    mesh._mesh.clusterClient = client;

    return {
      broker: null,
      start: function(callback) {
        let brokeredModels = {};
        try{

          Object.keys(mesh._mesh.elements).forEach((componentName) => {
            let $happn = mesh._mesh.elements[componentName].component.instance;
            let package = mesh._mesh.elements[componentName].module.package;
            let model;

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
            this.brokerage = require('./brokerage').create(brokeredModels, mesh, client, logger, clusterConfig);
            this.brokerWebProxy = require('./broker-web-proxy').create(mesh);
            return this.brokerage.inject(function(injectError){
              callback(injectError);
            });
          }

          callback();
        }catch(e){
          return callback(e);
        }
      },

      stop: function(callback) {
        if (client) {
          client.unmount();
          client = undefined;
        }
        if (this.brokerage) return this.brokerage.detach(callback);
        callback();
      }
    };
  };
};
