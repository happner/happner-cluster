const HappnerCluster = require('../..');
const baseConfig = require('../_lib/base-config');
const stopCluster = require('../_lib/stop-cluster');
const clearMongoCollection = require('../_lib/clear-mongo-collection');
const users = require('../_lib/user-permissions');
const client = require('../_lib/client');
const test = require('../_lib/test-helper');
const wait = require('await-delay');
const getSeq = require('../_lib/helpers/getSeq');

module.exports = SecuredComponent;
function SecuredComponent() {}

SecuredComponent.prototype.method1 = function($happn, options, callback) {
  options.methodName = 'method1';
  callback(null, options);
};

SecuredComponent.prototype.method2 = function($happn, options, callback) {
  options.methodName = 'method2';
  callback(null, options);
};

SecuredComponent.prototype.method3 = function($happn, options, callback) {
  options.methodName = 'method3';
  callback(null, options);
};

SecuredComponent.prototype.fireEvent = function($happn, eventName, callback) {
  $happn.emit(eventName, eventName);
  callback(null, eventName + ' emitted');
};

describe(test.testName(__filename, 3), function() {
  this.timeout(20000);

  let servers, client1, client2, remoteServer;

  function serverConfig(seq, minPeers) {
    var config = baseConfig(seq, minPeers, true);
    config.happn.allowNestedPermissions = true;
    config.adminPassword = 'test';
    config.modules = {
      SecuredComponent: {
        path: __filename
      }
    };
    config.components = {
      SecuredComponent: {
        moduleName: 'SecuredComponent',
        schema: {
          exclusive: false,
          methods: {}
        }
      }
    };
    config.happn.services.replicator = {
      config: {
        securityChangesetReplicateInterval: 10 // 100 per second
      }
    };
    return config;
  }

  before('clear mongo collection', function(done) {
    clearMongoCollection('mongodb://localhost', 'happn-cluster', done);
  });

  before('start cluster', async () => {
    servers = [];
    servers.push(await HappnerCluster.create(serverConfig(getSeq.getFirst(), 1)));
    servers.push(await HappnerCluster.create(serverConfig(getSeq.getNext(), 2)));
    remoteServer = servers[0];
    for (let user of Object.keys(permissions)) {
      await users.add(servers[0], user, 'password', permissions[user]);
    }
    await test.delay(5000);
  });

  after('stop clients', async () => {
    if (client1) await client1.disconnect();
    if (client2) await client2.disconnect();
  });

  after('stop cluster', function(done) {
    if (!servers) return done();
    stopCluster(servers, done);
  });

  it("we add a test user that has permissions to access some of the ProtectedComponent events, subscribe on a nested-path ('**'), we test that this works", async () => {
    let listenerClient = await client.create('test1User', 'password', getSeq.getPort(2));
    let receivedEvents = [];

    await listenerClient.event.SecuredComponent.on('**', message => {
      receivedEvents.push(message.value);
    });

    for (let eventName of ['event-1a', 'event-2a', 'event-3a']) {
      await remoteServer.exchange.SecuredComponent.fireEvent(eventName);
    }

    await wait(1000);
    test.expect(receivedEvents).to.eql(['event-2a', 'event-3a']);
    await client.destroy(listenerClient);
  });

  it('we add a test user that has permissions to access some of the ProtectedComponent events, including events  on sub/paths, subscribe on **, we test that this works', async () => {
    let listenerClient = await client.create('test2User', 'password', getSeq.getPort(2));
    let receivedEvents = [];
    await listenerClient.event.SecuredComponent.on('**', message => {
      receivedEvents.push(message.value);
    });

    for (let eventName of [
      'event-1b',
      'event-2b',
      'event-3b',
      'sub-path/sub-event-1b',
      'sub-path/sub-event-2b'
    ]) {
      await remoteServer.exchange.SecuredComponent.fireEvent(eventName);
    }
    await wait(1000);
    test.expect(receivedEvents).to.eql(['event-2b', 'event-3b', 'sub-path/sub-event-2b']);
    await client.destroy(listenerClient);
  });

  it('we add a test user that has permissions to access some of the ProtectedComponent events, including a permission on sub-path/* we test that this works', async () => {
    let listenerClient = await client.create('test3User', 'password', getSeq.getPort(2));
    let receivedEvents = [];
    await listenerClient.event.SecuredComponent.on('**', message => {
      receivedEvents.push(message.value);
    });

    for (let eventName of [
      'event-1d',
      'event-2d',
      'event-3d',
      'sub-path/sub-event-1d',
      'sub-path/sub-event-2d'
    ]) {
      await remoteServer.exchange.SecuredComponent.fireEvent(eventName);
    }
    await wait(1000);
    test
      .expect(receivedEvents)
      .to.eql(['event-2d', 'event-3d', 'sub-path/sub-event-1d', 'sub-path/sub-event-2d']);
    await client.destroy(listenerClient);
  });

  it("subscription on '**' will be unauthorized if we have no permissions to any subpaths", async () => {
    let listenerClient = await client.create('test4User', 'password', getSeq.getPort(2));
    let receivedEvents = [];
    let errorCaught = false;
    try {
      await listenerClient.event.SecuredComponent.on('**', message => {
        receivedEvents.push(message.value);
      });
    } catch (e) {
      test.expect(e.toString()).to.eql('AccessDenied: unauthorized');
      errorCaught = true;
    } finally {
      await client.destroy(listenerClient);
      test.expect(errorCaught).to.be(true);
    }
  });

  it("adding and then removing permissions with subscription on '**'", async () => {
    let listenerClient = await client.create('test5User', 'password', getSeq.getPort(2));
    let receivedEvents = [];

    await listenerClient.event.SecuredComponent.on('**', message => {
      receivedEvents.push(message.value);
    });
    for (let eventName of [
      'event-1c',
      'event-2c',
      'event-3c',
      'sub-path/sub-event-1c',
      'sub-path/sub-event-2c'
    ]) {
      await remoteServer.exchange.SecuredComponent.fireEvent(eventName);
    }
    await wait(1000);
    test.expect(receivedEvents).to.eql([]);
    await remoteServer.exchange.security.addUserPermissions('test5User', {
      events: {
        '/DOMAIN_NAME/SecuredComponent/event-2c': {
          authorized: true
        },
        '/DOMAIN_NAME/SecuredComponent/sub-path/sub-event-2c': {
          authorized: true
        }
      }
    });
    await wait(1000);
    for (let eventName of [
      'event-1c',
      'event-2c',
      'event-3c',
      'sub-path/sub-event-1c',
      'sub-path/sub-event-2c'
    ]) {
      await remoteServer.exchange.SecuredComponent.fireEvent(eventName);
    }
    await wait(1000);
    test.expect(receivedEvents).to.eql(['event-2c', 'sub-path/sub-event-2c']);
    await remoteServer.exchange.security.removeUserPermissions('test5User', {
      events: {
        '/DOMAIN_NAME/SecuredComponent/event-2c': {},
        '/DOMAIN_NAME/SecuredComponent/sub-path/sub-event-2c': {}
      }
    });
    receivedEvents = [];
    await wait(1000);
    for (let eventName of [
      'event-1c',
      'event-2c',
      'event-3c',
      'sub-path/sub-event-1c',
      'sub-path/sub-event-2c'
    ]) {
      await remoteServer.exchange.SecuredComponent.fireEvent(eventName);
    }
    await wait(1000);
    test.expect(receivedEvents).to.eql([]);
    await client.destroy(listenerClient);
  });

  it("Removing then adding permissions with subscription on '**'", async () => {
    let listenerClient = await client.create('test6User', 'password', getSeq.getPort(2));
    let receivedEvents = [];

    await listenerClient.event.SecuredComponent.on('**', message => {
      receivedEvents.push(message.value);
    });
    let testEvents = [
      'event-1e',
      'event-2e',
      'event-3e',
      'sub-path/sub-event-1e',
      'sub-path/sub-event-2e'
    ];
    for (let eventName of testEvents) {
      await remoteServer.exchange.SecuredComponent.fireEvent(eventName);
    }

    await wait(1000);
    test.expect(receivedEvents).to.eql(testEvents);
    await remoteServer.exchange.security.removeUserPermissions('test6User', {
      events: {
        '/DOMAIN_NAME/SecuredComponent/event-3e': {},
        '/DOMAIN_NAME/SecuredComponent/sub-path/sub-event-2e': {}
      }
    });
    await wait(1000);
    receivedEvents = [];
    for (let eventName of testEvents) {
      await remoteServer.exchange.SecuredComponent.fireEvent(eventName);
    }
    await wait(1000);
    test.expect(receivedEvents).to.eql(['event-1e', 'event-2e', 'sub-path/sub-event-1e']);
    receivedEvents = [];
    await remoteServer.exchange.security.addUserPermissions('test6User', {
      events: {
        '/DOMAIN_NAME/SecuredComponent/event-3e': {
          authorized: true
        },
        '/DOMAIN_NAME/SecuredComponent/sub-path/sub-event-2e': {
          authorized: true
        }
      }
    });
    await wait(1000);
    for (let eventName of testEvents) {
      await remoteServer.exchange.SecuredComponent.fireEvent(eventName);
    }
    await wait(1000);
    test.expect(receivedEvents).to.eql(testEvents);
  });

  let permissions = {
    test1User: {
      methods: {},
      events: {
        '/DOMAIN_NAME/SecuredComponent/event-3a': {
          authorized: true
        },
        '/DOMAIN_NAME/SecuredComponent/event-2a': {
          authorized: true
        }
      }
    },
    test2User: {
      events: {
        '/DOMAIN_NAME/SecuredComponent/event-3b': {
          authorized: true
        },
        '/DOMAIN_NAME/SecuredComponent/event-2b': {
          authorized: true
        },
        '/DOMAIN_NAME/SecuredComponent/sub-path/sub-event-2b': {
          authorized: true
        }
      }
    },
    test3User: {
      events: {
        '/DOMAIN_NAME/SecuredComponent/event-3d': {
          authorized: true
        },
        '/DOMAIN_NAME/SecuredComponent/event-2d': {
          authorized: true
        },
        '/DOMAIN_NAME/SecuredComponent/sub-path/*': {
          authorized: true
        }
      }
    },
    test4User: {
      methods: {},
      events: {}
    },
    test5User: {
      methods: {},
      events: {
        '/DOMAIN_NAME/SecuredComponent/someEventNotFired': {
          authorized: true
        }
      }
    },
    test6User: {
      methods: {},
      events: {
        '/DOMAIN_NAME/SecuredComponent/someEventNotFired': {
          authorized: true
        },
        '/DOMAIN_NAME/SecuredComponent/event-1e': {
          authorized: true
        },
        '/DOMAIN_NAME/SecuredComponent/event-2e': {
          authorized: true
        },
        '/DOMAIN_NAME/SecuredComponent/event-3e': {
          authorized: true
        },
        '/DOMAIN_NAME/SecuredComponent/sub-path/sub-event-1e': {
          authorized: true
        },
        '/DOMAIN_NAME/SecuredComponent/sub-path/sub-event-2e': {
          authorized: true
        }
      }
    }
  };
});
