/* eslint-disable no-console */
const HappnerCluster = require('../..');
const HappnerClient = require('happner-client');
var Promise = require('bluebird');
var expect = require('expect.js');

var libDir = require('../_lib/lib-dir');
var baseConfig = require('../_lib/base-config');
var stopCluster = require('../_lib/stop-cluster');
var users = require('../_lib/users');
var testclient = require('../_lib/client');
var path = require('path');
var clearMongoCollection = require('../_lib/clear-mongo-collection');
const getSeq = require('../_lib/helpers/getSeq');
const wait = require('await-delay');
describe(require('../_lib/test-helper').testName(__filename, 3), function() {
  this.timeout(600000);
  const previousLogLevel = process.env.LOG_LEVEL || 'info';
  process.env.LOG_LEVEL = 'info';
  var servers = [];
  let currentProc;

  beforeEach('clear mongo collection', function(done) {
    stopCluster(servers, function() {
      // this should still clear mongo, so we ignore any error in callback
      servers = [];
      clearMongoCollection('mongodb://localhost', 'happn-cluster', function(e) {
        if (e) console.log(e);
        setTimeout(done, 2000);
      });
    });
  });

  afterEach('stop cluster', stopAndCount);

  // after('check unreleased handles', async () => {
  //   console.log('delaying for unreleased handles check');
  //   await delay(10000);
  //   require('why-is-node-running')();
  // });

  var adminUserDisconnectionsOnProcess = 0;
  var adminUserDisconnectionsOnProcessAfterLoginChurn = 0;

  context('exchange', function() {
    it('tests brokered data events -  internal originator replicated to broker', function(done) {
      var internalClient, brokerClient, brokerClient1, processClient;
      var edgeInstance;
      var internalEventData = [];
      var brokerEventData = [];
      var brokerEventData1 = [];
      var processEventData = [];

      startEdge(getSeq.getFirst(), 1)
        .then(instance => {
          edgeInstance = instance;
          return users.add(edgeInstance[0], 'username', 'password');
        })
        .then(function() {
          return startInternal(getSeq.getNext(), 3);
        })
        .then(function() {
          return new Promise(resolve => {
            setTimeout(resolve, 5000);
          });
        })
        .then(function() {
          return users.allowDataPath(edgeInstance[0], 'username', 'test/event/*');
        })
        .then(function() {
          console.log('STARTING LINER START STOP');
          return linearStartStopProcess(
            `hosts=127.0.0.1:${getSeq.getSwimPort(1)} port=${getSeq.getHappnPort(
              5
            )} proxyport=${getSeq.getProxyPort(5)} membershipport=${getSeq.getSwimPort(
              5
            )} seed=false secure=true joinTimeout=300 membername=external-1`,
            10,
            5000
          );
        })
        .then(function() {
          console.log('AFTER CHURN');
          adminUserDisconnectionsOnProcessAfterLoginChurn = adminUserDisconnectionsOnProcess;
          return new Promise(resolve => {
            setTimeout(resolve, 5000);
          });
        })
        .then(function() {
          return testclient.create('username', 'password', getSeq.getPort(5));
        })
        .then(function(client) {
          processClient = client;
          //first test our broker components methods are directly callable
          return processClient.data.on('test/event/*', data => {
            processEventData.push(data);
          });
        })
        .then(function() {
          return testclient.create('username', 'password', getSeq.getPort(3));
        })
        .then(function(client) {
          internalClient = client;
          //first test our broker components methods are directly callable
          return internalClient.data.on('test/event/*', data => {
            internalEventData.push(data);
          });
        })
        .then(function() {
          return testclient.create('username', 'password', getSeq.getPort(1));
        })
        .then(function(client) {
          brokerClient = client;
          //first test our broker components methods are directly callable
          return brokerClient.data.on('test/event/*', data => {
            brokerEventData.push(data);
          });
        })
        .then(function() {
          return testclient.create('username', 'password', getSeq.getPort(2));
        })
        .then(function(client) {
          brokerClient1 = client;
          //first test our broker components methods are directly callable
          return brokerClient1.data.on('test/event/*', data => {
            brokerEventData1.push(data);
          });
        })
        .then(function() {
          return new Promise(resolve => {
            setTimeout(resolve, 2000);
          });
        })
        .then(function() {
          return internalClient.data.set('test/event/1', { test: 'data-1' });
        })
        .then(function() {
          return brokerClient.data.set('test/event/2', { test: 'data-2' });
        })
        .then(function() {
          return new Promise(resolve => {
            setTimeout(resolve, 3000);
          });
        })
        .then(function() {
          expect([internalEventData, brokerEventData, brokerEventData1]).to.eql([
            [
              {
                test: 'data-1'
              },
              {
                test: 'data-2'
              }
            ],
            [
              {
                test: 'data-1'
              },
              {
                test: 'data-2'
              }
            ],
            [
              {
                test: 'data-1'
              },
              {
                test: 'data-2'
              }
            ]
          ]);
          processClient.disconnect();
          brokerClient.disconnect();
          internalClient.disconnect();
          expect(brokerEventData.length).to.be(2);
          expect(brokerEventData1.length).to.be(2);
          expect(internalEventData.length).to.be(2);
          expect(processEventData.length).to.be(2);
          stopAndCount(disconnects => {
            expect(disconnects < 12).to.be(true);
            done();
          }, true);
        })
        .catch(done);
    });
  });

  it('we test brokered descriptions are ignored', function(done) {
    const capturedLogs = [];
    const intercept = require('intercept-stdout');
    const unhook_intercept = intercept(function(txt) {
      capturedLogs.push(txt);
    });
    var edgeInstance;
    var thisClient;
    var thisLocalClient;
    var gotToFinalAttempt = false;

    startEdge(getSeq.getFirst(), 1)
      .then(instance => {
        edgeInstance = instance;
        return new Promise((resolve, reject) => {
          testclient
            .create('username', 'password', getSeq.getPort(1))
            .then(() => {
              reject(new Error('not meant to happen'));
            })
            .catch(e => {
              if (e.message.indexOf('connect ECONNREFUSED') !== 0)
                return reject('unexpected error: ' + e.message);
              users
                .add(edgeInstance[0], 'username', 'password')
                .then(() => {
                  resolve();
                })
                .catch(reject);
            });
        });
      })
      .then(function() {
        return startInternal(getSeq.getNext(), 3);
      })
      .then(function() {
        return users.allowMethod(edgeInstance[0], 'username', 'brokerComponent', 'directMethod');
      })
      .then(function() {
        return users.allowMethod(edgeInstance[0], 'username', 'remoteComponent', 'brokeredMethod1');
      })
      .then(function() {
        return users.allowMethod(
          edgeInstance[0],
          'username',
          'remoteComponent1',
          'brokeredMethod1'
        );
      })
      .then(function() {
        return users.allowEvent(edgeInstance[0], 'username', 'remoteComponent1', 'test/event');
      })
      .then(function() {
        return users.allowMethod(edgeInstance[0], 'username', 'remoteComponent', 'attachToEvent');
      })
      .then(function() {
        return new Promise(resolve => {
          setTimeout(resolve, 5000);
        });
      })
      .then(function() {
        return testclient.create('username', 'password', getSeq.getPort(3));
      })
      .then(function(client) {
        thisLocalClient = client;
        //first test our broker components methods are directly callable
        return thisLocalClient.event.remoteComponent1.on('test/event');
      })
      .then(function() {
        return thisLocalClient.exchange.remoteComponent.attachToEvent();
      })
      .then(function() {
        thisLocalClient.disconnect();
        return testclient.create('username', 'password', getSeq.getPort(1));
      })
      .then(function(client) {
        thisClient = client;
        //first test our broker components methods are directly callable
        return thisClient.exchange.brokerComponent.directMethod();
      })
      .then(function(result) {
        expect(result).to.be(getSeq.getMeshName(1) + ':brokerComponent:directMethod');
        //call an injected method

        return thisClient.exchange.remoteComponent.brokeredMethod1();
      })
      .then(function(result) {
        expect(result).to.be(getSeq.getMeshName(3) + ':remoteComponent:brokeredMethod1');
        return thisClient.exchange.remoteComponent1.brokeredMethod1();
      })
      .then(function(result) {
        expect(result).to.be(getSeq.getMeshName(3) + ':remoteComponent1:brokeredMethod1');
        return users.denyMethod(edgeInstance[0], 'username', 'remoteComponent', 'brokeredMethod1');
      })
      .then(function() {
        return new Promise((resolve, reject) => {
          //connect with a happner client - ensure we dont get an ignore description log
          var happnerClient = new HappnerClient();
          let api = happnerClient.construct({
            remoteComponent1: {
              version: '*',
              methods: {
                brokeredMethod1: {}
              }
            }
          });
          happnerClient.connect(
            null,
            {
              host: 'localhost',
              port: getSeq.getPort(1),
              username: 'username',
              password: 'password'
            },
            function(e) {
              if (e) return reject(e);
              api.exchange.remoteComponent1.brokeredMethod1(e => {
                if (e) return reject(e);
                happnerClient.disconnect(resolve);
              });
            }
          );
        });
      })
      .then(function() {
        gotToFinalAttempt = true;
        return thisClient.exchange.remoteComponent.brokeredMethod1();
      })
      .catch(function(e) {
        expect(gotToFinalAttempt).to.be(true);
        expect(e.toString()).to.be('AccessDenied: unauthorized');
        unhook_intercept();

        expect(
          capturedLogs
            .filter(txt => {
              return txt.indexOf('ignoring brokered description for peer:') > -1;
            })
            .map(txt => {
              return txt.split('ms MESH_')[1];
            })
            .sort()
        ).to.eql([
          `1 (HappnerClient) ignoring brokered description for peer: ${getSeq.getMeshName(2)}\n`,
          `2 (HappnerClient) ignoring brokered description for peer: ${getSeq.getMeshName(1)}\n`,
          `3 (HappnerClient) ignoring brokered description for peer: ${getSeq.getMeshName(1)}\n`,
          `3 (HappnerClient) ignoring brokered description for peer: ${getSeq.getMeshName(2)}\n`,
          `4 (HappnerClient) ignoring brokered description for peer: ${getSeq.getMeshName(1)}\n`,
          `4 (HappnerClient) ignoring brokered description for peer: ${getSeq.getMeshName(2)}\n`
        ]);
        process.env.LOG_LEVEL = previousLogLevel;
        thisClient.disconnect();
        setTimeout(done, 2000);
      });
  });

  it('we tests brokered data events - client through internal', function(done) {
    var thisLocalClient;
    var edgeInstance;
    var eventData = [];

    startEdge(getSeq.getFirst(), 1)
      .then(instance => {
        edgeInstance = instance;
        return users.add(edgeInstance[0], 'username', 'password');
      })
      .then(function() {
        return startInternal(getSeq.getNext(), 3);
      })
      .then(function() {
        return users.allowDataPath(edgeInstance[0], 'username', 'test/event');
      })
      .then(function() {
        return new Promise(resolve => {
          setTimeout(resolve, 2000);
        });
      })
      .then(function() {
        return testclient.create('username', 'password', getSeq.getPort(3));
      })
      .then(function(client) {
        thisLocalClient = client;
        //first test our broker components methods are directly callable
        return thisLocalClient.data.on('test/event', data => {
          eventData.push(data);
        });
      })
      .then(function() {
        return thisLocalClient.data.set('test/event', { test: 'data' });
      })
      .then(function() {
        return new Promise(resolve => {
          setTimeout(resolve, 2000);
        });
      })
      .then(function() {
        thisLocalClient.disconnect();
        expect(eventData.length).to.be(1);
        done();
      })
      .catch(done);
  });

  function localInstanceConfig(seq, sync, dynamic) {
    var config = baseConfig(seq, sync, true);
    let brokerComponentPath = dynamic
      ? libDir + 'integration-10-broker-component-dynamic'
      : libDir + 'integration-09-broker-component';

    config.cluster = config.cluster || {};
    config.cluster.dependenciesSatisfiedDeferListen = true;
    config.modules = {
      localComponent: {
        path: libDir + 'integration-09-local-component'
      },
      brokerComponent: {
        path: brokerComponentPath
      }
    };
    console.log(JSON.stringify(config, null, 2));
    config.happn.services.orchestrator = {
      config: {
        mininumPeers: config.happn.services.orchestrator.config.minimumPeers,
        replicate: ['test/**']
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
        path: libDir + 'integration-09-remote-component'
      },
      remoteComponent1: {
        path: libDir + 'integration-09-remote-component-1'
      }
    };
    console.log(JSON.stringify(config, null, 2));

    config.cluster = config.cluster || {};
    config.cluster.dependenciesSatisfiedDeferListen = true;
    config.happn.services.orchestrator = {
      config: {
        mininumPeers: config.happn.services.orchestrator.config.minimumPeers,
        replicate: ['test/**']
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

  function stopAndCount(callback, requireResult = false) {
    if (!servers) return callback();
    stopCluster(servers, function() {
      servers.forEach(instance => instance.stop());
      clearMongoCollection('mongodb://localhost', 'happn-cluster', function() {
        if (currentProc) currentProc.kill();
        setTimeout(() => {
          let disconnected =
            adminUserDisconnectionsOnProcess - adminUserDisconnectionsOnProcessAfterLoginChurn;
          return requireResult ? callback(disconnected) : callback();
        }, 3000);
      });
    });
  }

  function startInternal(id, clusterMin, dynamic) {
    return new Promise((resolve, reject) => {
      const instances = [];
      return HappnerCluster.create(remoteInstanceConfig(id, clusterMin, dynamic))
        .then(function(instance) {
          servers.push(instance);
          instances.push(instance);
          return HappnerCluster.create(
            remoteInstanceConfig(getSeq.getNext(), clusterMin + 1, dynamic)
          );
        })
        .then(function(instance) {
          servers.push(instance);
          instances.push(instance);
          setTimeout(() => {
            resolve(instances);
          }, 2000);
        })
        .catch(reject);
    });
  }

  function startEdge(id, clusterMin, dynamic) {
    return new Promise((resolve, reject) => {
      const instances = [];
      return HappnerCluster.create(localInstanceConfig(id, clusterMin, dynamic))
        .then(function(instance) {
          servers.push(instance);
          instances.push(instance);
          return HappnerCluster.create(
            localInstanceConfig(getSeq.getNext(), clusterMin + 1, dynamic)
          );
        })
        .then(function(instance) {
          servers.push(instance);
          instances.push(instance);
          setTimeout(() => {
            resolve(instances);
          }, 2000);
        })
        .catch(reject);
    });
  }

  async function linearStartStopProcess(params, attempts, interval) {
    let lastProc;
    attempts = attempts || 1;
    for (var i = 0; i < attempts; i++) {
      lastProc = await startProcess(params, interval);
    }
    return lastProc;
  }

  function startProcess(params, timeout) {
    return new Promise(function(resolve, reject) {
      try {
        if (currentProc) currentProc.kill();
        wait(500).then(() => {
          var cp = require('child_process');
          var paramsSplit = params.split('membername=');
          var processParams = paramsSplit[0] + 'host=127.0.0.1';
          var forkPath = path.resolve(['test', 'cli', 'cluster-node.js'].join(path.sep));

          currentProc = cp.fork(forkPath, processParams.split(' '), {
            silent: true
          });
          currentProc.stdout.on('data', function(data) {
            var dataString = data.toString();
            if (dataString.indexOf("'_ADMIN' disconnected") > -1)
              adminUserDisconnectionsOnProcess++;
          });
          return setTimeout(function() {
            resolve(currentProc);
          }, timeout);
        });
      } catch (e) {
        reject(e);
      }
    });
  }
});
