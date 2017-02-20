var Happner = require('happner-2');
var HappnCluster = require('happn-cluster');
var Promise = require('bluebird');

var ClusterPlugin = require('./cluster-plugin');

module.exports.create = Promise.promisify(function (config, callback) {

  var happner;

  if (typeof config == 'function') {
    callback = config;
    return callback(new Error('missing config'));
  }

  Happner.AssignedHappnServer = HappnCluster; // Switch happner datalayer to cluster

  config.happn = config.happn || {};
  config.happn.services = config.happn.services || {};
  config.happn.services.orchestrator = config.happn.services.orchestrator || {};
  cursor = config.happn.services.orchestrator;
  cursor.config = cursor.config || {};
  cursor.config.replicate = ['/_events/*'];

  config.plugins = config.plugins || [];
  config.plugins.push(ClusterPlugin(config.happn.cluster || {}));

  if (!gotNedbConfig(config)) addNedbConfig(config);

  Happner.create(config)

    .then(function (_happner) {
      happner = _happner;
    })

    // .then(function () {
    //
    // })

    .then(function () {
      callback(null, happner);
    })

    .catch(function (error) {
      if (!happner) return callback(error);
      happner.log.fatal(error);
      happner.stop(function (e) {
        if (e) happner.log.error(e);
        callback(error);
      });
    });

});

var gotNedbConfig = function (config) {
  if (!config.happn.services.data) return false;
  if (!config.happn.services.data.config) return false;
  if (!config.happn.services.data.config.datastores) return false;

  var present = false;
  config.happn.services.data.config.datastores.forEach(function (ds) {
    if (!ds.patterns) return;
    if (ds.patterns.indexOf('/mesh/schema/*') >= 0) {
      present = true;
    }
  });

  return present;
};

var addNedbConfig = function (config) {
  config.happn.services.data = config.happn.services.data || {};
  config.happn.services.data.config = config.happn.services.data.config || {};
  config.happn.services.data.config.datastores = config.happn.services.data.config.datastores || [];
  config.happn.services.data.config.datastores.push({
    name: 'nedb',
    settings: {},
    patterns: [
      '/mesh/schema/*'
    ]
  });
};
