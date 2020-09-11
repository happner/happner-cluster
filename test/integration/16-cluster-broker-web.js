const HappnerCluster = require('../..');
var Promise = require('bluebird');
var expect = require('expect.js');

var libDir = require('../_lib/lib-dir');
var baseConfig = require('../_lib/base-config');
var stopCluster = require('../_lib/stop-cluster');
var users = require('../_lib/users');
var testclient = require('../_lib/client');

var clearMongoCollection = require('../_lib/clear-mongo-collection');
//var log = require('why-is-node-running');
describe(require('../_lib/test-helper').testName(__filename, 3), function() {
  this.timeout(40000);

  var servers = [];

  function localInstanceConfig(seq, sync, dynamic) {
    var config = baseConfig(seq, sync, true);
    let brokerComponentPath = dynamic
      ? libDir + 'integration-10-broker-component-dynamic'
      : libDir + 'integration-09-broker-component';
    config.cluster = config.cluster || {};
    config.cluster.dependenciesSatisfiedDeferListen = true;
    config.modules = {
      localComponent: {
        path: libDir + 'integration-09-local-component'
      },
      brokerComponent: {
        path: brokerComponentPath
      }
    };
    config.components = {
      localComponent: {
        startMethod: 'start',
        stopMethod: 'stop'
      },
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
        path: libDir + 'integration-09-remote-component'
      },
      remoteComponent1: {
        path: libDir + 'integration-09-remote-component-1'
      }
    };
    config.components = {
      remoteComponent: {
        startMethod: 'start',
        stopMethod: 'stop'
      },
      remoteComponent1: {
        startMethod: 'start',
        stopMethod: 'stop',
        web: {
          routes: {
            testJSON: ['testJSON'],
            testJSONSticky: ['testJSONSticky']
          }
        }
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

  afterEach('stop cluster', function(done) {
    if (!servers) return done();
    stopCluster(servers, function() {
      clearMongoCollection('mongodb://localhost', 'happn-cluster', function() {
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

  function doRequest(path, token, port, callback) {
    var request = require('request');
    var options;

    options = {
      url: `http://127.0.0.1:${port}${path}?happn_token=${token}`
    };

    request(options, function(error, response, body) {
      callback(error, {
        response,
        body
      });
    });
  }

  function testWebCall(client, path, port) {
    return new Promise(resolve => {
      doRequest(path, client.token, port, function(e, response) {
        if (e)
          return resolve({
            error: e
          });
        resolve(response);
      });
    });
  }

  context('web', function() {
    it('starts the cluster broker, we ensure direct calls to the brokered component succeed', function(done) {
      var thisClient;
      var edgeInstance;
      var internalInstance;

      startEdge(1, 1)
        .then(function(instance) {
          edgeInstance = instance;
          return startInternal(2, 2);
        })
        .then(function(instance) {
          internalInstance = instance;
          return new Promise(resolve => {
            setTimeout(resolve, 5000);
          });
        })
        .then(function() {
          return users.add(edgeInstance, 'username', 'password');
        })
        .then(function() {
          return users.allowWebMethod(internalInstance, 'username', '/remoteComponent1/testJSON');
        })
        .then(function() {
          return testclient.create('_ADMIN', 'happn', 55002);
        })
        .then(function(adminClient) {
          return testWebCall(adminClient, '/remoteComponent1/testJSON', 55002);
        })
        .then(function(result) {
          expect(JSON.parse(result.body)).to.eql({
            test: 'data'
          });
          return testclient.create('username', 'password', 55002);
        })
        .then(function(client) {
          thisClient = client;
          //first test our broker components methods are directly callable
          return testWebCall(thisClient, '/remoteComponent1/testJSON', 55002);
        })
        .then(function(result) {
          expect(JSON.parse(result.body)).to.eql({
            test: 'data'
          });
          setTimeout(done, 2000);
        })
        .catch(done);
    });

    it('starts the cluster broker, we ensure indirect calls to the brokered component succeed', function(done) {
      var thisClient;
      var edgeInstance;
      var internalInstance;

      startEdge(1, 1)
        .then(function(instance) {
          edgeInstance = instance;
          return startInternal(2, 2);
        })
        .then(function(instance) {
          internalInstance = instance;
          return new Promise(resolve => {
            setTimeout(resolve, 5000);
          });
        })
        .then(function() {
          return users.add(edgeInstance, 'username', 'password');
        })
        .then(function() {
          return users.allowWebMethod(internalInstance, 'username', '/remoteComponent1/testJSON');
        })
        .then(function() {
          return testclient.create('_ADMIN', 'happn', 55001);
        })
        .then(function(adminClient) {
          return testWebCall(adminClient, '/remoteComponent1/testJSON', 55001);
        })
        .then(function(result) {
          expect(JSON.parse(result.body)).to.eql({
            test: 'data'
          });
          return testclient.create('username', 'password', 55001);
        })
        .then(function(client) {
          thisClient = client;
          //first test our broker components methods are directly callable
          return testWebCall(thisClient, '/remoteComponent1/testJSON', 55001);
        })
        .then(function(result) {
          expect(JSON.parse(result.body)).to.eql({
            test: 'data'
          });
          setTimeout(done, 2000);
        })
        .catch(done);
    });

    async function getClientForMesh(meshId, username, password, edgePort) {
      let client = null;
      while (client == null) {
        let checkClient = await testclient.create(username, password, edgePort);
        let response = await testWebCall(checkClient, '/remoteComponent1/testJSONSticky', 55001);
        if (response.body.toString().indexOf(`MESH_${meshId}`) > -1) client = checkClient;
        else await checkClient.disconnect();
      }
      return client;
    }

    it('starts the cluster broker, with 2 brokered internal nodes in a high availability configuration, we ensure indirect calls to the brokered component succeed and are sticky sessioned, then we stop one internal node and we ensure we are still able to access the web content on the remaining node', function(done) {
      let thisClientMesh2;
      let thisClientMesh3;
      let edgeInstance;
      let internalInstance1;

      let results = [];

      let pushResults = responseBody => {
        let result = {
          statusCode: responseBody.response.statusCode,
          statusMessage: responseBody.response.statusMessage,
          body: responseBody.body
        };
        results.push(result);
      };

      startEdge(1, 1)
        .then(function(instance) {
          edgeInstance = instance;
          return startInternal(2, 2);
        })
        .then(function(instance) {
          internalInstance1 = instance;
          return startInternal(3, 3);
        })
        .then(function() {
          return new Promise(resolve => {
            setTimeout(resolve, 2000);
          });
        })
        .then(function() {
          return users.add(edgeInstance, 'username', 'password');
        })
        .then(function() {
          return users.allowWebMethod(
            internalInstance1,
            'username',
            '/remoteComponent1/testJSONSticky'
          );
        })
        .then(function() {
          return getClientForMesh(2, 'username', 'password', 55001);
        })
        .then(function(client) {
          thisClientMesh2 = client;
          return getClientForMesh(3, 'username', 'password', 55001);
        })
        .then(function(client) {
          thisClientMesh3 = client;
          return testWebCall(thisClientMesh2, '/remoteComponent1/testJSONSticky', 55001);
        })
        .then(function(response) {
          pushResults(response);
          return testWebCall(thisClientMesh3, '/remoteComponent1/testJSONSticky', 55001);
        })
        .then(function(response) {
          pushResults(response);
          return new Promise((resolve, reject) => {
            internalInstance1.stop(e => {
              if (e) return reject(e);
              setTimeout(resolve, 3000);
            });
          });
        })
        .then(function() {
          return testWebCall(thisClientMesh2, '/remoteComponent1/testJSONSticky', 55001);
        })
        .then(function(response) {
          pushResults(response);
          return testWebCall(thisClientMesh3, '/remoteComponent1/testJSONSticky', 55001);
        })
        .then(function(response) {
          pushResults(response);
          expect(results).to.eql(
            // ran on different nodes
            [
              {
                statusCode: 200,
                statusMessage: 'OK',
                body: '{"ran_on":"MESH_2"}'
              },
              {
                statusCode: 200,
                statusMessage: 'OK',
                body: '{"ran_on":"MESH_3"}'
              },
              // failover to MESH_3, because MESH_2 went offline
              {
                statusCode: 200,
                statusMessage: 'OK',
                body: '{"ran_on":"MESH_3"}'
              },
              {
                statusCode: 200,
                statusMessage: 'OK',
                body: '{"ran_on":"MESH_3"}'
              }
            ]
          );
          done();
        })
        .catch(function(e) {
          done(e);
        });
    });
  });
});
