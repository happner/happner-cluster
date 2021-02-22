const HappnerCluster = require('../..');
var Promise = require('bluebird');
var expect = require('expect.js');

var libDir = require('../_lib/lib-dir');
var baseConfig = require('../_lib/base-config');
var stopCluster = require('../_lib/stop-cluster');
var users = require('../_lib/users');
var testclient = require('../_lib/client');

var clearMongoCollection = require('../_lib/clear-mongo-collection');

const test = require('../_lib/test-helper');
//var log = require('why-is-node-running');
describe(test.testName(__filename, 3), function() {
  this.timeout(40000);

  var servers = [],
    localInstance;

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

  context('exchange', function() {
    it('starts the cluster edge first, connects a client to the local instance, and is not able to access the unimplemented remote component', async () => {
      let thisClient, emitted;
      try {
        await startClusterEdgeFirst();
        await test.delay(2000);
        await setUpSecurity(localInstance);
        await test.delay(2000);
        thisClient = await testclient.create('username', 'password', 55001);
        const result1 = await thisClient.exchange.$call({
          component: 'brokerComponent',
          method: 'directMethod'
        });
        test.expect(result1).to.be('MESH_1:brokerComponent:directMethod');
        await thisClient.event.$on(
          {
            component: 'remoteComponent1',
            path: '*'
          },
          data => {
            emitted = data;
          }
        );
        const result2 = await thisClient.exchange.$call({
          component: 'remoteComponent1',
          method: 'brokeredMethod1'
        });
        test.expect(result2).to.be('MESH_2:remoteComponent:brokeredMethod1');
        await test.delay(2000);

        const result3 = await thisClient.exchange.$call({
          component: 'prereleaseComponent',
          method: 'brokeredMethod1'
        });

        test.expect(result3).to.be('MESH_2:prereleaseComponent:brokeredMethod1');

        await thisClient.exchange.$call({
          component: 'prereleaseComponent',
          method: 'unknownMethod'
        });
      } catch (e) {
        expect(e.message).to.be('unknown exchange method: unknownMethod');
        expect(emitted).to.eql({ topic: 'MESH_2:remoteComponent:brokeredMethod1' });
        return;
      }
      throw new Error('was not meant to happen');
    });

    it('starts the cluster edge first, connects a client to the local instance, tests $once', async () => {
      let thisClient,
        emitted = [];
      await startClusterEdgeFirst();
      await test.delay(2000);
      await setUpSecurity(localInstance);
      await test.delay(2000);
      thisClient = await testclient.create('username', 'password', 55001);
      const result1 = await thisClient.exchange.$call({
        component: 'brokerComponent',
        method: 'directMethod'
      });
      test.expect(result1).to.be('MESH_1:brokerComponent:directMethod');
      await thisClient.event.$once(
        {
          component: 'remoteComponent1',
          path: '*'
        },
        data => {
          emitted.push(data);
        }
      );
      await thisClient.exchange.$call({
        component: 'remoteComponent1',
        method: 'brokeredMethod1'
      });
      await thisClient.exchange.$call({
        component: 'remoteComponent1',
        method: 'brokeredMethod1'
      });
      await test.delay(2000);
      expect(emitted).to.eql([{ topic: 'MESH_2:remoteComponent:brokeredMethod1' }]);
    });

    it('starts the cluster edge first, connects a client to the local instance, tests $off', async () => {
      let thisClient,
        emitted = [];
      await startClusterEdgeFirst();
      await test.delay(2000);
      await setUpSecurity(localInstance);
      await test.delay(2000);
      thisClient = await testclient.create('username', 'password', 55001);
      const result1 = await thisClient.exchange.$call({
        component: 'brokerComponent',
        method: 'directMethod'
      });
      test.expect(result1).to.be('MESH_1:brokerComponent:directMethod');
      const id = await thisClient.event.$on(
        {
          component: 'remoteComponent1',
          path: '*'
        },
        async data => {
          emitted.push(data);
        }
      );
      await thisClient.exchange.$call({
        component: 'remoteComponent1',
        method: 'brokeredMethod1'
      });
      await test.delay(2000);
      await thisClient.event.$off({
        component: 'remoteComponent1',
        id
      });
      await thisClient.exchange.$call({
        component: 'remoteComponent1',
        method: 'brokeredMethod1'
      });
      await test.delay(2000);
      expect(emitted).to.eql([{ topic: 'MESH_2:remoteComponent:brokeredMethod1' }]);
    });

    it('starts the cluster edge first, connects a client to the local instance, tests $offPath', async () => {
      let thisClient,
        emitted = [];
      await startClusterEdgeFirst();
      await test.delay(2000);
      await setUpSecurity(localInstance);
      await test.delay(2000);
      thisClient = await testclient.create('username', 'password', 55001);
      const result1 = await thisClient.exchange.$call({
        component: 'brokerComponent',
        method: 'directMethod'
      });
      test.expect(result1).to.be('MESH_1:brokerComponent:directMethod');
      await thisClient.event.$on(
        {
          component: 'remoteComponent1',
          path: '*'
        },
        async data => {
          emitted.push(data);
        }
      );
      await thisClient.event.$on(
        {
          component: 'remoteComponent1',
          path: '*'
        },
        async data => {
          emitted.push(data);
        }
      );
      await thisClient.exchange.$call({
        component: 'remoteComponent1',
        method: 'brokeredMethod1'
      });
      await test.delay(2000);
      await thisClient.event.$offPath({
        component: 'remoteComponent1',
        path: '*'
      });
      await thisClient.exchange.$call({
        component: 'remoteComponent1',
        method: 'brokeredMethod1'
      });
      await test.delay(2000);
      expect(emitted).to.eql([
        { topic: 'MESH_2:remoteComponent:brokeredMethod1' },
        { topic: 'MESH_2:remoteComponent:brokeredMethod1' }
      ]);
    });

    it('starts the cluster edge first, connects a client to the local instance, tests $offPath - negative', async () => {
      let thisClient,
        emitted = [];
      await startClusterEdgeFirst();
      await test.delay(2000);
      await setUpSecurity(localInstance);
      await test.delay(2000);
      thisClient = await testclient.create('username', 'password', 55001);
      const result1 = await thisClient.exchange.$call({
        component: 'brokerComponent',
        method: 'directMethod'
      });
      test.expect(result1).to.be('MESH_1:brokerComponent:directMethod');
      await thisClient.event.$on(
        {
          component: 'remoteComponent1',
          path: '*'
        },
        async data => {
          emitted.push(data);
        }
      );
      await thisClient.event.$on(
        {
          component: 'remoteComponent1',
          path: '*'
        },
        async data => {
          emitted.push(data);
        }
      );
      await thisClient.exchange.$call({
        component: 'remoteComponent1',
        method: 'brokeredMethod1'
      });
      await test.delay(2000);
      await thisClient.exchange.$call({
        component: 'remoteComponent1',
        method: 'brokeredMethod1'
      });
      await test.delay(2000);
      expect(emitted).to.eql([
        { topic: 'MESH_2:remoteComponent:brokeredMethod1' },
        { topic: 'MESH_2:remoteComponent:brokeredMethod1' },
        { topic: 'MESH_2:remoteComponent:brokeredMethod1' },
        { topic: 'MESH_2:remoteComponent:brokeredMethod1' }
      ]);
    });

    it('starts the cluster internal first, connects a client to the local instance, and is not able to access the unimplemented remote component, prerelease not found', function(done) {
      let thisClient,
        reachedEnd = false;

      startClusterInternalFirst()
        .then(function() {
          return users.allowMethod(localInstance, 'username', 'brokerComponent', 'directMethod');
        })
        .then(function() {
          return users.allowMethod(localInstance, 'username', 'remoteComponent', 'brokeredMethod1');
        })
        .then(function() {
          return users.allowMethod(
            localInstance,
            'username',
            'remoteComponent1',
            'brokeredMethod1'
          );
        })
        .then(function() {
          return users.allowMethod(
            localInstance,
            'username',
            'prereleaseComponent',
            'brokeredMethod1'
          );
        })
        .then(function() {
          return users.allowMethod(
            localInstance,
            'username',
            'prereleaseComponentNotFound',
            'brokeredMethod1'
          );
        })
        .then(function() {
          return new Promise(resolve => {
            setTimeout(resolve, 5000);
          });
        })
        .then(function() {
          return testclient.create('username', 'password', 55002);
        })
        .then(function(client) {
          thisClient = client;
          //first test our broker components methods are directly callable
          return thisClient.exchange.$call({
            component: 'brokerComponent',
            method: 'directMethod'
          });
        })
        .then(function(result) {
          expect(result).to.be('MESH_2:brokerComponent:directMethod');
          //call to good version of method
          return thisClient.exchange.$call({
            component: 'remoteComponent1',
            method: 'brokeredMethod1'
          });
        })
        .then(function() {
          //call to prerelease method
          return thisClient.exchange.$call({
            component: 'prereleaseComponent',
            method: 'brokeredMethod1'
          });
        })
        .then(function() {
          reachedEnd = true;
          //call to bad version of method
          return thisClient.exchange.$call({
            component: 'prereleaseComponentNotFound',
            method: 'brokeredMethod1'
          });
        })
        .catch(e => {
          //expect a failure - wrong version
          expect(e.message).to.be('unknown exchange method: brokeredMethod1');
          expect(reachedEnd).to.be(true);
          done();
        });
    });

    it('starts the cluster internal first, tries to call a non-existent component', function(done) {
      let thisClient;

      startClusterInternalFirst()
        .then(function() {
          return users.allowMethod(localInstance, 'username', 'brokerComponent', 'directMethod');
        })
        .then(function() {
          return users.allowMethod(localInstance, 'username', 'remoteComponent', 'brokeredMethod1');
        })
        .then(function() {
          return users.allowMethod(
            localInstance,
            'username',
            'remoteComponent1',
            'brokeredMethod1'
          );
        })
        .then(function() {
          return users.allowMethod(
            localInstance,
            'username',
            'prereleaseComponent',
            'brokeredMethod1'
          );
        })
        .then(function() {
          return users.allowMethod(
            localInstance,
            'username',
            'unknownComponent',
            'brokeredMethod1'
          );
        })
        .then(function() {
          return new Promise(resolve => {
            setTimeout(resolve, 2000);
          });
        })
        .then(function() {
          return testclient.create('username', 'password', 55002);
        })
        .then(function(client) {
          thisClient = client;
          //call to unknown method
          return thisClient.exchange.$call({
            component: 'unknownComponent',
            method: 'brokeredMethod1'
          });
        })
        .catch(e => {
          //expect a failure - wrong version
          expect(e.message).to.be(
            'invalid endpoint options: unknownComponent component does not exist on the api'
          );
          done();
        });
    });
  });

  function startInternal(id, clusterMin) {
    return HappnerCluster.create(remoteInstanceConfig(id, clusterMin));
  }

  function startEdge(id, clusterMin) {
    return HappnerCluster.create(localInstanceConfig(id, clusterMin));
  }

  function startClusterEdgeFirst() {
    return new Promise(function(resolve, reject) {
      startEdge(1, 1)
        .then(function(server) {
          servers.push(server);
          return startInternal(2, 2);
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

  function startClusterInternalFirst() {
    return new Promise(function(resolve, reject) {
      startInternal(1, 1)
        .then(function(server) {
          servers.push(server);
          localInstance = server;
          return startEdge(2, 2);
        })
        .then(function(server) {
          servers.push(server);
          return users.add(localInstance, 'username', 'password');
        })
        .then(resolve)
        .catch(reject);
    });
  }

  function localInstanceConfig(seq, sync) {
    var config = baseConfig(seq, sync, true);
    config.modules = {
      brokerComponent: {
        path: libDir + 'integration-broker-component-versions-call-on'
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

  function remoteInstanceConfig(seq, sync) {
    var config = baseConfig(seq, sync, true);
    config.modules = {
      remoteComponent: {
        path: libDir + 'integration-remote-component-versions-call-on'
      },
      prereleaseComponent: {
        path: libDir + 'integration-remote-component-versions-prerelease-call-on'
      },
      prereleaseComponentNotFound: {
        path: libDir + 'integration-remote-component-versions-prerelease-not-found-call-on'
      }
    };
    config.components = {
      remoteComponent: {
        startMethod: 'start',
        stopMethod: 'stop'
      },
      remoteComponent1: {
        module: 'remoteComponent',
        startMethod: 'start',
        stopMethod: 'stop'
      },
      prereleaseComponent: {
        module: 'prereleaseComponent',
        startMethod: 'start',
        stopMethod: 'stop'
      },
      prereleaseComponentNotFound: {
        module: 'prereleaseComponentNotFound',
        startMethod: 'start',
        stopMethod: 'stop'
      }
    };
    return config;
  }

  async function setUpSecurity(instance) {
    await users.allowMethod(instance, 'username', 'brokerComponent', 'directMethod');
    await users.allowMethod(instance, 'username', 'remoteComponent', 'brokeredMethod1');
    await users.allowMethod(instance, 'username', 'remoteComponent1', 'brokeredMethod1');
    await users.allowEvent(instance, 'username', 'remoteComponent1', '*');
    await users.allowMethod(instance, 'username', 'prereleaseComponent', 'brokeredMethod1');
    await users.allowMethod(instance, 'username', 'prereleaseComponentNotFound', 'brokeredMethod1');
    await users.allowMethod(instance, 'username', 'prereleaseComponentNotFound', 'brokeredMethod1');
  }
});
