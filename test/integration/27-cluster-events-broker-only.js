const HappnerCluster = require('../..');
const libDir = require('../_lib/lib-dir');
const baseConfig = require('../_lib/base-config');
const stopCluster = require('../_lib/stop-cluster');
const users = require('../_lib/users');
const testclient = require('../_lib/client');
const getSeq = require('../_lib/helpers/getSeq');

const clearMongoCollection = require('../_lib/clear-mongo-collection');
const test = require('../_lib/test-helper');

//var log = require('why-is-node-running');
describe(test.testName(__filename, 3), function() {
  this.timeout(40000);
  let servers = [],
    localInstance,
    edgeInstance;

  beforeEach('clear mongo collection', function(done) {
    stopCluster(servers, function(e) {
      if (e) return done(e);
      servers = [];
      clearMongoCollection('mongodb://localhost', 'happn-cluster', function() {
        done();
      });
    });
  });

  after('stop cluster', function(done) {
    if (!servers) return done();
    stopCluster(servers, function() {
      clearMongoCollection('mongodb://localhost', 'happn-cluster', function() {
        done();
      });
    });
  });

  it('internal first, connects a client to the local instance, and is able to access the remote component events via the broker, inter-cluster events on', async () => {
    await startClusterInternalFirst(false, false);
    await test.delay(4000);
    await users.allowMethod(localInstance, 'username', 'brokerComponent', 'getReceivedEvents');
    await users.allowMethod(localInstance, 'username', 'remoteComponent', 'postEvent');
    await users.allowMethod(localInstance, 'username', 'localComponent', 'postEvent');
    await users.allowMethod(localInstance, 'username', 'localComponent', 'getReceivedEvents');
    await users.allowMethod(localInstance, 'username', 'remoteComponent', 'getReceivedEvents');
    await users.allowEvent(localInstance, 'username', 'remoteComponent', '/remote/event');
    const client = await testclient.create('username', 'password', getSeq.getPort(2));
    const receivedEvents = [];
    await client.event.remoteComponent.on('/remote/event', function(data) {
      receivedEvents.push(data);
    });
    await client.exchange.remoteComponent.postEvent();
    await client.exchange.localComponent.postEvent();
    await test.delay(4000);
    test.expect(receivedEvents.length).to.be(1);
    const localComponentReceivedEvents = await client.exchange.localComponent.getReceivedEvents();
    const remoteComponentReceivedEvents = await client.exchange.remoteComponent.getReceivedEvents();
    const brokerComponentReceivedEvents = await client.exchange.brokerComponent.getReceivedEvents();
    test.expect(localComponentReceivedEvents.length).to.be(1);
    test.expect(remoteComponentReceivedEvents.length).to.be(1);
    test.expect(brokerComponentReceivedEvents.length).to.be(2);
  });

  it('internal first, connects a client to the local instance, and is able to access the remote component events via the broker, inter-cluster events off', async () => {
    await startClusterInternalFirst(false, true);
    await test.delay(4000);
    await users.allowMethod(localInstance, 'username', 'brokerComponent', 'getReceivedEvents');
    await users.allowMethod(localInstance, 'username', 'remoteComponent', 'postEvent');
    await users.allowMethod(localInstance, 'username', 'localComponent', 'postEvent');
    await users.allowMethod(localInstance, 'username', 'localComponent', 'getReceivedEvents');
    await users.allowMethod(localInstance, 'username', 'remoteComponent', 'getReceivedEvents');
    await users.allowEvent(localInstance, 'username', 'remoteComponent', '/remote/event');
    const client = await testclient.create('username', 'password', getSeq.getPort(2));
    const receivedEvents = [];
    await client.event.remoteComponent.on('/remote/event', function(data) {
      receivedEvents.push(data);
    });
    await client.exchange.remoteComponent.postEvent();
    await client.exchange.localComponent.postEvent();
    await test.delay(4000);
    test.expect(receivedEvents.length).to.be(1);
    const localComponentReceivedEvents = await client.exchange.localComponent.getReceivedEvents();
    const remoteComponentReceivedEvents = await client.exchange.remoteComponent.getReceivedEvents();
    const brokerComponentReceivedEvents = await client.exchange.brokerComponent.getReceivedEvents();
    test.expect(localComponentReceivedEvents.length).to.be(1);
    test.expect(remoteComponentReceivedEvents.length).to.be(0);
    test.expect(brokerComponentReceivedEvents.length).to.be(2);

    // check to see that permissions propagation still works
    // we revoke permission to localComponent.postEvent - using the edge instance
    // we ensure that the revocation makes its way to the internal cluster member

    const internalClient = await testclient.create('username', 'password', getSeq.getPort(1));
    //this should work for now...
    await internalClient.exchange.remoteComponent.postEvent();
    // now deny the method on the edge instance
    await users.denyMethod(edgeInstance, 'username', 'remoteComponent', 'postEvent');
    await test.delay(4000);
    let errorMessage;
    try {
      // this should fail
      await internalClient.exchange.remoteComponent.postEvent();
    } catch (e) {
      errorMessage = e.message;
    }
    test.expect(errorMessage).to.be('unauthorized');
  });

  it('edge first, connects a client to the local instance, and is able to access the remote component events via the broker, inter-cluster events on', async () => {
    await startClusterEdgeFirst(false, false);
    await test.delay(4000);
    await users.allowMethod(localInstance, 'username', 'brokerComponent', 'getReceivedEvents');
    await users.allowMethod(localInstance, 'username', 'remoteComponent', 'postEvent');
    await users.allowMethod(localInstance, 'username', 'localComponent', 'postEvent');
    await users.allowMethod(localInstance, 'username', 'localComponent', 'getReceivedEvents');
    await users.allowMethod(localInstance, 'username', 'remoteComponent', 'getReceivedEvents');
    await users.allowEvent(localInstance, 'username', 'remoteComponent', '/remote/event');
    const client = await testclient.create('username', 'password', getSeq.getPort(1));
    const receivedEvents = [];
    await client.event.remoteComponent.on('/remote/event', function(data) {
      receivedEvents.push(data);
    });
    await client.exchange.remoteComponent.postEvent();
    await client.exchange.localComponent.postEvent();
    await test.delay(4000);
    test.expect(receivedEvents.length).to.be(1);
    const localComponentReceivedEvents = await client.exchange.localComponent.getReceivedEvents();
    const remoteComponentReceivedEvents = await client.exchange.remoteComponent.getReceivedEvents();
    const brokerComponentReceivedEvents = await client.exchange.brokerComponent.getReceivedEvents();
    test.expect(localComponentReceivedEvents.length).to.be(1);
    test.expect(remoteComponentReceivedEvents.length).to.be(1);
    test.expect(brokerComponentReceivedEvents.length).to.be(2);
  });

  it('edge first, connects a client to the local instance, and is able to access the remote component events via the broker, inter-cluster events off', async () => {
    await startClusterEdgeFirst(false, true);
    await test.delay(4000);
    await users.allowMethod(localInstance, 'username', 'brokerComponent', 'getReceivedEvents');
    await users.allowMethod(localInstance, 'username', 'remoteComponent', 'postEvent');
    await users.allowMethod(localInstance, 'username', 'localComponent', 'postEvent');
    await users.allowMethod(localInstance, 'username', 'localComponent', 'getReceivedEvents');
    await users.allowMethod(localInstance, 'username', 'remoteComponent', 'getReceivedEvents');
    await users.allowEvent(localInstance, 'username', 'remoteComponent', '/remote/event');
    const client = await testclient.create('username', 'password', getSeq.getPort(1));
    const receivedEvents = [];
    await client.event.remoteComponent.on('/remote/event', function(data) {
      receivedEvents.push(data);
    });
    await client.exchange.remoteComponent.postEvent();
    await client.exchange.localComponent.postEvent();
    await test.delay(4000);
    test.expect(receivedEvents.length).to.be(1);
    const localComponentReceivedEvents = await client.exchange.localComponent.getReceivedEvents();
    const remoteComponentReceivedEvents = await client.exchange.remoteComponent.getReceivedEvents();
    const brokerComponentReceivedEvents = await client.exchange.brokerComponent.getReceivedEvents();
    test.expect(localComponentReceivedEvents.length).to.be(1);
    test.expect(remoteComponentReceivedEvents.length).to.be(0);
    test.expect(brokerComponentReceivedEvents.length).to.be(2);
  });

  function localInstanceConfig(seq, sync, suppressInterClusterEvents = false) {
    const replicate = suppressInterClusterEvents ? false : null;
    const config = baseConfig(seq, sync, true, null, null, null, null, replicate);
    config.modules = {
      localComponent: {
        path: libDir + 'integration-27-local-component'
      },
      brokerComponent: {
        path: libDir + 'integration-27-broker-component'
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

  function remoteInstanceConfig(seq, sync, suppressInterClusterEvents = false) {
    const replicate = suppressInterClusterEvents ? false : null;
    const config = baseConfig(seq, sync, true, null, null, null, null, replicate);
    config.modules = {
      remoteComponent: {
        path: libDir + 'integration-27-remote-component'
      }
    };
    config.components = {
      remoteComponent: {
        startMethod: 'start',
        stopMethod: 'stop'
      }
    };
    return config;
  }

  function startInternal(id, clusterMin, suppressInterClusterEvents) {
    return HappnerCluster.create(remoteInstanceConfig(id, clusterMin, suppressInterClusterEvents));
  }

  function startEdge(id, clusterMin, suppressInterClusterEvents) {
    return HappnerCluster.create(localInstanceConfig(id, clusterMin, suppressInterClusterEvents));
  }

  function startClusterInternalFirst(
    suppressInterClusterEventsLocal,
    suppressInterClusterEventsRemote
  ) {
    return new Promise(function(resolve, reject) {
      startInternal(getSeq.getFirst(), 1, suppressInterClusterEventsRemote)
        .then(function(server) {
          servers.push(server);
          localInstance = server;
          return startEdge(getSeq.getNext(), 2, suppressInterClusterEventsLocal);
        })
        .then(function(server) {
          servers.push(server);
          edgeInstance = server;
          return users.add(localInstance, 'username', 'password');
        })
        .then(resolve)
        .catch(reject);
    });
  }

  // eslint-disable-next-line no-unused-vars
  function startClusterEdgeFirst(
    suppressInterClusterEventsLocal,
    suppressInterClusterEventsRemote
  ) {
    return new Promise(function(resolve, reject) {
      startEdge(getSeq.getFirst(), 1, suppressInterClusterEventsLocal)
        .then(function(server) {
          servers.push(server);
          edgeInstance = server;
          return startInternal(getSeq.getNext(), 2, suppressInterClusterEventsRemote);
        })
        .then(function(server) {
          servers.push(server);
          localInstance = server;
          return users.add(localInstance, 'username', 'password');
        })
        .then(resolve)
        .catch(reject);
    });
  }
});
