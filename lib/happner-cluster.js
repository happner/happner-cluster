

var Happner = require('happner-2');
var HappnCluster = require('happn-cluster');
var Promise = require('bluebird');

var ClusterPlugin = require('./cluster-plugin');
var nedb = require('./nedb');
var filterEventVersions = require('./filter-event-versions');

module.exports.create = Promise.promisify(function (config, callback) {

  var happner, cursor;

  if (typeof config == 'function') {
    callback = config;
    return callback(new Error('missing config'));
  }

  Happner.AssignedHappnServer = HappnCluster; // Switch happner datalayer to cluster

  // happner listens before initializing
  // to allow for inter-cluster replication bridges to connect
  config.listenFirst = true;

  config.happn = config.happn || {};
  config.happn.services = config.happn.services || {};
  config.happn.services.orchestrator = config.happn.services.orchestrator || {};
  cursor = config.happn.services.orchestrator;
  cursor.config = cursor.config || {};

  // only replicate these cluster-wide
  cursor.config.replicate = ['/_events/*'];

  config.happn.services.proxy = config.happn.services.proxy || {};
  cursor = config.happn.services.proxy;
  cursor.config = cursor.config || {};

  // proxy is started manually after happner is up
  // so that clients do not connect until component startMethods are run
  cursor.config.defer = true;

  config.happn.services.subscription = config.happn.services.subscription || {};
  cursor = config.happn.services.subscription;
  cursor.config = cursor.config || {};
  cursor.config.filter = filterEventVersions;

  config.plugins = config.plugins || [];

  console.log('adding plugin:::');

  config.plugins.push(ClusterPlugin(config.cluster || {}));

  if (!nedb.gotConfig(config)) nedb.addConfig(config);

  console.log('creating:::');

  Happner.create(config)

    .then(function (_happner) {
      console.log('created:::');
      happner = _happner;
    })

    .then(function () {
      return happner._mesh.happn.server.services.proxy.start();
    })

    .then(function () {
      callback(null, happner);
    })

    .catch(function (error) {
      console.log('caught:::');
      if (!happner) return callback(error);
      happner.log.fatal(error);
      console.log('stopping:::', e);
      happner.stop(function (e) {
        if (e) happner.log.error(e);
        callback(error);
      });
    });

});
