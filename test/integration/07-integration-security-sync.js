var path = require('path');
var HappnerCluster = require('../..');
var Promise = require('bluebird');
var expect = require('expect.js');
var unique = require('array-unique');

var libDir = require('../_lib/lib-dir');
var baseConfig = require('../_lib/base-config');
var stopCluster = require('../_lib/stop-cluster');
var clearMongoCollection = require('../_lib/clear-mongo-collection');
var users = require('../_lib/users');
var client = require('../_lib/client');

describe('07 - integration - security sync', function () {

  var servers = [],
    client1, client2;

  function serverConfig(seq, minPeers) {
    var config = baseConfig(seq, minPeers, true);
    config.modules = {
      component1: {
        path: libDir + 'integration-07-component'
      }
    };
    config.components = {
      component1: {}
    };
    return config;
  }

  before('clear mongo collection', function (done) {
    clearMongoCollection('mongodb://localhost', 'happn-cluster', done);
  });

  before('start cluster', function (done) {
    this.timeout(8000);
    HappnerCluster.create(serverConfig(1, 1))
      .then(function (server) {
        servers.push(server);
        return HappnerCluster.create(serverConfig(2, 2))
      })
      .then(function (server) {
        servers.push(server);
        return users.add(servers[0], 'username', 'password');
      })
      .then(function () {
        done();
      })
      .catch(done);
  });

  before('start client1', function (done) {
    client1 = client.create('username', 'password', 55001, done);
  });

  before('start client2', function (done) {
    client2 = client.create('username', 'password', 55002, done);
  });

  after('stop client 1', function (done) {
    client1.disconnect(done);
  });

  after('stop client 2', function (done) {
    client2.disconnect(done);
  });

  after('stop cluster', function (done) {
    if (!servers) return done();
    stopCluster(servers, done);
  });

  it('handles security sync for methods', function (done) {
    this.timeout(10 * 1000);

    Promise.all([
        client.callMethod(1, client1, 'component1', 'method1'),
        client.callMethod(2, client1, 'component1', 'method2'),
        client.callMethod(3, client2, 'component1', 'method1'),
        client.callMethod(4, client2, 'component1', 'method2')
      ])

      .then(function (results) {
        expect(results).to.eql([
          { seq: 1, error: 'unauthorized' },
          { seq: 2, error: 'unauthorized' },
          { seq: 3, error: 'unauthorized' },
          { seq: 4, error: 'unauthorized' }
        ])
      })

      .then(function () {
        return Promise.all([
          users.allowMethod(servers[0], 'username', 'component1', 'method1')
        ])
      })

      .then(function () {
        // await sync
        return Promise.delay(2000);
      })

      .then(function () {
        return Promise.all([
          client.callMethod(1, client1, 'component1', 'method1'),
          client.callMethod(2, client1, 'component1', 'method2'),
          client.callMethod(3, client2, 'component1', 'method1'),
          client.callMethod(4, client2, 'component1', 'method2')
        ]);
      })

      .then(function (results) {
        expect(results).to.eql([
          { seq: 1, result: true },
          { seq: 2, error: 'unauthorized' },
          { seq: 3, result: true },
          { seq: 4, error: 'unauthorized' }
        ])
      })

      .then(function (results) {
        done();
      })
      .catch(done);

  });

});
