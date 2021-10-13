const HappnerCluster = require('../..');
const test = require('../_lib/test-helper');
const libDir = require('../_lib/lib-dir').concat(
  'integration-28-cluster-broker-wildcard-version' + test.path.sep
);
const baseConfig = require('../_lib/base-config');
const stopCluster = require('../_lib/stop-cluster');
const users = require('../_lib/users');
const testclient = require('../_lib/client');
const getSeq = require('../_lib/helpers/getSeq');
const clearMongoCollection = require('../_lib/clear-mongo-collection');

//var log = require('why-is-node-running');
describe(test.testName(__filename, 3), function() {
  const servers = [];
  let localInstance;
  this.timeout(20000);

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
    this.timeout(20000);
    stopCluster(servers, function() {
      clearMongoCollection('mongodb://localhost', 'happn-cluster', function() {
        done();
      });
    });
  });

  it('starts up the edge cluster node first, with * version and forward declared methods, we start the internal node and ensure the extra api methods have been extended', async () => {
    await startClusterEdgeFirst();
    await users.allowMethod(localInstance, 'username', 'brokerComponent', 'directMethod');
    await users.allowMethod(localInstance, 'username', 'remoteComponent', 'brokeredMethod1');
    await users.allowMethod(localInstance, 'username', 'remoteComponent1', 'declaredMethod');
    await users.allowMethod(localInstance, 'username', 'remoteComponent1', 'undeclaredMethod');
    await test.delay(5000);
    const client = await testclient.create('username', 'password', getSeq.getPort(1));
    let result = await client.exchange.brokerComponent.directMethod();
    test.expect(result).to.be(getSeq.getMeshName(1) + ':brokerComponent:directMethod');
    result = await client.exchange.remoteComponent.brokeredMethod1();
    test.expect(result).to.be(getSeq.getMeshName(2) + ':remoteComponent:brokeredMethod1');
    result = await client.exchange.remoteComponent1.declaredMethod();
    test.expect(result).to.be(getSeq.getMeshName(2) + ':remoteComponent1:declaredMethod');
    result = await client.exchange.remoteComponent1.undeclaredMethod();
    test.expect(result).to.be(getSeq.getMeshName(2) + ':remoteComponent1:undeclaredMethod');
    await test.delay(2000);
  });

  it('starts up the internal cluster node first, with * version and forward declared methods, we start the edge node and ensure the extra api methods have been extended', async () => {
    await startClusterInternalFirst();
    await users.allowMethod(localInstance, 'username', 'brokerComponent', 'directMethod');
    await users.allowMethod(localInstance, 'username', 'remoteComponent', 'brokeredMethod1');
    await users.allowMethod(localInstance, 'username', 'remoteComponent1', 'declaredMethod');
    await users.allowMethod(localInstance, 'username', 'remoteComponent1', 'undeclaredMethod');
    await test.delay(5000);
    const client = await testclient.create('username', 'password', getSeq.getPort(2));
    let result = await client.exchange.brokerComponent.directMethod();
    test.expect(result).to.be(getSeq.getMeshName(2) + ':brokerComponent:directMethod');
    result = await client.exchange.remoteComponent.brokeredMethod1();
    test.expect(result).to.be(getSeq.getMeshName(1) + ':remoteComponent:brokeredMethod1');
    result = await client.exchange.remoteComponent1.declaredMethod();
    test.expect(result).to.be(getSeq.getMeshName(1) + ':remoteComponent1:declaredMethod');
    result = await client.exchange.remoteComponent1.undeclaredMethod();
    test.expect(result).to.be(getSeq.getMeshName(1) + ':remoteComponent1:undeclaredMethod');
    await test.delay(2000);
  });

  function localInstanceConfig(seq, sync, dynamic) {
    var config = baseConfig(seq, sync, true);
    config.authorityDelegationOn = true;
    let brokerComponentPath = dynamic
      ? libDir + 'broker-component-dynamic'
      : libDir + 'broker-component';
    config.modules = {
      localComponent: {
        path: libDir + 'local-component'
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
        path: libDir + 'remote-component'
      },
      remoteComponent1: {
        path: libDir + 'remote-component-1'
      }
    };
    config.components = {
      remoteComponent: {
        startMethod: 'start',
        stopMethod: 'stop'
      },
      remoteComponent1: {
        startMethod: 'start',
        stopMethod: 'stop'
      }
    };
    return config;
  }

  async function startInternal(id, clusterMin) {
    const server = await HappnerCluster.create(remoteInstanceConfig(id, clusterMin));
    servers.push(server);
    return server;
  }

  async function startEdge(id, clusterMin, dynamic) {
    const server = await HappnerCluster.create(localInstanceConfig(id, clusterMin, dynamic));
    servers.push(server);
    return server;
  }

  function startClusterEdgeFirst(dynamic) {
    return new Promise(function(resolve, reject) {
      startEdge(getSeq.getFirst(), 1, dynamic)
        .then(function() {
          return startInternal(getSeq.getNext(), 2);
        })
        .then(function(server) {
          localInstance = server;
          return users.add(localInstance, 'username', 'password');
        })
        .then(resolve)
        .catch(reject);
    });
  }

  function startClusterInternalFirst(replicate) {
    return new Promise(function(resolve, reject) {
      startInternal(getSeq.getFirst(), 1, replicate)
        .then(function(server) {
          servers.push(server);
          localInstance = server;
          return startEdge(getSeq.getNext(), 2, replicate);
        })
        .then(function(server) {
          servers.push(server);
          return users.add(localInstance, 'username', 'password');
        })
        .then(resolve)
        .catch(reject);
    });
  }
});
