const HappnerCluster = require('../..');
const multiAuthConfig = require('../_lib/multi-auth-provider-config.js');
const stopCluster = require('../_lib/stop-cluster');
const clearMongoCollection = require('../_lib/clear-mongo-collection');
const users = require('../_lib/users');
const client = require('../_lib/client');
const test = require('../_lib/test-helper');

describe(test.testName(__filename, 3), function() {
  this.timeout(20000);

  let servers;

  function serverConfig(seq, minPeers) {
    var config = multiAuthConfig(seq, minPeers, true);
    config.happn.services.replicator = {
      config: {
        securityChangesetReplicateInterval: 10 // 100 per second
      }
    };
    return config;
  }

  let testUser = {
    username: 'happnTestuser@somewhere.com',
    password: 'password'
  };

  let testUser2 = {
    username: 'secondTestuser@somewhere.com',
    password: 'secondPass'
  };

  before('clear mongo collection', function(done) {
    clearMongoCollection('mongodb://localhost', 'happn-cluster', done);
  });

  before('start cluster', async () => {
    servers = [];
    servers.push(await HappnerCluster.create(serverConfig(1, 1)));
    servers.push(await HappnerCluster.create(serverConfig(2, 2)));
    await users.add(servers[0], testUser.username, testUser.password);
    await test.delay(5000);
  });

  after('stop cluster', function(done) {
    if (!servers) return done();
    stopCluster(servers, done);
  });

  it('we should be able to log in using happn3 auth with testUser', async () => {
    let listenerClient = await client.create(testUser.username, testUser.password, 55002, 'happn3');
    test.expect(listenerClient).to.be.ok();
    await listenerClient.disconnect();
  });

  it('we should be able to log in using second auth with testUser2', async () => {
    let listenerClient = await client.create(testUser2.username, testUser2.password, 55002); //Should default to 'second' authProvider
    test.expect(listenerClient).to.be.ok();
    await listenerClient.disconnect();
  });

  it('we should fail to log in using happn3 auth with testUser2 (second auth user)', async () => {
    try {
      // eslint-disable-next-line no-unused-vars
      let listenerClient = await client.create(
        testUser2.username,
        testUser2.password,
        55002,
        'happn3'
      );
      throw new Error("Shouldn't get here");
    } catch (e) {
      test.expect(e.toString()).to.be('AccessDenied: Invalid credentials');
    }
  });

  it('we should fail to log in using second auth with testUser (happn3 auth user)', async () => {
    try {
      // eslint-disable-next-line no-unused-vars
      let listenerClient = await client.create(testUser.username, testUser.password, 55002); //Should default to 'second' authProvider
      throw new Error("Shouldn't get here");
    } catch (e) {
      test.expect(e.toString()).to.be('AccessDenied: Invalid credentials');
    }
  });
});
