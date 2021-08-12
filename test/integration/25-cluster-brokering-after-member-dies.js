const HappnerCluster = require('../..');
var Promise = require('bluebird');
var expect = require('expect.js');
const libDir = require('../_lib/lib-dir');
const baseConfig = require('../_lib/base-config');
const stopCluster = require('../_lib/stop-cluster');
const testclient = require('../_lib/client');

const clearMongoCollection = require('../_lib/clear-mongo-collection');
const { fork } = require('child_process');
//var log = require('why-is-node-running');
describe(require('../_lib/test-helper').testName(__filename, 3), function() {
  const servers = [];

  this.timeout(50000);
  beforeEach('clear mongo collection', function(done) {
    this.timeout(20000);
    stopCluster(servers, function(e) {
      if (e) return done(e);
      servers.splice(0, servers.length);
      clearMongoCollection('mongodb://localhost', 'happn-cluster', function() {
        done();
      });
    });
  });

  after('stop cluster', function(done) {
    this.timeout(30000);
    stopCluster(servers, function() {
      clearMongoCollection('mongodb://localhost', 'happn-cluster', function() {
        done();
      });
    });
  });

  it('starts the cluster internal first, connects a client to the local instance, and is able to access the remote component via the broker', function(done) {
    var thisClient;
    let child;
    startEdge(1, 1)
      .then(() => {
        child = fork(libDir + 'test-25-sub-process.js', ['2']);
        child.on('message', msg => {
          if (msg === 'kill') child.kill('SIGKILL');
        });
      })
      .then(() => {
        return new Promise(resolve => {
          setTimeout(resolve, 5000);
        });
      })
      .then(function() {
        return testclient.create('username', 'password', 55001);
      })
      .then(function(client) {
        thisClient = client;
        return thisClient.exchange.breakingComponent.happyMethod();
      })
      .then(function(result) {
        expect(result).to.be('MESH_2:brokenComponent:happyMethod');
        return thisClient.exchange.breakingComponent.breakingMethod(1, 2);
      })
      .then(function(result) {
        expect(result).to.be('I am happy!');
        return thisClient.exchange.breakingComponent.breakingMethod(1); // Too few arguments
      })
      .catch(e => {
        expect(e).to.be('Request timed out');
      })
      .then(() => {
        return fork(libDir + 'test-25-sub-process.js', ['3']);
      })
      .then(function(forked) {
        child = forked;
        return new Promise(resolve => {
          setTimeout(resolve, 5000);
        });
      })
      .then(function() {
        return thisClient.exchange.breakingComponent.happyMethod();
      })
      .then(function(result) {
        expect(result).to.be('MESH_3:brokenComponent:happyMethod');
        return thisClient.exchange.breakingComponent.breakingMethod(1, 2);
      })
      .then(function(result) {
        expect(result).to.be('I am happy!');
        child.kill('SIGKILL');
        done();
      })
      .catch(done);
  });

  function localInstanceConfig(seq, sync) {
    var config = baseConfig(seq, sync, true);
    config.authorityDelegationOn = true;
    let brokerComponentPath = libDir + 'integration-25-broker-component';
    config.modules = {
      brokerComponent: {
        path: brokerComponentPath
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

  async function startEdge(id, clusterMin, dynamic) {
    const server = await HappnerCluster.create(localInstanceConfig(id, clusterMin, dynamic));
    servers.push(server);
    return server;
  }
});
