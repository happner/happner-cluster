const HappnerCluster = require('../..');
const baseConfig = require('../_lib/base-config');
const stopCluster = require('../_lib/stop-cluster');
const clearMongoCollection = require('../_lib/clear-mongo-collection');
const users = require('../_lib/user-permissions');
const client = require('../_lib/client');
const test = require('../_lib/test-helper');
const getSeq = require('../_lib/helpers/getSeq');

describe(test.testName(__filename, 3), function() {
  this.timeout(20000);

  let servers, testClient, savedUser, savedGroup;

  function serverConfig(seq, minPeers) {
    var config = baseConfig(seq, minPeers, true);
    config.modules = {};
    config.components = {
      data: {}
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
    savedUser = await users.add(servers[0], 'lookupUser', 'password', null, {
      company: 'COMPANY_ABC',
      oem: 'OEM_ABC'
    });
    let testGroup = {
      name: 'LOOKUP_TABLES_GRP',
      permissions: {}
    };
    savedGroup = await servers[0].exchange.security.addGroup(testGroup);
    await test.delay(4000);
  });

  before('start client', async () => {
    testClient = await client.create('lookupUser', 'password', getSeq.getPort(2)); //Second server
  });

  after('stop client', async () => {
    if (testClient) await testClient.disconnect();
  });

  after('stop cluster', function(done) {
    if (!servers) return done();
    stopCluster(servers, done);
  });

  it('can fetch data if lookup tables and permissions are configured correctly (Lookup table and permission upserted on server[0], client on server[1]', async () => {
    let testTable = {
      name: 'STANDARD_ABC',
      paths: [
        'device/OEM_ABC/COMPANY_ABC/SPECIAL_DEVICE_ID_1',
        'device/OEM_ABC/COMPANY_ABC/SPECIAL_DEVICE_ID_2'
      ]
    };
    let permission1 = {
      regex: '^/_data/historianStore/(.*)',
      actions: ['get'],
      table: 'STANDARD_ABC',
      path: '/device/{{user.custom_data.oem}}/{{user.custom_data.company}}/{{$1}}'
    };
    await servers[0].exchange.data.set('/_data/historianStore/SPECIAL_DEVICE_ID_1', {
      test: 'data'
    });
    await servers[0].exchange.security.upsertLookupTable(testTable);
    await servers[0].exchange.security.upsertLookupPermission('LOOKUP_TABLES_GRP', permission1);

    try {
      let data = await testClient.data.get('/_data/historianStore/SPECIAL_DEVICE_ID_1');
      if (data) throw new Error('Test Error : Should not be authorized');
    } catch (e) {
      test.expect(e.toString()).to.be('AccessDenied: unauthorized');
    }

    await servers[0].exchange.security.linkGroup(savedGroup, savedUser);
    await test.delay(1000);
    let data = await testClient.data.get('/_data/historianStore/SPECIAL_DEVICE_ID_1');

    await servers[0].exchange.security.removeLookupPath(
      'STANDARD_ABC',
      'device/OEM_ABC/COMPANY_ABC/SPECIAL_DEVICE_ID_1'
    );
    try {
      data = await testClient.data.get('/_data/historianStore/SPECIAL_DEVICE_ID_1');
      if (data) throw new Error('Test Error : Should not be authorized');
    } catch (e) {
      test.expect(e.toString()).to.be('AccessDenied: unauthorized');
    }
  });
});
