var HappnerCluster = require('../..');
var Promise = require('bluebird');
var expect = require('expect.js');
var unique = require('array-unique');

var libDir = require('../_lib/lib-dir');
var baseConfig = require('../_lib/base-config');
var stopCluster = require('../_lib/stop-cluster');
var getSeq = require('../_lib/helpers/getSeq');

describe(require('../_lib/test-helper').testName(__filename, 3), function() {
  this.timeout(20000);
  var servers, localInstance;

  function localInstanceConfig(seq) {
    var config = baseConfig(seq);
    config.modules = {
      localComponent1: {
        path: libDir + 'integration-03-local-component1'
      }
    };
    config.components = {
      localComponent1: {}
    };
    return config;
  }

  function remoteInstanceConfig(seq) {
    var config = baseConfig(seq);
    config.modules = {
      remoteComponent2: {
        path: libDir + 'integration-03-remote-component2'
      },
      remoteComponent3: {
        path: libDir + 'integration-03-remote-component3'
      }
    };
    config.components = {
      remoteComponent2: {},
      remoteComponent3: {}
    };
    return config;
  }

  beforeEach('start cluster', function(done) {
    this.timeout(20000);
    Promise.all([
      HappnerCluster.create(localInstanceConfig(getSeq.getFirst())),
      HappnerCluster.create(remoteInstanceConfig(getSeq.getNext())),
      HappnerCluster.create(remoteInstanceConfig(getSeq.getNext())),
      HappnerCluster.create(remoteInstanceConfig(getSeq.getLast()))
    ])
      .then(function(_servers) {
        servers = _servers;
        localInstance = servers[0];
        done();
      })
      .catch(done);
  });

  afterEach('stop cluster', function(done) {
    if (!servers) return done();
    stopCluster(servers, done);
  });

  it('removes implementation on peer departure', function(done) {
    this.timeout(4000);

    Promise.all([
      localInstance.exchange.localComponent1.callDependency('remoteComponent3', 'method1'),
      localInstance.exchange.localComponent1.callDependency('remoteComponent3', 'method1'),
      localInstance.exchange.localComponent1.callDependency('remoteComponent3', 'method1'),
      localInstance.exchange.localComponent1.callDependency('remoteComponent3', 'method1'),
      localInstance.exchange.localComponent1.callDependency('remoteComponent3', 'method1')
    ])
      .then(function(replies) {
        var list = unique(replies).sort();
        expect(list).to.eql([2, 3, 4].map(num => getSeq.getMeshName(num) + ':component3:method1'));
      })
      .then(function() {
        var server = servers.pop();
        return server.stop({ reconnect: false });
      })
      .then(function() {
        return Promise.delay(200); // time for peer departure to "arrive" at localInstance
      })
      .then(function() {
        return Promise.all([
          localInstance.exchange.localComponent1.callDependency('remoteComponent3', 'method1'),
          localInstance.exchange.localComponent1.callDependency('remoteComponent3', 'method1'),
          localInstance.exchange.localComponent1.callDependency('remoteComponent3', 'method1'),
          localInstance.exchange.localComponent1.callDependency('remoteComponent3', 'method1'),
          localInstance.exchange.localComponent1.callDependency('remoteComponent3', 'method1')
        ]);
      })
      .then(function(replies) {
        var list = unique(replies).sort();
        expect(list).to.eql([2, 3].map(num => getSeq.getMeshName(num) + ':component3:method1'));
        done();
      })
      .catch(done);
  });

  it('adds implementation on peer arrival', function(done) {
    this.timeout(10000);

    Promise.all([
      localInstance.exchange.localComponent1.callDependency('remoteComponent3', 'method1'),
      localInstance.exchange.localComponent1.callDependency('remoteComponent3', 'method1'),
      localInstance.exchange.localComponent1.callDependency('remoteComponent3', 'method1'),
      localInstance.exchange.localComponent1.callDependency('remoteComponent3', 'method1'),
      localInstance.exchange.localComponent1.callDependency('remoteComponent3', 'method1')
    ])
      .then(function(replies) {
        var list = unique(replies).sort();
        expect(list).to.eql(
          [2, 3, 4].map(num => getSeq.getMeshName(num) + ':component3:method1').sort()
        );
      })
      .then(function() {
        return HappnerCluster.create(remoteInstanceConfig(getSeq.getLast()));
      })
      .then(function(server) {
        servers.push(server);
      })
      .then(function() {
        return Promise.delay(3000); // time for peer arrival to "arrival" at localInstance
      })
      .then(function() {
        return Promise.all([
          localInstance.exchange.localComponent1.callDependency('remoteComponent3', 'method1'),
          localInstance.exchange.localComponent1.callDependency('remoteComponent3', 'method1'),
          localInstance.exchange.localComponent1.callDependency('remoteComponent3', 'method1'),
          localInstance.exchange.localComponent1.callDependency('remoteComponent3', 'method1'),
          localInstance.exchange.localComponent1.callDependency('remoteComponent3', 'method1'),
          localInstance.exchange.localComponent1.callDependency('remoteComponent3', 'method1'),
          localInstance.exchange.localComponent1.callDependency('remoteComponent3', 'method1')
        ]);
      })
      .then(function(replies) {
        var list = unique(replies).sort();
        expect(list).to.eql(
          [2, 3, 4, 5].map(num => getSeq.getMeshName(num) + ':component3:method1').sort()
        );
        done();
      })
      .catch(done);
  });
});
