const HappnerCluster = require('../..');
const HappnerClient = require('happner-client');
var Promise = require('bluebird');
var expect = require('expect.js');

const libDir = require('../_lib/lib-dir');
const baseConfig = require('../_lib/base-config');
const stopCluster = require('../_lib/stop-cluster');
const users = require('../_lib/users');
const testclient = require('../_lib/client');
const delay = require('await-delay');
const getSeq = require('../_lib/helpers/getSeq');

const clearMongoCollection = require('../_lib/clear-mongo-collection');
//var log = require('why-is-node-running');
describe(require('../_lib/test-helper').testName(__filename, 3), function() {
  const servers = [];
  let localInstance;
  this.timeout(20000);

  beforeEach('clear mongo collection', function(done) {
    this.timeout(20000);
    stopCluster(servers, function(e) {
      if (e) return done(e);
      servers.splice(0, servers.length);
      clearMongoCollection('mongodb://localhost', 'happn-cluster', function() {
        done();
      });
    });
  });

  after('stop cluster', function(done) {
    this.timeout(20000);
    stopCluster(servers, function() {
      clearMongoCollection('mongodb://localhost', 'happn-cluster', function() {
        done();
      });
    });
  });

  context('exchange', function() {
    it('starts the cluster internal first, connects a client to the local instance, and is able to access the remote component via the broker', function(done) {
      var thisClient;

      startClusterInternalFirst(false)
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
          return new Promise(resolve => {
            setTimeout(resolve, 5000);
          });
        })
        .then(function() {
          return testclient.create('username', 'password', getSeq.getPort(2));
        })
        .then(function(client) {
          thisClient = client;
          //first test our broker components methods are directly callable
          return thisClient.exchange.brokerComponent.directMethod();
        })
        .then(function(result) {
          expect(result).to.be(getSeq.getMeshName(2) + ':brokerComponent:directMethod');
          return thisClient.exchange.remoteComponent1.brokeredMethod1();
        })
        .then(function(result) {
          expect(result).to.be(getSeq.getMeshName(1) + ':remoteComponent1:brokeredMethod1');
          return thisClient.exchange.remoteComponent.brokeredMethod1();
        })
        .then(function(result) {
          expect(result).to.be(getSeq.getMeshName(1) + ':remoteComponent:brokeredMethod1');
          setTimeout(done, 2000);
        })
        .catch(done);
    });

    it('starts the cluster internal first, connects a client to the local instance, and is able to access the remote component via the broker, check we cannot access denied methods', function(done) {
      var thisClient;

      var gotToFinalAttempt = false;

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
          return testclient.create('username', 'password', getSeq.getPort(2));
        })
        .then(function(client) {
          thisClient = client;
          //first test our broker components methods are directly callable
          return thisClient.exchange.brokerComponent.directMethod();
        })
        .then(function(result) {
          expect(result).to.be(getSeq.getMeshName(2) + ':brokerComponent:directMethod');
          //call an injected method
          return thisClient.exchange.remoteComponent.brokeredMethod1();
        })
        .then(function(result) {
          expect(result).to.be(getSeq.getMeshName(1) + ':remoteComponent:brokeredMethod1');
          return thisClient.exchange.remoteComponent1.brokeredMethod1();
        })
        .then(function(result) {
          expect(result).to.be(getSeq.getMeshName(1) + ':remoteComponent1:brokeredMethod1');
          return testRestCall(
            thisClient.data.session.token,
            getSeq.getPort(2),
            'remoteComponent1',
            'brokeredMethod1',
            null,
            getSeq.getMeshName(1) + ':remoteComponent1:brokeredMethod1:true'
          );
        })
        .then(function() {
          return users.denyMethod(localInstance, 'username', 'remoteComponent', 'brokeredMethod1');
        })
        .then(function() {
          gotToFinalAttempt = true;
          return thisClient.exchange.remoteComponent.brokeredMethod1();
        })
        .catch(function(e) {
          expect(gotToFinalAttempt).to.be(true);
          expect(e.toString()).to.be('AccessDenied: unauthorized');
          setTimeout(done, 2000);
        });
    });

    it('starts up the edge cluster node first, we than start the internal node (with brokered component), pause and then assert we are able to run the brokered method', function(done) {
      startClusterEdgeFirst()
        .then(function() {
          return users.allowMethod(localInstance, 'username', 'brokerComponent', 'directMethod');
        })
        .then(function() {
          return users.allowMethod(localInstance, 'username', 'remoteComponent', 'brokeredMethod1');
        })
        .then(function() {
          return new Promise(function(resolve) {
            setTimeout(resolve, 5000);
          });
        })
        .then(function() {
          return testclient.create('username', 'password', getSeq.getPort(1));
        })
        .then(function(client) {
          //first test our broker components methods are directly callable
          client.exchange.brokerComponent.directMethod(function(e, result) {
            expect(e).to.be(null);
            expect(result).to.be(getSeq.getMeshName(1) + ':brokerComponent:directMethod');
            //call an injected method
            client.exchange.remoteComponent.brokeredMethod1(function(e, result) {
              expect(e).to.be(null);
              expect(result).to.be(getSeq.getMeshName(2) + ':remoteComponent:brokeredMethod1');
              setTimeout(done, 2000);
            });
          });
        })
        .catch(done);
    });

    it('starts up the edge cluster node first, we then start the internal node (with brokered component), pause and then assert we are able to run a brokered method with an argument', function(done) {
      startClusterEdgeFirst()
        .then(function() {
          return users.allowMethod(localInstance, 'username', 'brokerComponent', 'directMethod');
        })
        .then(function() {
          return users.allowMethod(localInstance, 'username', 'remoteComponent', 'brokeredMethod3');
        })
        .then(function() {
          return new Promise(function(resolve) {
            setTimeout(resolve, 5000);
          });
        })
        .then(function() {
          return testclient.create('username', 'password', getSeq.getPort(1));
        })
        .then(function(client) {
          client.exchange.remoteComponent.brokeredMethod3('test', function(e, result) {
            expect(e).to.be(null);
            expect(result).to.be(getSeq.getMeshName(2) + ':remoteComponent:brokeredMethod3:test');
            setTimeout(done, 2000);
          });
        })
        .catch(done);
    });

    it('starts up the edge cluster node first, we then start the internal node (with brokered component), pause and then assert we are able to run a brokered method with an argument, with the correct origin', function(done) {
      startClusterEdgeFirst()
        .then(function() {
          return users.allowMethod(localInstance, 'username', 'brokerComponent', 'directMethod');
        })
        .then(function() {
          return users.allowMethod(localInstance, 'username', 'remoteComponent', 'brokeredMethod3');
        })
        .then(function() {
          return users.allowMethod(
            localInstance,
            'username',
            'remoteComponent1',
            'brokeredMethod3'
          );
        })
        .then(function() {
          return new Promise(function(resolve) {
            setTimeout(resolve, 5000);
          });
        })
        .then(function() {
          return testclient.create('username', 'password', getSeq.getPort(1));
        })
        .then(function(client) {
          client.exchange.remoteComponent1.brokeredMethod3('test', function(e, result) {
            expect(e).to.be(null);
            expect(result).to.be(
              getSeq.getMeshName(2) + ':remoteComponent1:brokeredMethod3:test:username'
            );
            setTimeout(done, 2000);
          });
        })
        .catch(done);
    });

    it('starts up the internal cluster node first, we then start the internal node (with brokered component), pause and then assert we are able to run a brokered method with an argument, with the correct origin', function(done) {
      startClusterInternalFirst()
        .then(function() {
          return users.allowMethod(localInstance, 'username', 'brokerComponent', 'directMethod');
        })
        .then(function() {
          return users.allowMethod(localInstance, 'username', 'remoteComponent', 'brokeredMethod3');
        })
        .then(function() {
          return users.allowMethod(
            localInstance,
            'username',
            'remoteComponent1',
            'brokeredMethod3'
          );
        })
        .then(function() {
          return new Promise(function(resolve) {
            setTimeout(resolve, 5000);
          });
        })
        .then(function() {
          return testclient.create('username', 'password', getSeq.getPort(1));
        })
        .then(function(client) {
          client.exchange.remoteComponent1.brokeredMethod3('test', function(e, result) {
            expect(e).to.be(null);
            expect(result).to.be(
              getSeq.getMeshName(1) + ':remoteComponent1:brokeredMethod3:test:username'
            );
            setTimeout(done, 2000);
          });
        })
        .catch(done);
    });

    it('starts up the internal cluster node first, we then start the internal node (with brokered component), pause and then assert we are able to run a brokered method, we then shutdown the brokered instance, run the same method and get the correct error', function(done) {
      let testClient;

      startClusterInternalFirst()
        .then(function() {
          return users.allowMethod(localInstance, 'username', 'brokerComponent', 'directMethod');
        })
        .then(function() {
          return users.allowMethod(localInstance, 'username', 'remoteComponent', 'brokeredMethod3');
        })
        .then(function() {
          return users.allowMethod(
            localInstance,
            'username',
            'remoteComponent1',
            'brokeredMethod3'
          );
        })
        .then(function() {
          return new Promise(function(resolve) {
            setTimeout(resolve, 2000);
          });
        })
        .then(function() {
          return testclient.create('username', 'password', getSeq.getPort(2));
        })
        .then(function(client) {
          testClient = client;
          return testClient.exchange.remoteComponent1.brokeredMethod3('test');
        })
        .then(function(result) {
          expect(result).to.be(
            getSeq.getMeshName(1) + ':remoteComponent1:brokeredMethod3:test:username'
          );
          return new Promise((resolve, reject) => {
            localInstance.stop(e => {
              if (e) return reject(e);
              setTimeout(resolve, 2000);
            });
          });
        })
        .then(function() {
          return testClient.exchange.remoteComponent1.brokeredMethod3('test');
        })
        .catch(function(e) {
          expect(e.message).to.be('Not implemented remoteComponent1:^2.0.0:brokeredMethod3');
          done();
        });
    });

    it('starts up the internal cluster node first, we then start 2 the internal nodes in a high availability configuration, pause and then assert we are able to run a brokered methods and they are load balanced, we then shutdown a brokered instance, and are able to run the same method on the remaining instance', function(done) {
      let testClient,
        results = [];

      startClusterEdgeFirstHighAvailable()
        .then(function() {
          return users.allowMethod(localInstance, 'username', 'brokerComponent', 'directMethod');
        })
        .then(function() {
          return users.allowMethod(localInstance, 'username', 'remoteComponent', 'brokeredMethod3');
        })
        .then(function() {
          return users.allowMethod(
            localInstance,
            'username',
            'remoteComponent1',
            'brokeredMethod3'
          );
        })
        .then(function() {
          return new Promise(function(resolve) {
            setTimeout(resolve, 2000);
          });
        })
        .then(function() {
          return testclient.create('username', 'password', getSeq.getPort(1));
        })
        .then(function(client) {
          testClient = client;
          return testClient.exchange.remoteComponent1.brokeredMethod3('test');
        })
        .then(function(result) {
          results.push(result);
          return testClient.exchange.remoteComponent1.brokeredMethod3('test');
        })
        .then(function(result) {
          results.push(result);
          return testClient.exchange.remoteComponent1.brokeredMethod3('test');
        })
        .then(function(result) {
          results.push(result);
          return testClient.exchange.remoteComponent1.brokeredMethod3('test');
        })
        .then(function() {
          return new Promise((resolve, reject) => {
            localInstance.stop(e => {
              if (e) return reject(e);
              setTimeout(resolve, 2000);
            });
          });
        })
        .then(function() {
          return testClient.exchange.remoteComponent1.brokeredMethod3('test');
        })
        .then(function(result) {
          results.push(result);
          return testClient.exchange.remoteComponent1.brokeredMethod3('test');
        })
        .then(function(result) {
          results.push(result);
          return testClient.exchange.remoteComponent1.brokeredMethod3('test');
        })
        .then(function(result) {
          results.push(result);
          return testClient.exchange.remoteComponent1.brokeredMethod3('test');
        })
        .then(function(result) {
          results.push(result);
          expect(results).to.eql([
            //round robin happening
            getSeq.getMeshName(2) + ':remoteComponent1:brokeredMethod3:test:username',
            getSeq.getMeshName(3) + ':remoteComponent1:brokeredMethod3:test:username',
            getSeq.getMeshName(2) + ':remoteComponent1:brokeredMethod3:test:username',
            getSeq.getMeshName(3) + ':remoteComponent1:brokeredMethod3:test:username',
            //now only mesh 3 is up, so it handles all method calls
            getSeq.getMeshName(3) + ':remoteComponent1:brokeredMethod3:test:username',
            getSeq.getMeshName(3) + ':remoteComponent1:brokeredMethod3:test:username',
            getSeq.getMeshName(3) + ':remoteComponent1:brokeredMethod3:test:username'
          ]);
          done();
        })
        .catch(done);
    });

    it('injects the correct amount of brokered elements, even when brokered cluster nodes are dropped and restarted', function(done) {
      this.timeout(40000);

      startClusterEdgeFirstHighAvailable()
        .then(() => {
          return Promise.delay(5000);
        })
        .then(function() {
          expect(getInjectedElements(getSeq.getMeshName(1) + '').length).to.be(4);
          expect(getInjectedElements(getSeq.getMeshName(1) + '')[0].meshName != null).to.be(true);
          expect(getInjectedElements(getSeq.getMeshName(1) + '')[1].meshName != null).to.be(true);
          expect(getInjectedElements(getSeq.getMeshName(1) + '')[2].meshName != null).to.be(true);
          expect(getInjectedElements(getSeq.getMeshName(1) + '')[3].meshName != null).to.be(true);
          return stopServer(servers[1]);
        })
        .then(() => {
          return Promise.delay(3000);
        })
        .then(function() {
          //we check injected components is 1
          expect(getInjectedElements(getSeq.getMeshName(1) + '').length).to.be(2);
          expect(getInjectedElements(getSeq.getMeshName(1) + '')[0].meshName != null).to.be(true);
          expect(getInjectedElements(getSeq.getMeshName(1) + '')[1].meshName != null).to.be(true);
          return stopServer(servers[2]);
        })
        .then(() => {
          return Promise.delay(3000);
        })
        .then(function() {
          //we check injected components is still 1 and injected component meshName is null
          expect(getInjectedElements(getSeq.getMeshName(1) + '').length).to.be(2);
          expect(getInjectedElements(getSeq.getMeshName(1) + '')[0].meshName == null).to.be(true);
          expect(getInjectedElements(getSeq.getMeshName(1) + '')[1].meshName == null).to.be(true);
          return startInternal(getSeq.getNext(), 2);
        })
        .then(() => {
          return Promise.delay(5000);
        })
        .then(function() {
          //we check injected components is still 1 and injected component meshName is null
          expect(getInjectedElements(getSeq.getMeshName(1) + '').length).to.be(2);
          expect(getInjectedElements(getSeq.getMeshName(1) + '')[0].meshName != null).to.be(true);
          expect(getInjectedElements(getSeq.getMeshName(1) + '')[1].meshName != null).to.be(true);
          return startInternal(getSeq.getNext(), 3);
        })
        .then(() => {
          return Promise.delay(5000);
        })
        .then(function() {
          //we check injected components is 2
          //we check injected components is still 1 and injected component meshName is null
          expect(getInjectedElements(getSeq.getMeshName(1) + '').length).to.be(4);
          expect(getInjectedElements(getSeq.getMeshName(1) + '')[0].meshName != null).to.be(true);
          expect(getInjectedElements(getSeq.getMeshName(1) + '')[1].meshName != null).to.be(true);
          done();
        })
        .catch(done);
    });
  });

  context('events', function() {
    it('connects a client to the local instance, and is able to access the remote component events via the broker', function(done) {
      startClusterInternalFirst()
        .then(function() {
          return users.allowMethod(localInstance, 'username', 'brokerComponent', 'directMethod');
        })
        .then(function() {
          return users.allowMethod(
            localInstance,
            'username',
            'remoteComponent',
            'brokeredEventEmitMethod'
          );
        })
        .then(function() {
          return users.allowEvent(localInstance, 'username', 'remoteComponent', '/brokered/event');
        })
        .then(function() {
          return testclient.create('username', 'password', getSeq.getPort(2));
        })
        .then(function(client) {
          //first test our broker components methods are directly callable
          client.exchange.brokerComponent.directMethod(function(e, result) {
            expect(e).to.be(null);
            expect(result).to.be(getSeq.getMeshName(2) + ':brokerComponent:directMethod');

            client.event.remoteComponent.on(
              '/brokered/event',
              function(data) {
                expect(data).to.eql({
                  brokered: { event: { data: { from: getSeq.getMeshName(1) + '' } } }
                });
                setTimeout(done, 2000);
              },
              function(e) {
                expect(e).to.be(null);
                client.exchange.remoteComponent.brokeredEventEmitMethod(function(e, result) {
                  expect(e).to.be(null);
                  expect(result).to.be(
                    getSeq.getMeshName(1) + ':remoteComponent:brokeredEventEmitMethod'
                  );
                });
              }
            );
          });
        })
        .catch(done);
    });
  });
  context('happner-client', function() {
    it('does a comprehensive test using the happner-client', function(done) {
      startClusterEdgeFirst()
        .then(function() {
          return delay(5000);
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
          return users.allowWebMethod(localInstance, 'username', '/remoteComponent1/testJSON');
        })
        .then(function() {
          return users.allowEvent(localInstance, 'username', 'remoteComponent1', 'test/*');
        })
        .then(function() {
          return connectHappnerClient('username', 'password', getSeq.getPort(1));
        })
        .then(function(client) {
          return testHappnerClient(client);
        })
        .then(function(client) {
          client.disconnect(done);
        })
        .catch(done);
    });
  });
  context('errors', function() {
    it('ensures an error is raised if we are injecting internal components with duplicate names', function(done) {
      HappnerCluster.create(errorInstanceConfigDuplicateBrokered(getSeq.getFirst(), 1))
        .then(function() {
          done(new Error('unexpected success'));
        })
        .catch(function(e) {
          expect(e.toString()).to.be(
            'Error: Duplicate attempts to broker the remoteComponent component by brokerComponent & brokerComponentDuplicate'
          );
          setTimeout(done, 2000);
        });
    });

    it('ensures an error is handled and returned accordingly if we execute an internal components failing method using a callback', function(done) {
      startClusterInternalFirst()
        .then(function() {
          return users.allowMethod(
            localInstance,
            'username',
            'remoteComponent',
            'brokeredMethodFail'
          );
        })
        .then(function() {
          return testclient.create('username', 'password', getSeq.getPort(2));
        })
        .then(function(client) {
          //first test our broker components methods are directly callable
          client.exchange.remoteComponent.brokeredMethodFail(function(e) {
            expect(e.toString()).to.be('Error: test error');
            setTimeout(done, 2000);
          });
        })
        .catch(done);
    });

    it('ensures an error is handled and returned accordingly if we execute an internal components failing method using a promise', function(done) {
      startClusterInternalFirst()
        .then(function() {
          return users.allowMethod(
            localInstance,
            'username',
            'remoteComponent',
            'brokeredMethodFail'
          );
        })
        .then(function() {
          return testclient.create('username', 'password', getSeq.getPort(2));
        })
        .then(function(client) {
          //first test our broker components methods are directly callable
          return client.exchange.remoteComponent.brokeredMethodFail();
        })
        .catch(function(e) {
          expect(e.toString()).to.be('Error: test error');
          done();
        });
    });

    it('ensures an error is handled and returned accordingly if we execute an internal components method that times out', function(done) {
      this.timeout(20000);

      startClusterInternalFirst()
        .then(function() {
          return users.allowMethod(
            localInstance,
            'username',
            'remoteComponent',
            'brokeredMethodTimeout'
          );
        })
        .then(function() {
          return testclient.create('username', 'password', getSeq.getPort(2));
        })
        .then(function(client) {
          //first test our broker components methods are directly callable
          return client.exchange.remoteComponent.brokeredMethodTimeout();
        })
        .catch(function(e) {
          expect(e.toString()).to.be('Request timed out');
          done();
        });
    });

    it('ensures an error is handled and returned accordingly if we execute a method that does not exist on the cluster mesh yet', function(done) {
      startClusterEdgeFirst()
        .then(function() {
          return users.allowMethod(localInstance, 'username', 'brokerComponent', 'directMethod');
        })
        .then(function() {
          return users.allowMethod(localInstance, 'username', 'remoteComponent', 'brokeredMethod1');
        })
        .then(function() {
          return testclient.create('username', 'password', getSeq.getPort(1));
        })
        .then(function(client) {
          return client.exchange.remoteComponent.brokeredMethod1();
        })
        .catch(function(e) {
          expect(e.toString()).to.be(
            'Error: Not implemented remoteComponent:^2.0.0:brokeredMethod1'
          );
          setTimeout(done, 2000);
        });
    });
  });

  context('rest', function() {
    it('does a rest call', function(done) {
      var thisClient;
      startClusterInternalFirst()
        .then(function() {
          return users.allowMethod(
            localInstance,
            'username',
            'remoteComponent1',
            'brokeredMethod1'
          );
        })
        .then(function() {
          return testclient.create('username', 'password', getSeq.getPort(2));
        })
        .then(function(client) {
          thisClient = client;
          return testRestCall(
            thisClient.data.session.token,
            getSeq.getPort(2),
            'remoteComponent1',
            'brokeredMethod1',
            null,
            getSeq.getMeshName(1) + ':remoteComponent1:brokeredMethod1:true'
          );
        })
        .then(done);
    });
  });

  function doRequest(path, token, port, callback) {
    var request = require('request');
    var options;

    options = {
      url: `http://127.0.0.1:${port}${path}?happn_token=${token}`
    };

    request(options, function(error, response, body) {
      callback(error, {
        response,
        body
      });
    });
  }

  function testRestCall(token, port, component, method, params, expectedResponse) {
    return new Promise((resolve, reject) => {
      var restClient = require('restler');

      var operation = {
        parameters: params || {}
      };

      var options = { headers: {} };
      options.headers.authorization = 'Bearer ' + token;

      restClient
        .postJson(`http://localhost:${port}/rest/method/${component}/${method}`, operation, options)
        .on('complete', function(result) {
          if (result.error) return reject(new Error(result.error));
          expect(result.data).to.eql(expectedResponse);
          resolve();
        });
    });
  }

  function testWebCall(client, path, port) {
    return new Promise(resolve => {
      doRequest(path, client.token, port, function(e, response) {
        if (e)
          return resolve({
            error: e
          });
        resolve(response);
      });
    });
  }

  function testHappnerClient(client) {
    return new Promise((resolve, reject) => {
      const api = { data: client.dataClient() };
      getDescription(api)
        .then(schema => {
          api.happner = client.construct(schema.components);
          api.token = api.data.session.token;
          api.happner.event.remoteComponent1.on('test/*', () => {
            resolve(client);
          });
          return testWebCall(api, '/remoteComponent1/testJSON', getSeq.getPort(1));
        })
        .then(result => {
          expect(JSON.parse(result.body)).to.eql({
            test: 'data'
          });
          return api.happner.exchange.remoteComponent1.brokeredMethod1();
        })
        .catch(reject);
    });
  }

  function getDescription(api) {
    return new Promise((resolve, reject) => {
      api.data.get('/mesh/schema/description', (e, schema) => {
        if (e) return reject(e);
        return resolve(schema);
      });
    });
  }

  function connectHappnerClient(username, password, port) {
    return new Promise((resolve, reject) => {
      const client = new HappnerClient();
      client.connect(
        null,
        {
          username,
          password,
          port
        },
        e => {
          if (e) return reject(e);
          resolve(client);
        }
      );
    });
  }

  function stopServer(server) {
    return server.stop({ reconnect: false }).then(function() {
      // stopping all at once causes replicator client happn logouts to timeout
      // because happn logout attempts unsubscribe on server, and all servers
      // are gone
      return Promise.delay(200); // ...so pause between stops (long for travis)
    });
  }
  function localInstanceConfig(seq, sync, dynamic) {
    var config = baseConfig(seq, sync, true);
    config.authorityDelegationOn = true;
    let brokerComponentPath = dynamic
      ? libDir + 'integration-10-broker-component-dynamic'
      : libDir + 'integration-09-broker-component';
    config.modules = {
      localComponent: {
        path: libDir + 'integration-09-local-component'
      },
      brokerComponent: {
        path: brokerComponentPath
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

  function errorInstanceConfigDuplicateBrokered(seq, sync) {
    var config = baseConfig(seq, sync, true);
    config.modules = {
      localComponent: {
        path: libDir + 'integration-09-local-component'
      },
      brokerComponent: {
        path: libDir + 'integration-09-broker-component'
      },
      brokerComponentDuplicate: {
        path: libDir + 'integration-09-broker-component-1'
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
      },
      brokerComponentDuplicate: {
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
    config.components = {
      remoteComponent: {
        startMethod: 'start',
        stopMethod: 'stop'
      },
      remoteComponent1: {
        startMethod: 'start',
        stopMethod: 'stop',
        web: {
          routes: {
            testJSON: ['testJSON'],
            testJSONSticky: ['testJSONSticky']
          }
        }
      }
    };
    return config;
  }

  async function startInternal(id, clusterMin) {
    const server = await HappnerCluster.create(remoteInstanceConfig(id, clusterMin));
    servers.push(server);
    return server;
  }

  async function startEdge(id, clusterMin, dynamic) {
    const server = await HappnerCluster.create(localInstanceConfig(id, clusterMin, dynamic));
    servers.push(server);
    return server;
  }

  function startClusterEdgeFirstHighAvailable(dynamic) {
    return new Promise(function(resolve, reject) {
      startEdge(getSeq.getFirst(), 1, dynamic)
        .then(function() {
          return startInternal(getSeq.getNext(), 2);
        })
        .then(function(server) {
          localInstance = server;
          return startInternal(getSeq.getNext(), 3);
        })
        .then(function() {
          return users.add(localInstance, 'username', 'password');
        })
        .then(resolve)
        .catch(reject);
    });
  }

  function startClusterInternalFirst(dynamic) {
    return new Promise(function(resolve, reject) {
      startInternal(getSeq.getFirst(), 1)
        .then(function(server) {
          localInstance = server;
          return startEdge(getSeq.getNext(), 2, dynamic);
        })
        .then(function() {
          return users.add(localInstance, 'username', 'password');
        })
        .then(function() {
          setTimeout(resolve, 2000);
        })
        .catch(reject);
    });
  }

  function startClusterEdgeFirst(dynamic) {
    return new Promise(function(resolve, reject) {
      startEdge(getSeq.getFirst(), 1, dynamic)
        .then(function() {
          return startInternal(getSeq.getNext(), 2);
        })
        .then(function(server) {
          localInstance = server;
          return users.add(localInstance, 'username', 'password');
        })
        .then(resolve)
        .catch(reject);
    });
  }

  function getInjectedElements(meshName) {
    const brokerageInstance = require('../../lib/brokerage').instance(meshName);
    if (!brokerageInstance) return null;
    return brokerageInstance.__injectedElements;
  }
});
