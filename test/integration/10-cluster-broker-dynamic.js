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

  this.timeout(20000);

  var servers = [],
    localInstance;

  function localInstanceConfig(seq, sync, dynamic) {
    var config = baseConfig(seq, sync, true);
    config.authorityDelegationOn = true;
    let brokerComponentPath = dynamic?libDir + 'integration-10-broker-component-dynamic':libDir + 'integration-09-broker-component';
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

  function errorInstanceConfigDuplicateBrokered(seq, sync) {
    var config = baseConfig(seq, sync, true);
    config.modules = {
      'localComponent': {
        path: libDir + 'integration-09-local-component'
      },
      'brokerComponent': {
        path: libDir + 'integration-09-broker-component'
      },
      'brokerComponentDuplicate': {
        path: libDir + 'integration-09-broker-component-1'
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
      },
      'brokerComponentDuplicate': {
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
        stopMethod: 'stop'
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

  function startInternal(id, clusterMin){
    return HappnerCluster.create(remoteInstanceConfig(id, clusterMin));
  }

  function startEdge(id, clusterMin, dynamic){
    return HappnerCluster.create(localInstanceConfig(id, clusterMin, dynamic));
  }

  function startClusterInternalFirst(dynamic){

    return new Promise(function(resolve, reject){

      startInternal(1, 1)
      .then(function(server){
        servers.push(server);
        localInstance = server;
        return startEdge(2, 2, dynamic);
      })
      .then(function(server){
        servers.push(server);
        return users.add(localInstance, 'username', 'password');
      })
      .then(function(){
        setTimeout(resolve, 2000);
      })
      .catch(reject);
    });
  }

  function startClusterEdgeFirst(dynamic){

    return new Promise(function(resolve, reject){
      startEdge(1,1,dynamic)
      .then(function(server){
        servers.push(server);
        return startInternal(2, 2);
      })
      .then(function(server){
        servers.push(server);
        localInstance = server;
        return users.add(localInstance, 'username', 'password');
      })
      .then(resolve)
      .catch(reject);
    });
  }

  after('stop cluster', function(done) {
    if (!servers) return done();
    stopCluster(servers, function(){
      clearMongoCollection('mongodb://localhost', 'happn-cluster', function(){
        done();
      });
    });
  });

  context('exchange', function() {

    it('starts the cluster internal first, connects a client to the local instance, and is able to access the remote component via the broker', function(done) {

      var thisClient;

      startClusterInternalFirst(false)
      .then(function(){
        return users.allowMethod(localInstance, 'username', 'brokerComponent', 'directMethod');
      })
      .then(function() {
        return users.allowMethod(localInstance, 'username', 'remoteComponent', 'brokeredMethod1');
      })
      .then(function() {
        return users.allowMethod(localInstance, 'username', 'remoteComponent1', 'brokeredMethod1');
      })
      .then(function() {
        console.log('pausing for client...');
        return new Promise((resolve) => {
          setTimeout(resolve, 10000);
        });
      })
      .then(function() {
        return testclient.create('username', 'password', 55002);
      })
      .then(function(client) {
        thisClient = client;
        //first test our broker components methods are directly callable
        return thisClient.exchange.brokerComponent.directMethod();
      })
      .then(function(result) {
        expect(result).to.be('MESH_2:brokerComponent:directMethod');
        return thisClient.exchange.remoteComponent1.brokeredMethod1();
      })
      .then(function(result) {
        expect(result).to.be('MESH_1:remoteComponent1:brokeredMethod1');
        return thisClient.exchange.remoteComponent.brokeredMethod1();
      })
      .then(function(result) {
        expect(result).to.be('MESH_1:remoteComponent:brokeredMethod1');

        setTimeout(done, 2000);
      })
      .catch(done);
    });

    function testRestCall(token, port, component, method, params, expectedResponse){
      return new Promise((resolve, reject) => {
        var restClient = require('restler');

        var operation = {
          parameters: params || {}
        };

        var options = {headers:{}};
        options.headers.authorization = 'Bearer ' + token;

        restClient.postJson(`http://localhost:${port}/rest/method/${component}/${method}`, operation, options)
          .on('complete', function (result) {
            if (result.error) return reject(new Error(result.error));
            expect(result.data).to.eql(expectedResponse);
            resolve();
        });
      });
    }

    it('starts the cluster internal first, connects a client to the local instance, and is able to access the remote component via the broker, check we cannot access denied methods', function(done) {

      var thisClient;

      var gotToFinalAttempt = false;

      startClusterInternalFirst()
      .then(function(){
        return users.allowMethod(localInstance, 'username', 'brokerComponent', 'directMethod');
      })
      .then(function() {
        return users.allowMethod(localInstance, 'username', 'remoteComponent', 'brokeredMethod1');
      })
      .then(function() {
        return users.allowMethod(localInstance, 'username', 'remoteComponent1', 'brokeredMethod1');
      })
      .then(function() {
        return testclient.create('username', 'password', 55002);
      })
      .then(function(client) {
        thisClient = client;
        //first test our broker components methods are directly callable
        return thisClient.exchange.brokerComponent.directMethod();
      })
      .then(function(result) {
        expect(result).to.be('MESH_2:brokerComponent:directMethod');
        //call an injected method
        return thisClient.exchange.remoteComponent.brokeredMethod1();
      })
      .then(function(result) {
        expect(result).to.be('MESH_1:remoteComponent:brokeredMethod1');
        return thisClient.exchange.remoteComponent1.brokeredMethod1();
      })
      .then(function(result) {
        expect(result).to.be('MESH_1:remoteComponent1:brokeredMethod1');
        return testRestCall(thisClient.data.session.token, 55002, 'remoteComponent1', 'brokeredMethod1', null, 'MESH_1:remoteComponent1:brokeredMethod1');
      })
      .then(function() {
        return users.denyMethod(localInstance, 'username', 'remoteComponent', 'brokeredMethod1');
      })
      .then(function() {
        gotToFinalAttempt = true;
        return thisClient.exchange.remoteComponent.brokeredMethod1();
      })
      .catch(function(e){
        console.log(e.message);
        expect(gotToFinalAttempt).to.be(true);
        expect(e.toString()).to.be('AccessDenied: unauthorized');
        setTimeout(done, 2000);
      });
    });

    it('starts up the edge cluster node first, we than start the internal node (with brokered component), pause and then assert we are able to run the brokered method', function(done) {
      startClusterEdgeFirst()
      .then(function(){
        return users.allowMethod(localInstance, 'username', 'brokerComponent', 'directMethod');
      })
      .then(function() {
        return users.allowMethod(localInstance, 'username', 'remoteComponent', 'brokeredMethod1');
      })
      .then(function(){
        return new Promise(function(resolve){
          setTimeout(resolve, 5000);
        });
      })
      .then(function() {
        return testclient.create('username', 'password', 55001);
      })
      .then(function(client) {
        //first test our broker components methods are directly callable
        client.exchange.brokerComponent.directMethod(function(e, result) {

          expect(e).to.be(null);
          expect(result).to.be('MESH_1:brokerComponent:directMethod');
          //call an injected method
          client.exchange.remoteComponent.brokeredMethod1(function(e, result) {
            expect(e).to.be(null);
            expect(result).to.be('MESH_2:remoteComponent:brokeredMethod1');
            setTimeout(done, 2000);
          });
        });
      })
      .catch(done);
    });

    it ('starts up the edge cluster node first, we then start the internal node (with brokered component), pause and then assert we are able to run a brokered method with an argument', function(done) {
      startClusterEdgeFirst()
      .then(function(){
        return users.allowMethod(localInstance, 'username', 'brokerComponent', 'directMethod');
      })
      .then(function() {
        return users.allowMethod(localInstance, 'username', 'remoteComponent', 'brokeredMethod3');
      })
      .then(function(){
        return new Promise(function(resolve){
          setTimeout(resolve, 5000);
        });
      })
      .then(function() {
        return testclient.create('username', 'password', 55001);
      })
      .then(function(client) {
        client.exchange.remoteComponent.brokeredMethod3("test", function(e, result) {
          expect(e).to.be(null);
          expect(result).to.be('MESH_2:remoteComponent:brokeredMethod3:test');
          setTimeout(done, 2000);
        });
      })
      .catch(done);
    });

    it ('starts up the edge cluster node first, we then start the internal node (with brokered component), pause and then assert we are able to run a brokered method with an argument, with the correct origin', function(done) {
      startClusterEdgeFirst()
      .then(function(){
        return users.allowMethod(localInstance, 'username', 'brokerComponent', 'directMethod');
      })
      .then(function() {
        return users.allowMethod(localInstance, 'username', 'remoteComponent', 'brokeredMethod3');
      })
      .then(function() {
        return users.allowMethod(localInstance, 'username', 'remoteComponent1', 'brokeredMethod3');
      })
      .then(function(){
        return new Promise(function(resolve){
          setTimeout(resolve, 5000);
        });
      })
      .then(function() {
        return testclient.create('username', 'password', 55001);
      })
      .then(function(client) {
        client.exchange.remoteComponent1.brokeredMethod3("test", function(e, result) {
          expect(e).to.be(null);
          expect(result).to.be('MESH_2:remoteComponent1:brokeredMethod3:test:username');
          setTimeout(done, 2000);
        });
      })
      .catch(done);
    });

    it ('starts up the internal cluster node first, we then start the internal node (with brokered component), pause and then assert we are able to run a brokered method with an argument, with the correct origin', function(done) {
      startClusterInternalFirst()
      .then(function(){
        return users.allowMethod(localInstance, 'username', 'brokerComponent', 'directMethod');
      })
      .then(function() {
        return users.allowMethod(localInstance, 'username', 'remoteComponent', 'brokeredMethod3');
      })
      .then(function() {
        return users.allowMethod(localInstance, 'username', 'remoteComponent1', 'brokeredMethod3');
      })
      .then(function(){
        return new Promise(function(resolve){
          setTimeout(resolve, 5000);
        });
      })
      .then(function() {
        return testclient.create('username', 'password', 55001);
      })
      .then(function(client) {
        client.exchange.remoteComponent1.brokeredMethod3("test", function(e, result) {
          expect(e).to.be(null);
          expect(result).to.be('MESH_1:remoteComponent1:brokeredMethod3:test:username');
          setTimeout(done, 2000);
        });
      })
      .catch(done);
    });
  });

  context('events', function() {

    it('connects a client to the local instance, and is able to access the remote component events via the broker', function(done) {

        startClusterInternalFirst()
        .then(function(){
          return users.allowMethod(localInstance, 'username', 'brokerComponent', 'directMethod');
        })
        .then(function() {
          return users.allowMethod(localInstance, 'username', 'remoteComponent', 'brokeredEventEmitMethod');
        })
        .then(function() {
          return users.allowEvent(localInstance, 'username', 'remoteComponent', '/brokered/event');
        })
        .then(function() {
          return testclient.create('username', 'password', 55002);
        })
        .then(function(client) {
          //first test our broker components methods are directly callable
          client.exchange.brokerComponent.directMethod(function(e, result) {

            expect(e).to.be(null);
            expect(result).to.be('MESH_2:brokerComponent:directMethod');

            client.event.remoteComponent.on('/brokered/event', function(data) {
              expect(data).to.eql({"brokered":{"event":{"data":{"from":"MESH_1"}}}});
              setTimeout(done, 2000);
            }, function(e){
              expect(e).to.be(null);
              client.exchange.remoteComponent.brokeredEventEmitMethod(function(e, result) {
                expect(e).to.be(null);
                expect(result).to.be('MESH_1:remoteComponent:brokeredEventEmitMethod');
              });
            });
          });
        })
        .catch(done);
    });
  });

  context('errors', function() {

    it('ensures an error is raised if we are injecting internal components with duplicate names', function(done){
      HappnerCluster.create(errorInstanceConfigDuplicateBrokered(1, 1))
      .then(function(){
        done(new Error('unexpected success'));
      })
      .catch(function(e){
        expect(e.toString()).to.be('Error: Duplicate attempts to broker the remoteComponent component by brokerComponent & brokerComponentDuplicate');
        setTimeout(done, 2000);
      });
    });

    it('ensures an error is handled and returned accordingly if we execute an internal components failing method using a callback', function(done){

      startClusterInternalFirst()
      .then(function() {
        return users.allowMethod(localInstance, 'username', 'remoteComponent', 'brokeredMethodFail');
      })
      .then(function() {
        return testclient.create('username', 'password', 55002);
      })
      .then(function(client) {
        //first test our broker components methods are directly callable
        client.exchange.remoteComponent.brokeredMethodFail(function(e) {
          expect(e.toString()).to.be('Error: test error');
          setTimeout(done, 2000);
        });
      })
      .catch(done);
    });

    it('ensures an error is handled and returned accordingly if we execute an internal components failing method using a promise', function(done){

      startClusterInternalFirst()
      .then(function() {
        return users.allowMethod(localInstance, 'username', 'remoteComponent', 'brokeredMethodFail');
      })
      .then(function() {
        return testclient.create('username', 'password', 55002);
      })
      .then(function(client) {
        //first test our broker components methods are directly callable
        return client.exchange.remoteComponent.brokeredMethodFail();
      })
      .catch(function(e){
        expect(e.toString()).to.be('Error: test error');
        done();
      });
    });

    it('ensures an error is handled and returned accordingly if we execute an internal components method that times out', function(done){

      this.timeout(20000);

      startClusterInternalFirst()
      .then(function() {
        return users.allowMethod(localInstance, 'username', 'remoteComponent', 'brokeredMethodTimeout');
      })
      .then(function() {
        return testclient.create('username', 'password', 55002);
      })
      .then(function(client) {
        //first test our broker components methods are directly callable
        return client.exchange.remoteComponent.brokeredMethodTimeout();
      })
      .catch(function(e){
        expect(e.toString()).to.be('Request timed out');
        done();
      });
    });

    it('ensures an error is handled and returned accordingly if we execute a method that does not exist on the cluster mesh yet', function(done){

      startClusterEdgeFirst()
      .then(function(){
        return users.allowMethod(localInstance, 'username', 'brokerComponent', 'directMethod');
      })
      .then(function() {
        return users.allowMethod(localInstance, 'username', 'remoteComponent', 'brokeredMethod1');
      })
      .then(function() {
        return testclient.create('username', 'password', 55001);
      })
      .then(function(client) {
        return client.exchange.remoteComponent.brokeredMethod1();
      })
      .catch(function(e){
        expect(e.toString()).to.be('Error: Not implemented remoteComponent:^2.0.0:brokeredMethod1');
        setTimeout(done, 2000);
      });
    });
  });
});
