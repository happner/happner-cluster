const HappnerCluster = require("../..");
var Promise = require("bluebird");


var libDir = require("../_lib/lib-dir");
var baseConfig = require("../_lib/base-config");
var stopCluster = require("../_lib/stop-cluster");
var users = require("../_lib/users");
var testclient = require("../_lib/client");

var clearMongoCollection = require("../_lib/clear-mongo-collection");
//var log = require('why-is-node-running');
const test = require("../_lib/test-helper");
describe(test.testName(__filename, 3), function() {
  this.timeout(40000);

  var servers = [];

  function localInstanceConfig(seq, sync, dynamic) {
    var config = baseConfig(seq, sync, true);
    let brokerComponentPath = dynamic
      ? libDir + "integration-10-broker-component-dynamic"
      : libDir + "integration-09-broker-component";

    config.cluster = config.cluster || {};
    config.cluster.dependenciesSatisfiedDeferListen = true;
    config.modules = {
      localComponent: {
        path: libDir + "integration-09-local-component"
      },
      brokerComponent: {
        path: brokerComponentPath
      }
    };
    config.components = {
      localComponent: {
        startMethod: "start",
        stopMethod: "stop"
      },
      brokerComponent: {
        startMethod: "start",
        stopMethod: "stop"
      }
    };
    return config;
  }

  function remoteInstanceConfig(seq, sync) {
    var config = baseConfig(seq, sync, true);
    config.modules = {
      remoteComponent: {
        path: libDir + "integration-09-remote-component"
      },
      remoteComponent1: {
        path: libDir + "integration-09-remote-component-1"
      }
    };
    config.components = {
      remoteComponent: {
        startMethod: "start",
        stopMethod: "stop"
      },
      remoteComponent1: {
        startMethod: "start",
        stopMethod: "stop"
      }
    };
    return config;
  }

  beforeEach("clear mongo collection", function(done) {
    stopCluster(servers, function(e) {
      if (e) return done(e);
      servers = [];
      clearMongoCollection("mongodb://localhost", "happn-cluster", function() {
        done();
      });
    });
  });

  afterEach("stop cluster", function(done) {
    if (!servers) return done();
    stopCluster(servers, function() {
      clearMongoCollection("mongodb://localhost", "happn-cluster", function() {
        done();
      });
    });
  });

  function startInternal(id, clusterMin) {
    return new Promise((resolve, reject) => {
      return HappnerCluster.create(remoteInstanceConfig(id, clusterMin))
        .then(function(instance) {
          servers.push(instance);
          resolve(instance);
        })
        .catch(reject);
    });
  }

  function startEdge(id, clusterMin, dynamic) {
    return new Promise((resolve, reject) => {
      return HappnerCluster.create(localInstanceConfig(id, clusterMin, dynamic))
        .then(function(instance) {
          servers.push(instance);
          resolve(instance);
        })
        .catch(reject);
    });
  }

  context("exchange", function() {
    it("starts the cluster broker first, client connects and receives no further schema updates, when we flip-flop internal host", async () => {
      let schemaPublicationCount = 0;
      let edgeInstance = await startEdge(1, 1);
      let internalInstance = await startInternal(2, 2);
      await test.delay(5e3);
      await users.add(edgeInstance, "username", "password");
      const client = await testclient.create("username", "password", 55001);
      await client.data.on("/mesh/schema/description", () => {
        schemaPublicationCount++;
      });
      await internalInstance.stop({ reconnect: false });
      await test.delay(5e3);
      servers.pop(); //chuck the stopped server away
      await startInternal(2, 2);
      await test.delay(5e3);
      test.expect(schemaPublicationCount).to.be(0);
    });
  });
});
