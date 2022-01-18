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
    config.modules = {
      component: {
        instance: {
          isCombinationAuthorized: async function($happn, $origin, combination, username) {
            return await $happn.isAuthorized(username || $origin.username, combination);
          },
          method: async function($happn, data) {
            $happn.emit('method', { data });
          }
        }
      }
    };
    config.components = {
      data: {},
      component: {}
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

  before(
    'start cluster and create user, group and lookup table',
    startClusterAndCreateSecurityResources
  );

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
    test
      .expect(
        await testClient.exchange.component.isCombinationAuthorized({
          methods: [`DOMAIN_NAME/component/method`],
          events: [`/DOMAIN_NAME/component/test/*`],
          data: {
            '/_data/historianStore/SPECIAL_DEVICE_ID_1': { actions: ['get'] }
          }
        })
      )
      .to.eql({
        authorized: true,
        forbidden: []
      });

    test
      .expect(
        await trySomething(async () => {
          await testClient.data.get('/_data/historianStore/SPECIAL_DEVICE_ID_1');
        })
      )
      .to.be(true);

    await servers[0].exchange.security.deleteLookupTable('STANDARD_ABC');
    await test.delay(2000);

    test
      .expect(
        await trySomething(async () => {
          await testClient.data.get('/_data/historianStore/SPECIAL_DEVICE_ID_1');
        })
      )
      .to.be('AccessDenied: unauthorized');

    test
      .expect(
        await testClient.exchange.component.isCombinationAuthorized({
          methods: [`DOMAIN_NAME/component/method`],
          events: [`/DOMAIN_NAME/component/test/*`],
          data: {
            '/_data/historianStore/SPECIAL_DEVICE_ID_1': { actions: ['get'] }
          }
        })
      )
      .to.eql({
        authorized: false,
        forbidden: [
          {
            authorized: false,
            path: '/_data/historianStore/SPECIAL_DEVICE_ID_1',
            action: 'get'
          }
        ]
      });
  });

  async function startClusterAndCreateSecurityResources() {
    servers = [];
    servers.push(await HappnerCluster.create(serverConfig(getSeq.getFirst(), 1)));
    servers.push(await HappnerCluster.create(serverConfig(getSeq.getNext(), 2)));
    savedUser = await users.add(servers[0], 'lookupUser', 'password', null, {
      company: 'COMPANY_ABC',
      oem: 'OEM_ABC'
    });
    let testGroup = {
      name: 'LOOKUP_TABLES_GRP',
      permissions: {
        methods: {
          '/DOMAIN_NAME/component/method': { authorized: true },
          '/DOMAIN_NAME/component/isCombinationAuthorized': { authorized: true }
        },
        events: {
          '/DOMAIN_NAME/component/test/*': { authorized: true }
        },
        data: {
          'test/data/{{user.username}}/*': { actions: ['*'] }
        }
      }
    };
    savedGroup = await servers[0].exchange.security.addGroup(testGroup);
    let testTable = {
      name: 'STANDARD_ABC',
      paths: [
        'device/OEM_ABC/COMPANY_ABC/SPECIAL_DEVICE_ID_1',
        'device/OEM_ABC/COMPANY_ABC/SPECIAL_DEVICE_ID_2'
      ]
    };
    await servers[0].exchange.security.upsertLookupTable(testTable);
    await servers[0].exchange.security.upsertLookupPermission('LOOKUP_TABLES_GRP', {
      regex: '^/_data/historianStore/(.*)',
      actions: ['get'],
      table: 'STANDARD_ABC',
      path: '/device/{{user.custom_data.oem}}/{{user.custom_data.company}}/{{$1}}'
    });
    await servers[0].exchange.data.set('/_data/historianStore/SPECIAL_DEVICE_ID_1', {
      test: 'data'
    });

    await servers[0].exchange.security.linkGroup(savedGroup, savedUser);
    await test.delay(4000);
  }

  async function trySomething(methodToTry) {
    try {
      await methodToTry();
      return true;
    } catch (e) {
      return e.message;
    }
  }
});
