const HappnerCluster = require('../..');
const libDir = require('../_lib/lib-dir');
const baseConfig = require('../_lib/base-config');
const stopCluster = require('../_lib/stop-cluster');
const clearMongoCollection = require('../_lib/clear-mongo-collection');
const users = require('../_lib/user-permissions');
const client = require('../_lib/client');
const test = require('../_lib/test-helper');
const getSeq = require('../_lib/helpers/getSeq');

describe(test.testName(__filename, 3), function() {
  this.timeout(20000);

  let servers, client1, client2;

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
    await users.add(servers[0], 'username', 'password');
    await test.delay(5000);
  });

  before('start client1', async () => {
    client1 = await client.create('username', 'password', getSeq.getPort(1));
  });

  before('start client2', async () => {
    client2 = await client.create('username', 'password', getSeq.getPort(2));
  });

  after('stop clients', async () => {
    if (client1) await client1.disconnect();
    if (client2) await client2.disconnect();
  });

  after('stop cluster', function(done) {
    if (!servers) return done();
    stopCluster(servers, done);
  });

  it('handles security sync for methods', async () => {
    test
      .expect(
        await Promise.all([
          client.callMethod(1, client1, 'component1', 'method1'),
          client.callMethod(2, client1, 'component1', 'method2'),
          client.callMethod(3, client2, 'component1', 'method1'),
          client.callMethod(4, client2, 'component1', 'method2')
        ])
      )
      .to.eql([
        {
          seq: 1,
          user: 'username',
          component: 'component1',
          method: 'method1',
          error: 'unauthorized'
        },
        {
          seq: 2,
          user: 'username',
          component: 'component1',
          method: 'method2',
          error: 'unauthorized'
        },
        {
          seq: 3,
          user: 'username',
          component: 'component1',
          method: 'method1',
          error: 'unauthorized'
        },
        {
          seq: 4,
          user: 'username',
          component: 'component1',
          method: 'method2',
          error: 'unauthorized'
        }
      ]);

    await users.allowMethod(servers[0], 'username', 'component1', 'method1');
    await test.delay(2000);

    test
      .expect(
        await Promise.all([
          client.callMethod(1, client1, 'component1', 'method1'),
          client.callMethod(2, client1, 'component1', 'method2'),
          client.callMethod(3, client2, 'component1', 'method1'),
          client.callMethod(4, client2, 'component1', 'method2')
        ])
      )
      .to.eql([
        {
          seq: 1,
          user: 'username',
          component: 'component1',
          method: 'method1',
          result: true
        },
        {
          seq: 2,
          user: 'username',
          component: 'component1',
          method: 'method2',
          error: 'unauthorized'
        },
        {
          seq: 3,
          user: 'username',
          component: 'component1',
          method: 'method1',
          result: true
        },
        {
          seq: 4,
          user: 'username',
          component: 'component1',
          method: 'method2',
          error: 'unauthorized'
        }
      ]);

    await Promise.all([
      users.denyMethod(servers[0], 'username', 'component1', 'method1'),
      users.allowMethod(servers[0], 'username', 'component1', 'method2')
    ]);

    await test.delay(2000);

    test
      .expect(
        await Promise.all([
          client.callMethod(1, client1, 'component1', 'method1'),
          client.callMethod(2, client1, 'component1', 'method2'),
          client.callMethod(3, client2, 'component1', 'method1'),
          client.callMethod(4, client2, 'component1', 'method2')
        ])
      )
      .to.eql([
        {
          seq: 1,
          user: 'username',
          component: 'component1',
          method: 'method1',
          error: 'unauthorized'
        },
        {
          seq: 2,
          user: 'username',
          component: 'component1',
          method: 'method2',
          result: true
        },
        {
          seq: 3,
          user: 'username',
          component: 'component1',
          method: 'method1',
          error: 'unauthorized'
        },
        {
          seq: 4,
          user: 'username',
          component: 'component1',
          method: 'method2',
          result: true
        }
      ]);
  });

  it('handles security sync for events', async () => {
    let events = {};
    test
      .expect(
        await Promise.all([
          client.subscribe(1, client1, 'component1', 'event1', createHandler(1)),
          client.subscribe(2, client1, 'component1', 'event2', createHandler(2)),
          client.subscribe(3, client2, 'component1', 'event1', createHandler(3)),
          client.subscribe(4, client2, 'component1', 'event2', createHandler(4))
        ])
      )
      .to.eql([
        { seq: 1, error: 'unauthorized' },
        { seq: 2, error: 'unauthorized' },
        { seq: 3, error: 'unauthorized' },
        { seq: 4, error: 'unauthorized' }
      ]);

    await Promise.all([
      users.allowEvent(servers[0], 'username', 'component1', 'event1'),
      users.allowEvent(servers[0], 'username', 'component1', 'event2')
    ]);

    await test.delay(1000);

    test
      .expect(
        await Promise.all([
          client.subscribe(1, client1, 'component1', 'event1', createHandler(1)),
          client.subscribe(2, client1, 'component1', 'event2', createHandler(2)),
          client.subscribe(3, client2, 'component1', 'event1', createHandler(3)),
          client.subscribe(4, client2, 'component1', 'event2', createHandler(4))
        ])
      )
      .to.eql([
        { seq: 1, result: true },
        { seq: 2, result: true },
        { seq: 3, result: true },
        { seq: 4, result: true }
      ]);

    await servers[0].exchange.component1.emitEvents();

    await test.delay(500);

    test.expect(popEvents()).to.eql({
      1: 'event1',
      2: 'event2',
      3: 'event1',
      4: 'event2'
    });

    await users.denyEvent(servers[0], 'username', 'component1', 'event1');
    await test.delay(1000);

    await servers[0].exchange.component1.emitEvents();

    await test.delay(500);

    test.expect(popEvents()).to.eql({
      // 1: 'event1',
      2: 'event2',
      // 3: 'event1',
      4: 'event2'
    });

    test
      .expect(
        await Promise.all([
          client.subscribe(1, client1, 'component1', 'event1', createHandler(1)),
          client.subscribe(2, client1, 'component1', 'event2', createHandler(2)),
          client.subscribe(3, client2, 'component1', 'event1', createHandler(3)),
          client.subscribe(4, client2, 'component1', 'event2', createHandler(4))
        ])
      )
      .to.eql([
        { seq: 1, error: 'unauthorized' },
        { seq: 2, result: true },
        { seq: 3, error: 'unauthorized' },
        { seq: 4, result: true }
      ]);

    function popEvents() {
      let cloned = JSON.parse(JSON.stringify(events));
      events = {};
      return cloned;
    }

    function createHandler(seq) {
      return function(data) {
        events[seq] = data.value;
      };
    }
  });
});
