var path = require('path');
var HappnerCluster = require('../..');
var Promise = require('bluebird');
var expect = require('expect.js');
var shortid = require('shortid');
var async = require('async');

var libDir = require('../_lib/lib-dir');
var baseConfig = require('../_lib/base-config');
var stopCluster = require('../_lib/stop-cluster');
var clearMongoCollection = require('../_lib/clear-mongo-collection');
var users = require('../_lib/users');
var client = require('../_lib/client');

describe('08 - integration - security sync load', function () {

  var servers = [];
  var userlist = {};
  var eventResults;
  var methodResults;

  function serverConfig(seq, minPeers) {
    var config = baseConfig(seq, minPeers, true);
    config.modules = {
      component1: {
        path: libDir + 'integration-08-component'
      },
      component2: {
        path: libDir + 'integration-08-component'
      },
      component3: {
        path: libDir + 'integration-08-component'
      },
      component4: {
        path: libDir + 'integration-08-component'
      },
      component5: {
        path: libDir + 'integration-08-component'
      }
    };
    config.components = {
      component1: {},
      component2: {},
      component3: {},
      component4: {},
      component5: {}
    };
    return config;
  }

  before('clear mongo collection', function (done) {
    clearMongoCollection('mongodb://localhost', 'happn-cluster', done);
  });

  before('start cluster', function (done) {
    this.timeout(8000);
    HappnerCluster.create(serverConfig(1, 1))
      .then(function (server) {
        servers.push(server);
        return Promise.all([
          HappnerCluster.create(serverConfig(2, 5)),
          HappnerCluster.create(serverConfig(3, 5)),
          HappnerCluster.create(serverConfig(4, 5)),
          HappnerCluster.create(serverConfig(5, 5))
        ]);
      })
      .then(function (_servers) {
        servers = servers.concat(_servers);
      })
      .then(function () {
        done();
      })
      .catch(done);
  });

  before('create users', function (done) {
    var promises = [];
    var username, user, component, method, event;
    for (var i = 0; i < 15; i++) {
      username = shortid.generate();
      user = userlist[username] = {
        allowedMethods: {},
        allowedEvents: {}
      }
      for (var j = 1; j <= 5; j++) {
        component = 'component' + j;
        user.allowedMethods[component] = {};
        user.allowedEvents[component] = {};
        for (var k = 1; k <= 5; k++) {
          method = 'method' + k;
          event = 'event' + k;
          user.allowedMethods[component][method] = true;
          user.allowedEvents[component][event] = true;
        }
      }
      promises.push(
        users.add(servers[0], username, 'password', users.generatePermissions(user))
      );
    }
    Promise.all(promises)
      .then(function () {
        done();
      })
      .catch(done);
  });

  before('connect clients', function (done) {
    var port;
    var i = 0;
    var promises = [];
    for (username in userlist) {
      port = 55000 + (++i % servers.length) + 1;
      promises.push(client.create(username, 'password', port));
    }
    Promise.all(promises)
      .then(function (clients) {
        clients.forEach(function (client) {
          userlist[client.username].client = client;
        });
        done();
      })
      .catch(done);
  });

  before('subscribe to all events', function (done) {
    var username, component, event, user;
    var promises = [];

    function createHandler(username) {
      return function (data) {
        var event = data.event;
        var component = data.component;
        events[username] = events[username] || {};
        events[username][component] = events[username][component] || {};
        events[username][component][event] = true;
      }
    }

    for (username in userlist) {
      user = userlist[username];
      for (component in user.allowedEvents) {
        for (event in user.allowedEvents[component]) {
          promises.push(
            client.subscribe(0, user.client, component, event, createHandler(username))
          )
        }
      }
    }
    Promise.all(promises)
      .then(function (results) {
        for (var i = 0; i < results.length; i++) {
          if (results[i].result != true) return done(new Error('Failed subscription'));
        }
        done();
      })
      .catch(done);

  });

  after('stop clients', function (done) {
    var promises = [];
    for (var username in userlist) {
      promises.push(client.destroy(userlist[username].client));
    }
    Promise.all(promises)
      .then(function () {
        done();
      })
      .catch(done);
  })

  after('stop cluster', function (done) {
    if (!servers) return done();
    stopCluster(servers, done);
  });

  function randomUser() {
    var usernames = Object.keys(userlist);
    var random = Math.round(Math.random() * (usernames.length - 1));
    return usernames[random];
  }

  function randomServer() {
    return servers[Math.round(Math.random() * 4)]
  }

  function randomComponent() {
    return 'component' + (Math.round(Math.random() * 4) + 1);
  }

  function randomMethod() {
    return 'method' + (Math.round(Math.random() * 4) + 1);
  }

  function randomEvent() {
    return 'event' + (Math.round(Math.random() * 4) + 1);
  }

  function randomAdjustPermissions() {
    var server = randomServer();
    var promises = [];
    for (var i = 0; i < 50; i++) {

      var username = randomUser();
      var component = randomComponent();
      var method = randomMethod();
      var event = randomEvent();

      promises.push(users.denyMethod(server, username, component, method));
      delete userlist[username].allowedMethods[component][method];

      promises.push(users.denyEvent(server, username, component, event));
      delete userlist[username].allowedEvents[component][method];

    }

    return Promise.all(promises);
  }

  function useMethodsAndEvents() {
    return new Promise(function (resolve, reject) {
      eventResults = {};



      resolve();
    });
  }

  function testResponses() {
    return new Promise(function (resolve, reject) {
      console.log('testResponses');
      resolve();
    });
  }

  // one at a time
  var queue = async.queue(function (task, callback) {
    if (task.action == 'randomAdjustPermissions') {
      return randomAdjustPermissions()
        .then(function () {
          callback();
        })
        .catch(callback);
    }
    if (task.action == 'useMethodsAndEvents') {
      return useMethodsAndEvents()
        .then(function () {
          callback();
        })
        .catch(callback);
    }
    if (task.action == 'testResponses') {
      return testResponses()
        .then(function () {
          callback();
        })
        .catch(callback);
    }
    callback();
  }, 1);

  function call(action) {
    return new Promise(function (resolve, reject) {
      queue.push({ action: action }, function (e) {
        if (e) return reject(e);
        resolve();
      });
    });
  }

  it('handles repetitive security syncronisations', function (done) {
    this.timeout(20 * 1000);
    var promises = [];

    for (var i = 0; i < 1; i++) {
      promises.push(call('randomAdjustPermissions'));
      promises.push(call('useMethodsAndEvents'));
      promises.push(call('testResponses'));
    }

    Promise.all(promises)
      .then(function () {
        done();
      })
      .catch(done);

  });

});
