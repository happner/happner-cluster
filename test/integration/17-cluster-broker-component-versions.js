const HappnerCluster = require('../..');
var Promise = require('bluebird');
var expect = require('expect.js');

var libDir = require('../_lib/lib-dir');
var baseConfig = require('../_lib/base-config');
var stopCluster = require('../_lib/stop-cluster');
var users = require('../_lib/users');
var testclient = require('../_lib/client');
const getSeq = require('../_lib/helpers/getSeq');

var clearMongoCollection = require('../_lib/clear-mongo-collection');
//var log = require('why-is-node-running');
describe(require('../_lib/test-helper').testName(__filename, 3), function() {
  this.timeout(40000);
  var servers = [],
    localInstance;

  function localInstanceConfig(seq, sync) {
    var config = baseConfig(seq, sync, true);
    config.modules = {
      brokerComponent: {
        path: libDir + 'integration-broker-component-versions'
      }
    };
    config.components = {
      brokerComponent: {
        startMethod: 'start',
        stopMethod: 'stop'
      }
    };
    return config;
  }

  function remoteInstanceConfig(seq, sync) {
    var config = baseConfig(seq, sync, true);
    config.modules = {
      remoteComponent: {
        path: libDir + 'integration-remote-component-versions'
      },
      prereleaseComponent: {
        path: libDir + 'integration-remote-component-versions-prerelease'
      },
      prereleaseComponentNotFound: {
        path: libDir + 'integration-remote-component-versions-prerelease-not-found'
      }
    };
    config.components = {
      remoteComponent: {
        startMethod: 'start',
        stopMethod: 'stop'
      },
      remoteComponent1: {
        module: 'remoteComponent',
        startMethod: 'start',
        stopMethod: 'stop'
      },
      prereleaseComponent: {
        module: 'prereleaseComponent',
        startMethod: 'start',
        stopMethod: 'stop'
      },
      prereleaseComponentNotFound: {
        module: 'prereleaseComponentNotFound',
        startMethod: 'start',
        stopMethod: 'stop'
      }
    };
    return config;
  }

  beforeEach('clear mongo collection', function(done) {
    stopCluster(servers, function(e) {
      if (e) return done(e);
      servers = [];
      clearMongoCollection('mongodb://localhost', 'happn-cluster', function() {
        done();
      });
    });
  });

  function startInternal(id, clusterMin) {
    return HappnerCluster.create(remoteInstanceConfig(id, clusterMin));
  }

  function startEdge(id, clusterMin) {
    return HappnerCluster.create(localInstanceConfig(id, clusterMin));
  }

  function startClusterInternalFirst() {
    return new Promise(function(resolve, reject) {
      startInternal(getSeq.getFirst(), 1)
        .then(function(server) {
          servers.push(server);
          localInstance = server;
          return startEdge(getSeq.getNext(), 2);
        })
        .then(function(server) {
          servers.push(server);
          return users.add(localInstance, 'username', 'password');
        })
        .then(resolve)
        .catch(reject);
    });
  }

  after('stop cluster', function(done) {
    if (!servers) return done();
    stopCluster(servers, function() {
      clearMongoCollection('mongodb://localhost', 'happn-cluster', function() {
        done();
      });
    });
  });

  context('exchange', function() {
    it('starts the cluster internal first, connects a client to the local instance, and is not able to access the unimplemented remote component', function(done) {
      var thisClient;

      startClusterInternalFirst()
        .then(function() {
          return users.allowMethod(localInstance, 'username', 'brokerComponent', 'directMethod');
        })
        .then(function() {
          return users.allowMethod(localInstance, 'username', 'remoteComponent', 'brokeredMethod1');
        })
        .then(function() {
          return users.allowMethod(
            localInstance,
            'username',
            'remoteComponent1',
            'brokeredMethod1'
          );
        })
        .then(function() {
          return users.allowMethod(
            localInstance,
            'username',
            'prereleaseComponent',
            'brokeredMethod1'
          );
        })
        .then(function() {
          return users.allowMethod(
            localInstance,
            'username',
            'prereleaseComponentNotFound',
            'brokeredMethod1'
          );
        })
        .then(function() {
          return new Promise(resolve => {
            setTimeout(resolve, 5000);
          });
        })
        .then(function() {
          return testclient.create('username', 'password', getSeq.getPort(2));
        })
        .then(function(client) {
          thisClient = client;
          //first test our broker components methods are directly callable
          return thisClient.exchange.brokerComponent.directMethod();
        })
        .then(function(result) {
          expect(result).to.be(getSeq.getMeshName(2) + ':brokerComponent:directMethod');
          //call to good version of method
          return thisClient.exchange.remoteComponent1.brokeredMethod1();
        })
        .then(function() {
          //call to prerelease method
          return thisClient.exchange.prereleaseComponent.brokeredMethod1();
        })
        .then(function() {
          //call to bad version of method
          return thisClient.exchange.remoteComponent.brokeredMethod1();
        })
        .catch(e => {
          //expect a failure - wrong version
          expect(e.message).to.be('Not implemented remoteComponent:^1.0.0:brokeredMethod1');
          done();
        });
    });

    it('starts the cluster internal first, connects a client to the local instance, and is not able to access the unimplemented remote component, prerelease not found', function(done) {
      var thisClient;

      startClusterInternalFirst()
        .then(function() {
          return users.allowMethod(localInstance, 'username', 'brokerComponent', 'directMethod');
        })
        .then(function() {
          return users.allowMethod(localInstance, 'username', 'remoteComponent', 'brokeredMethod1');
        })
        .then(function() {
          return users.allowMethod(
            localInstance,
            'username',
            'remoteComponent1',
            'brokeredMethod1'
          );
        })
        .then(function() {
          return users.allowMethod(
            localInstance,
            'username',
            'prereleaseComponent',
            'brokeredMethod1'
          );
        })
        .then(function() {
          return users.allowMethod(
            localInstance,
            'username',
            'prereleaseComponentNotFound',
            'brokeredMethod1'
          );
        })
        .then(function() {
          return new Promise(resolve => {
            setTimeout(resolve, 5000);
          });
        })
        .then(function() {
          return testclient.create('username', 'password', getSeq.getPort(2));
        })
        .then(function(client) {
          thisClient = client;
          //first test our broker components methods are directly callable
          return thisClient.exchange.brokerComponent.directMethod();
        })
        .then(function(result) {
          expect(result).to.be(getSeq.getMeshName(2) + ':brokerComponent:directMethod');
          //call to good version of method
          return thisClient.exchange.remoteComponent1.brokeredMethod1();
        })
        .then(function() {
          //call to prerelease method
          return thisClient.exchange.prereleaseComponent.brokeredMethod1();
        })
        .then(function() {
          //call to bad version of method
          return thisClient.exchange.prereleaseComponentNotFound.brokeredMethod1();
        })
        .catch(e => {
          //expect a failure - wrong version
          expect(e.message).to.be(
            'Not implemented prereleaseComponentNotFound:^4.0.0:brokeredMethod1'
          );
          done();
        });
    });
  });
});
