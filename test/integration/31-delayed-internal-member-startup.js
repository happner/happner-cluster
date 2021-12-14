require('../_lib/test-helper').describe(test => {
  const servers = [];
  const libDir = `${require('../_lib/lib-dir')}integration-31-delayed-internal-member-startup${
    test.path.sep
  }`;
  let meshClientHelper = require('../_lib/client');
  let happnerClient, clientPort, meshClient;

  before('starts the edge', startEdge);
  before('starts internal 1', startInternal1);
  before('connects the test.client', connectClient);
  after('destroys the cluster', destroyServers);
  after('disconnects the test.clients', disconnectClients);

  it('can construct the edge for rest requests after a delayed internal node start', async () => {
    await test.delay(3000);
    test.expect(await checkHappnerMethodAvailable()).to.be(false);
    test.expect(await checkRestMethodAvailable()).to.be(false);
    await startInternal2();
    await test.delay(3000);
    test.expect(await checkHappnerMethodAvailable()).to.be(true);
    test.expect(await checkRestMethodAvailable()).to.be(true);
    await checkRestDescribe();

    await connectMeshClient();
    await checkHappnerMethodCallback();
  });

  async function startEdge() {
    const config = localInstanceConfig(test.getSeq.getFirst(), 1);
    config.cluster.dependenciesSatisfiedDeferListen = true;
    config.authorityDelegationOn = true;
    clientPort = config.port;
    servers.push(await test.HappnerCluster.create(config));
    return servers[0];
  }

  async function startInternal1() {
    servers.push(await test.HappnerCluster.create(remoteInstanceConfig1(test.getSeq.getNext(), 1)));
    return servers[1];
  }

  async function startInternal2() {
    servers.push(await test.HappnerCluster.create(remoteInstanceConfig2(test.getSeq.getNext(), 2)));
    return servers[2];
  }

  async function checkHappnerMethodCallback() {
    return new Promise((resolve, reject) => {
      meshClient.exchange['component-2'].method((e, result) => {
        if (e) reject(e);
        resolve(result);
      });
    });
  }

  async function checkHappnerMethodAvailable() {
    try {
      await happnerClient.exchange['component-2'].method();
    } catch (e) {
      return false;
    }
    return true;
  }

  async function checkRestMethodAvailable() {
    try {
      await test.axios.post(
        `http://127.0.0.1:${clientPort}/rest/method/component-2/method?happn_token=${happnerClient.token}`,
        {
          parameters: {
            opts: { number: 1 }
          }
        }
      );
    } catch (e) {
      return false;
    }
    return true;
  }

  async function checkRestDescribe() {
    try {
      //getCurrentValues
      // https://smc.fieldpop.io/rest/method/fieldpop-api/getCurrentValues?happn-token=7932b2e116b076a54f452848eaabd5857f61bd957fe8a218faf216f24c9885bb
      // https://smc.fieldpop.io/rest/describe?happn-token=7932b2e116b076a54f452848eaabd5857f61bd957fe8a218faf216f24c9885bb
      //7932b2e116b076a54f452848eaabd5857f61bd957fe8a218faf216f24c9885bb
      const result = await test.axios.post(
        `http://127.0.0.1:${clientPort}/rest/describe?happn_token=${happnerClient.token}`,
        {
          parameters: {
            opts: { number: 1 }
          }
        }
      );
      test.expect(result.data['/component-2/method']).to.not.eql(null);
    } catch (e) {
      return false;
    }
    return true;
  }

  async function connectClient() {
    happnerClient = await test.client.create('_ADMIN', 'happn', clientPort);
  }

  async function connectMeshClient() {
    meshClient = await meshClientHelper.create('_ADMIN', 'happn', clientPort);
  }

  async function disconnectClients() {
    if (happnerClient) await happnerClient.disconnect();
  }

  function destroyServers() {
    return new Promise(resolve => {
      test.stopCluster(servers, function() {
        test.clearMongoCollection('mongodb://localhost', 'happn-cluster', resolve);
      });
    });
  }

  function localInstanceConfig(seq, sync) {
    var config = test.baseConfig(seq, sync, true);
    config.modules = {
      brokerComponent: {
        path: libDir + 'edge-component'
      }
    };
    config.components = {
      brokerComponent: {
        startMethod: 'start',
        stopMethod: 'stop'
      }
    };
    return config;
  }

  function remoteInstanceConfig1(seq, sync) {
    const config = test.baseConfig(
      seq,
      sync,
      true,
      undefined,
      undefined,
      undefined,
      undefined,
      false
    );
    config.authorityDelegationOn = true;
    config.modules = {
      component1: {
        path: libDir + 'internal-1-component'
      }
    };
    config.components = {
      component1: {
        startMethod: 'start',
        stopMethod: 'stop'
      }
    };
    return config;
  }

  function remoteInstanceConfig2(seq, sync) {
    const config = test.baseConfig(
      seq,
      sync,
      true,
      undefined,
      undefined,
      undefined,
      undefined,
      false
    );
    config.authorityDelegationOn = true;
    config.modules = {
      'component-2': {
        path: libDir + 'internal-2-component'
      }
    };
    config.components = {
      'component-2': {
        startMethod: 'start',
        stopMethod: 'stop'
      }
    };
    return config;
  }
}, 120000);
