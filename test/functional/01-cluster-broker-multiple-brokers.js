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
describe(require('../_lib/test-helper').testName(__filename, 3), function() {
  this.timeout(600000);
  const previousLogLevel = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = 'info';
  var servers = [];
  let currentProc;

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
    config.happn.services.orchestrator = {
      config: {
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
    config.cluster = config.cluster || {};
    config.cluster.dependenciesSatisfiedDeferListen = true;
    config.happn.services.orchestrator = {
      config: {
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

  beforeEach('clear mongo collection', function(done) {
    stopCluster(servers, function(e) {
      if (e) return done(e);
      servers = [];
      clearMongoCollection('mongodb://localhost', 'happn-cluster', function() {
        done();
      });
    });
  });

  afterEach('stop cluster', function(done) {
    if (!servers) return done();
    stopCluster(servers, function() {
      clearMongoCollection('mongodb://localhost', 'happn-cluster', function() {
        if (currentProc) currentProc.kill();
        setTimeout(() => {
          console.log(
            'disconnected _ADMIN sessions',
            adminUserDisconnectionsOnProcess - adminUserDisconnectionsOnProcessAfterLoginChurn
          );
          done();
        }, 5000);
      });
    });
  });

  function startInternal(id, clusterMin, dynamic) {
    return new Promise((resolve, reject) => {
      const instances = [];
      return HappnerCluster.create(remoteInstanceConfig(id, clusterMin, dynamic))
        .then(function(instance) {
          servers.push(instance);
          instances.push(instance);
          return HappnerCluster.create(remoteInstanceConfig(id + 1, clusterMin + 1, dynamic));
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
          return HappnerCluster.create(localInstanceConfig(id + 1, clusterMin + 1, dynamic));
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

  var adminUserDisconnectionsOnProcess = 0;
  var adminUserDisconnectionsOnProcessAfterLoginChurn = 0;

  function startProcess(params, timeout) {
    return new Promise(function(resolve, reject) {
      try {
        if (currentProc) currentProc.kill();
        var cp = require('child_process');
        var paramsSplit = params.split('membername=');
        var processParams = paramsSplit[0] + 'host=127.0.0.1';
        var forkPath = path.resolve(['test', 'cli', 'cluster-node.js'].join(path.sep));
        currentProc = cp.fork(forkPath, processParams.split(' '), {
          silent: true
        });
        currentProc.stdout.on('data', function(data) {
          var dataString = data.toString();
          if (dataString.indexOf("'_ADMIN' disconnected") > -1) adminUserDisconnectionsOnProcess++;
        });
        return setTimeout(function() {
          resolve(currentProc);
        }, timeout);
      } catch (e) {
        reject(e);
      }
    });
  }

  context('exchange', function() {
    it('we test brokered descriptions are ignored', function(done) {
      const capturedLogs = [];
      const intercept = require('intercept-stdout');
      const unhook_intercept = intercept(function(txt) {
        capturedLogs.push(txt);
      });
      var thisClient;
      var thisLocalClient;
      var gotToFinalAttempt = false;
      var edgeInstance;

      startEdge(1, 1)
        .then(instance => {
          edgeInstance = instance;
          return new Promise((resolve, reject) => {
            testclient
              .create('username', 'password', 55001)
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
          return startInternal(3, 3);
        })
        .then(function() {
          return users.allowMethod(edgeInstance[0], 'username', 'brokerComponent', 'directMethod');
        })
        .then(function() {
          return users.allowMethod(
            edgeInstance[0],
            'username',
            'remoteComponent',
            'brokeredMethod1'
          );
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
          return testclient.create('username', 'password', 55003);
        })
        .then(function(client) {
          thisLocalClient = client;
          //first test our broker components methods are directly callable
          return thisLocalClient.event.remoteComponent1.on('test/event');
        })
        .then(function(handle) {
          console.log(handle);
          return thisLocalClient.exchange.remoteComponent.attachToEvent();
        })
        .then(function(handle) {
          console.log(handle);
          thisLocalClient.disconnect();
          return testclient.create('username', 'password', 55001);
        })
        .then(function(client) {
          thisClient = client;
          //first test our broker components methods are directly callable
          return thisClient.exchange.brokerComponent.directMethod();
        })
        .then(function(result) {
          expect(result).to.be('MESH_1:brokerComponent:directMethod');
          //call an injected method
          return thisClient.exchange.remoteComponent.brokeredMethod1();
        })
        .then(function(result) {
          expect(result).to.be('MESH_3:remoteComponent:brokeredMethod1');
          return thisClient.exchange.remoteComponent1.brokeredMethod1();
        })
        .then(function(result) {
          expect(result).to.be('MESH_3:remoteComponent1:brokeredMethod1');
          return users.denyMethod(
            edgeInstance[0],
            'username',
            'remoteComponent',
            'brokeredMethod1'
          );
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
                port: 55001,
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
            '1 (HappnerClient) ignoring brokered description for peer: MESH_2\n',
            '2 (HappnerClient) ignoring brokered description for peer: MESH_1\n',
            '3 (HappnerClient) ignoring brokered description for peer: MESH_1\n',
            '3 (HappnerClient) ignoring brokered description for peer: MESH_2\n',
            '4 (HappnerClient) ignoring brokered description for peer: MESH_1\n',
            '4 (HappnerClient) ignoring brokered description for peer: MESH_2\n'
          ]);
          process.env.LOG_LEVEL = previousLogLevel;
          setTimeout(done, 2000);
        });
    });

    it('we tests brokered data events - client through internal', function(done) {
      var thisLocalClient;
      var edgeInstance;
      var eventData = [];

      startEdge(1, 1)
        .then(instance => {
          edgeInstance = instance;
          return users.add(edgeInstance[0], 'username', 'password');
        })
        .then(function() {
          return startInternal(3, 3);
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
          return testclient.create('username', 'password', 55003);
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
          expect(eventData.length).to.be(1);
          done();
        })
        .catch(done);
    });

    it('we tests brokered data events -  internal originator replicated to broker', function(done) {
      var internalClient, brokerClient, brokerClient1, processClient;
      var edgeInstance;
      var internalEventData = [];
      var brokerEventData = [];
      var brokerEventData1 = [];
      var processEventData = [];

      startEdge(1, 1)
        .then(instance => {
          edgeInstance = instance;
          return users.add(edgeInstance[0], 'username', 'password');
        })
        .then(function() {
          return startInternal(3, 3);
        })
        .then(function() {
          console.log('STARTED UP TEST CLUSTER:::');
          return new Promise(resolve => {
            setTimeout(resolve, 5000);
          });
        })
        .then(function() {
          return users.allowDataPath(edgeInstance[0], 'username', 'test/event/*');
        })
        .then(function() {
          return linearStartStopProcess(
            'hosts=127.0.0.1:56001 port=55005 proxyport=57005 membershipport=56005 seed=false secure=true joinTimeout=300 membername=external-1',
            10,
            2000
          );
        })
        .then(function() {
          console.log('STARTED UP PROCESS CLUSTER:::');
          adminUserDisconnectionsOnProcessAfterLoginChurn = adminUserDisconnectionsOnProcess;
          return new Promise(resolve => {
            setTimeout(resolve, 5000);
          });
        })
        .then(function() {
          console.log('CONNECT PROCESS CLIENT');
          return testclient.create('username', 'password', 55005);
        })
        .then(function(client) {
          processClient = client;
          //first test our broker components methods are directly callable
          return processClient.data.on('test/event/*', data => {
            processEventData.push(data);
          });
        })
        .then(function() {
          return testclient.create('username', 'password', 55003);
        })
        .then(function(client) {
          internalClient = client;
          //first test our broker components methods are directly callable
          return internalClient.data.on('test/event/*', data => {
            internalEventData.push(data);
          });
        })
        .then(function() {
          return testclient.create('username', 'password', 55001);
        })
        .then(function(client) {
          brokerClient = client;
          //first test our broker components methods are directly callable
          return brokerClient.data.on('test/event/*', data => {
            brokerEventData.push(data);
          });
        })
        .then(function() {
          return testclient.create('username', 'password', 55002);
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
            setTimeout(resolve, 5000);
          });
        })
        .then(function() {
          console.log(
            JSON.stringify([internalEventData, brokerEventData, brokerEventData1], null, 2)
          );
          expect(brokerEventData.length).to.be(2);
          expect(brokerEventData1.length).to.be(2);
          expect(internalEventData.length).to.be(2);
          expect(processEventData.length).to.be(2);
          done();
        })
        .catch(done);
    });
  });
});
