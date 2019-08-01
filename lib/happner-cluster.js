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
  cursor.config.replicate = [
    '/_events/*',
    '/_events/*/*',
    '/_events/*/*/*',
    '/_events/*/*/*/*',
    '/_events/*/*/*/*/*',
    '/_events/*/*/*/*/*/*',
    '/_events/*/*/*/*/*/*/*',
    '/_events/*/*/*/*/*/*/*/*',
    '/_events/*/*/*/*/*/*/*/*/*',
    '/_events/*/*/*/*/*/*/*/*/*/*'
  ];

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
  config.cluster = config.cluster || {};

  config.plugins.push(ClusterPlugin(config.cluster));
  if (!nedb.gotConfig(config)) nedb.addConfig(config);

  Happner.create(config)

    .then(function (_happner) {
      happner = _happner;
    })

    .then(function () {
      let brokerage = require('./brokerage').instance(config.name);
      if (brokerage && config.cluster.dependenciesSatisfiedDeferListen) return brokerage.deferProxyStart(happner._mesh.happn.server.services.proxy);
      return happner._mesh.happn.server.services.proxy.start();
    })

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
