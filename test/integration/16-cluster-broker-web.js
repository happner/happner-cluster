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
describe(require('../_lib/test-helper').testName(__filename, 3), function () {

  this.timeout(40000);

  var servers = [];

  function localInstanceConfig(seq, sync, dynamic) {
    var config = baseConfig(seq, sync, true);
    let brokerComponentPath = dynamic?libDir + 'integration-10-broker-component-dynamic':libDir + 'integration-09-broker-component';
    config.cluster = config.cluster || {};
    config.cluster.dependenciesSatisfiedDeferListen = true;
    config.modules = {
      'localComponent': {
        path: libDir + 'integration-09-local-component'
      },
      'brokerComponent': {
        path: brokerComponentPath
      }
    };
    config.components = {
      'localComponent': {
        startMethod: 'start',
        stopMethod: 'stop'
      },
      'brokerComponent': {
        startMethod: 'start',
        stopMethod: 'stop'
      }
    };
    return config;
  }

  function remoteInstanceConfig(seq, sync) {
    var config = baseConfig(seq, sync, true);
    config.modules = {
      'remoteComponent': {
        path: libDir + 'integration-09-remote-component'
      },
      'remoteComponent1': {
        path: libDir + 'integration-09-remote-component-1'
      }
    };
    config.components = {
      'remoteComponent': {
        startMethod: 'start',
        stopMethod: 'stop'
      },
      'remoteComponent1': {
        startMethod: 'start',
        stopMethod: 'stop',
        web: {
          routes: {
            "testJSON": ["testJSON"]
          }
        }
      }
    };
    return config;
  }

  beforeEach('clear mongo collection', function(done) {
    stopCluster(servers, function(e){
      if (e) return done(e);
      servers = [];
      clearMongoCollection('mongodb://localhost', 'happn-cluster', function(){
        done();
      });
    });
  });

  afterEach('stop cluster', function(done) {
    if (!servers) return done();
    stopCluster(servers, function(){
      clearMongoCollection('mongodb://localhost', 'happn-cluster', function(){
        done();
      });
    });
  });

  function startInternal(id, clusterMin){
    return new Promise((resolve, reject) => {
      return HappnerCluster.create(remoteInstanceConfig(id, clusterMin))
        .then(function(instance){
          servers.push(instance);
          resolve(instance);
        })
        .catch(reject);
    });
  }

  function startEdge(id, clusterMin, dynamic){
    return new Promise((resolve, reject) => {
      return HappnerCluster.create(localInstanceConfig(id, clusterMin, dynamic))
        .then(function(instance){
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

    request(options, function (error, response, body) {
      callback(error, {response, body});
    });
  }

  function testWebCall(client, path, port){
    return new Promise((resolve) => {
      doRequest(path, client.token, port, function(e, response){
        if (e) return resolve({error:e});
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
        return new Promise((resolve) => {
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
        expect(JSON.parse(result.body)).to.eql({test:'data'});
        return testclient.create('username', 'password', 55002);
      })
      .then(function(client) {
        thisClient = client;
        //first test our broker components methods are directly callable
        return testWebCall(thisClient, '/remoteComponent1/testJSON', 55002);
      })
      .then(function(result) {
        expect(JSON.parse(result.body)).to.eql({test:'data'});
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
        return new Promise((resolve) => {
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
        expect(JSON.parse(result.body)).to.eql({test:'data'});
        return testclient.create('username', 'password', 55001);
      })
      .then(function(client) {
        thisClient = client;
        //first test our broker components methods are directly callable
        return testWebCall(thisClient, '/remoteComponent1/testJSON', 55001);
      })
      .then(function(result) {
        expect(JSON.parse(result.body)).to.eql({test:'data'});
        setTimeout(done, 2000);
      })
      .catch(done);
    });

    xit('starts the cluster broker, we ensure calls to the brokered web paths fail, then start the brokered component and ensure calls to the brokered web methods work', function(done) {

      var thisClient;
      var edgeInstance;

      startEdge(1, 1)
      .then(function(instance) {
        edgeInstance = instance;
        return users.add(edgeInstance, 'username', 'password');
      })
      .then(function() {
        return users.allowWebMethod(edgeInstance, 'username', '/remoteComponent1/testJSON');
      })
      .then(function() {
        return testclient.create('username', 'password', 55001);
      })
      .then(function(client) {
        thisClient = client;
        //first test our broker components methods are directly callable
        return testWebCall(thisClient, '/test/resource.json');
      })
      .then(function(result) {
        expect(result.error).to.be('404 error: ');
        return startInternal(2, 2);
      })
      .then(function() {
        return new Promise((resolve) => {
          setTimeout(resolve, 5000);
        });
      })
      .then(function() {
        return testWebCall(thisClient, '/test/resource.json');
      })
      .then(function(result) {
        expect(result.data).to.eql({test:'data'});
        setTimeout(done, 2000);
      })
      .catch(done);
    });
  });
});
