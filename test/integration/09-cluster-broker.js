var path = require('path');
var HappnerCluster = require('../..');
var Promise = require('bluebird');
var expect = require('expect.js');

var libDir = require('../_lib/lib-dir');
var baseConfig = require('../_lib/base-config');
var stopCluster = require('../_lib/stop-cluster');
var users = require('../_lib/users');
var testclient = require('../_lib/client');

var clearMongoCollection = require('../_lib/clear-mongo-collection');

describe.only('09 - integration - broker', function() {

  this.timeout(15000);

  var servers = [],
    localInstance;

  function localInstanceConfig(seq, sync) {
    var config = baseConfig(seq, sync, true);
    config.modules = {
      'localComponent': {
        path: libDir + 'integration-09-local-component'
      },
      'brokerComponent': {
        path: libDir + 'integration-09-broker-component'
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

  function remoteInstance1Config(seq, sync) {
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
    clearMongoCollection('mongodb://localhost', 'happn-cluster', done);
  });

  function startInternal(id, clusterMin){
    return HappnerCluster.create(remoteInstance1Config(id, clusterMin));
  }

  function startEdge(id, clusterMin){
    return HappnerCluster.create(localInstanceConfig(id, clusterMin));
  }

  function startClusterInternalFirst(){

    return new Promise(function(resolve, reject){
      stopCluster(servers, function(e){
        if (e) return reject(e);
        servers = [];
        startInternal(1,1)
        .then(function(server){
          servers.push(server);
          localInstance = server;
          return startEdge(2, 2);
        })
        .then(function(server){
          servers.push(server);
          return users.add(localInstance, 'username', 'password');
        })
        .then(resolve)
        .catch(reject);
      });
    });
  }

  function startClusterEdgeFirst(){

    return new Promise(function(resolve, reject){
      stopCluster(servers, function(e){
        if (e) return reject(e);
        servers = [];
        startEdge(1,1)
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
    });
  }

  // before('start cluster', function(done) {
  //   this.timeout(20000);
  //   HappnerCluster.create(remoteInstance1Config(1, 1))
  //     .then(function(server) {
  //       servers.push(server);
  //       return HappnerCluster.create(localInstanceConfig(2, 2));
  //     })
  //     .then(function(server) {
  //       servers.push(server);
  //       localInstance = servers[1];
  //       //server, username, password, permissions
  //       users.add(localInstance, 'username', 'password').then(function() {
  //         done();
  //       }).catch(done);
  //     })
  // });

  after('stop cluster', function(done) {
    if (!servers) return done();
    stopCluster(servers, done);
  });

  context('exchange', function() {

    it('starts the cluster internal first, connects a client to the local instance, and is able to access the remote component via the broker', function(done) {

      var thisClient;

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
        done();
      })
      .catch(done);
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
        console.log('pausing...');
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
            done();
          });
        });
      })
      .catch(done);
    });

    xit('denies permissions to access the internal components methods and events for the user, connects a client to the local instance, and is unable to access the remote component via the broker', function(done) {

    });

    xit('denies permissions to access to a data path that is used by the internal component, the brokered method returns an Access Denied method because preserveOrigin is in effect', function(done) {

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
              done();
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
});
