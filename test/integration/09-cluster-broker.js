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

describe('09 - integration - broker', function() {

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
      }
    };
    config.components = {
      'remoteComponent': {
        startMethod: 'start',
        stopMethod: 'stop'
      }
    };
    return config;
  }

  before('clear mongo collection', function(done) {
    clearMongoCollection('mongodb://localhost', 'happn-cluster', done);
  });

  before('start cluster', function(done) {
    this.timeout(20000);
    HappnerCluster.create(remoteInstance1Config(1, 1))
      .then(function(server) {
        servers.push(server);
        return HappnerCluster.create(localInstanceConfig(2, 2));
      })
      .then(function(server) {
        servers.push(server);
        localInstance = servers[1];
        //server, username, password, permissions
        users.add(localInstance, 'username', 'password').then(function() {
          done();
        }).catch(done);
      })
  });

  after('stop cluster', function(done) {
    if (!servers) return done();
    stopCluster(servers, done);
  });

  context('exchange', function() {

    it('connects a client to the local instance, and is able to access the remote component via the broker', function(done) {

      users.allowMethod(localInstance, 'username', 'brokerComponent', 'directMethod')
      .then(function() {
        return users.allowMethod(localInstance, 'username', 'remoteComponent', 'brokeredMethod1');
      })
      .then(function(){
        return testclient.create('username', 'password', 55002);
      })
      .then(function(client){
        //first test our broker components methods are directly callable
        client.exchange.brokerComponent.directMethod(function(e, result) {

          expect(e).to.be(null);
          expect(result).to.be('MESH_2:brokerComponent:directMethod');
          //call an injected method
          client.exchange.remoteComponent.brokeredMethod1(function(e, result) {
            expect(e).to.be(null);
            expect(result).to.be('MESH_1:remoteComponent:brokeredMethod1');
            done();
          });
        });
      })
      .catch(done);
    });

    xit('denies permissions to access the internal components methods and events for the user, connects a client to the local instance, and is unable to access the remote component via the broker', function(done) {

      users.denyMethod(localInstance, 'username', 'remoteComponent3', 'method1').then(function() {

        client.create('username', 'password', 55001)
          .then(function(client) {
            expect(client.exchange.remoteComponent3).to.be(undefined);
            done();
          })
          .catch(done);
      });
    });
  });

  context('events', function() {

  });
});
