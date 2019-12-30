var Happner = require("happner-2");
var HappnerCluster = require("../..");
var Promise = require("bluebird");
var expect = require("expect.js");

var libDir = require("../_lib/lib-dir");
var baseConfig = require("../_lib/base-config");
var stopCluster = require("../_lib/stop-cluster");
var clearMongoCollection = require("../_lib/clear-mongo-collection");
var users = require("../_lib/users");
var client = require("../_lib/client");

describe(require("../_lib/test-helper").testName(__filename, 3), function() {
  this.timeout(20000);

  var servers = [],
    client1,
    client2;

  function serverConfig(seq, minPeers) {
    var config = baseConfig(seq, minPeers, true);
    config.modules = {
      component1: {
        path: libDir + "integration-07-component"
      }
    };
    config.components = {
      component1: {}
    };
    return config;
  }

  before("clear mongo collection", function(done) {
    clearMongoCollection("mongodb://localhost", "happn-cluster", done);
  });

  before("start cluster", function(done) {
    this.timeout(20000);
    HappnerCluster.create(serverConfig(1, 1))
      .then(function(server) {
        servers.push(server);
        return HappnerCluster.create(serverConfig(2, 2));
      })
      .then(function(server) {
        servers.push(server);
        return users.add(servers[0], "username", "password");
      })
      .then(function() {
        done();
      })
      .catch(done);
  });

  before("start client1", function(done) {
    client
      .create("username", "password", 55001)
      .then(function(client) {
        client1 = client;
        done();
      })
      .catch(done);
  });

  before("start client2", function(done) {
    client
      .create("username", "password", 55002)
      .then(function(client) {
        client2 = client;
        done();
      })
      .catch(done);
  });

  after("stop client 1", function(done) {
    client1.disconnect(done);
  });

  after("stop client 2", function(done) {
    client2.disconnect(done);
  });

  after("stop cluster", function(done) {
    if (!servers) return done();
    stopCluster(servers, done);
  });

  it("handles security sync for methods", function(done) {
    this.timeout(20 * 1000);

    Promise.all([
      client.callMethod(1, client1, "component1", "method1"),
      client.callMethod(2, client1, "component1", "method2"),
      client.callMethod(3, client2, "component1", "method1"),
      client.callMethod(4, client2, "component1", "method2")
    ])

      .then(function(results) {
        expect(results).to.eql([
          {
            seq: 1,
            user: "username",
            component: "component1",
            method: "method1",
            error: "unauthorized"
          },
          {
            seq: 2,
            user: "username",
            component: "component1",
            method: "method2",
            error: "unauthorized"
          },
          {
            seq: 3,
            user: "username",
            component: "component1",
            method: "method1",
            error: "unauthorized"
          },
          {
            seq: 4,
            user: "username",
            component: "component1",
            method: "method2",
            error: "unauthorized"
          }
        ]);
      })

      .then(function() {
        return Promise.all([
          users.allowMethod(servers[0], "username", "component1", "method1")
        ]);
      })

      .then(function() {
        // await sync
        return Promise.delay(300);
      })

      .then(function() {
        return Promise.all([
          client.callMethod(1, client1, "component1", "method1"),
          client.callMethod(2, client1, "component1", "method2"),
          client.callMethod(3, client2, "component1", "method1"),
          client.callMethod(4, client2, "component1", "method2")
        ]);
      })

      .then(function(results) {
        expect(results).to.eql([
          {
            seq: 1,
            user: "username",
            component: "component1",
            method: "method1",
            result: true
          },
          {
            seq: 2,
            user: "username",
            component: "component1",
            method: "method2",
            error: "unauthorized"
          },
          {
            seq: 3,
            user: "username",
            component: "component1",
            method: "method1",
            result: true
          },
          {
            seq: 4,
            user: "username",
            component: "component1",
            method: "method2",
            error: "unauthorized"
          }
        ]);
      })

      .then(function() {
        return Promise.all([
          users.denyMethod(servers[0], "username", "component1", "method1"),
          users.allowMethod(servers[0], "username", "component1", "method2")
        ]);
      })

      .then(function() {
        // await sync
        return Promise.delay(300);
      })

      .then(function() {
        return Promise.all([
          client.callMethod(1, client1, "component1", "method1"),
          client.callMethod(2, client1, "component1", "method2"),
          client.callMethod(3, client2, "component1", "method1"),
          client.callMethod(4, client2, "component1", "method2")
        ]);
      })

      .then(function(results) {
        expect(results).to.eql([
          {
            seq: 1,
            user: "username",
            component: "component1",
            method: "method1",
            error: "unauthorized"
          },
          {
            seq: 2,
            user: "username",
            component: "component1",
            method: "method2",
            result: true
          },
          {
            seq: 3,
            user: "username",
            component: "component1",
            method: "method1",
            error: "unauthorized"
          },
          {
            seq: 4,
            user: "username",
            component: "component1",
            method: "method2",
            result: true
          }
        ]);
      })

      .then(function() {
        done();
      })

      .catch(done);
  });

  it("handles security sync for events", function(done) {
    this.timeout(20 * 1000);

    var events = {};

    function createHandler(seq) {
      return function(data) {
        events[seq] = data.value;
      };
    }

    Promise.all([
      client.subscribe(1, client1, "component1", "event1", createHandler(1)),
      client.subscribe(2, client1, "component1", "event2", createHandler(2)),
      client.subscribe(3, client2, "component1", "event1", createHandler(3)),
      client.subscribe(4, client2, "component1", "event2", createHandler(4))
    ])

      .then(function(results) {
        expect(results).to.eql([
          { seq: 1, error: "unauthorized" },
          { seq: 2, error: "unauthorized" },
          { seq: 3, error: "unauthorized" },
          { seq: 4, error: "unauthorized" }
        ]);
      })

      .then(function() {
        return Promise.all([
          users.allowEvent(servers[0], "username", "component1", "event1"),
          users.allowEvent(servers[0], "username", "component1", "event2")
        ]);
      })

      .then(function() {
        // await sync
        return Promise.delay(300);
      })

      .then(function() {
        return Promise.all([
          client.subscribe(
            1,
            client1,
            "component1",
            "event1",
            createHandler(1)
          ),
          client.subscribe(
            2,
            client1,
            "component1",
            "event2",
            createHandler(2)
          ),
          client.subscribe(
            3,
            client2,
            "component1",
            "event1",
            createHandler(3)
          ),
          client.subscribe(4, client2, "component1", "event2", createHandler(4))
        ]);
      })

      .then(function(results) {
        expect(results).to.eql([
          { seq: 1, result: true },
          { seq: 2, result: true },
          { seq: 3, result: true },
          { seq: 4, result: true }
        ]);
      })

      .then(function() {
        return servers[0].exchange.component1.emitEvents();
      })

      .then(function() {
        // await emit
        return Promise.delay(200);
      })

      .then(function() {
        expect(events).to.eql({
          1: "event1",
          2: "event2",
          3: "event1",
          4: "event2"
        });
      })

      .then(function() {
        return Promise.all([
          users.denyEvent(servers[0], "username", "component1", "event1")
        ]);
      })

      .then(function() {
        // await sync
        return Promise.delay(300);
      })

      .then(function() {
        events = {};
        return servers[0].exchange.component1.emitEvents();
      })

      .then(function() {
        // await emit
        return Promise.delay(200);
      })

      .then(function() {
        expect(events).to.eql({
          // 1: 'event1',
          2: "event2",
          // 3: 'event1',
          4: "event2"
        });
      })

      .then(function() {
        return Promise.all([
          client.subscribe(
            1,
            client1,
            "component1",
            "event1",
            createHandler(1)
          ),
          client.subscribe(
            2,
            client1,
            "component1",
            "event2",
            createHandler(2)
          ),
          client.subscribe(
            3,
            client2,
            "component1",
            "event1",
            createHandler(3)
          ),
          client.subscribe(4, client2, "component1", "event2", createHandler(4))
        ]);
      })

      .then(function(results) {
        expect(results).to.eql([
          { seq: 1, error: "unauthorized" },
          { seq: 2, result: true },
          { seq: 3, error: "unauthorized" },
          { seq: 4, result: true }
        ]);
      })

      .then(function() {
        done();
      })

      .catch(done);
  });

  context("full spectrum security operations", function() {
    function performAction(port, username, component, method) {
      return new Promise(function(resolve, reject) {
        var client = new Happner.MeshClient({
          hostname: "localhost",
          port: port
        });

        client
          .login({
            username: username,
            password: "password"
          })

          .then(function() {
            return client.exchange[component][method]();
          })

          .then(function() {
            client.disconnect(function() {});
            resolve();
          })

          .catch(function(e) {
            client.disconnect(function() {});
            reject(e);
          });
      });
    }

    it("handles sync for add user and group and link and add permission and unlink group", function(done) {
      var user, group;

      servers[0].exchange.security
        .upsertUser({
          username: "username1",
          password: "password"
        })

        .then(function(_user) {
          user = _user;
          return servers[0].exchange.security.upsertGroup({
            name: "group1"
          });
        })

        .then(function(_group) {
          group = _group;
          return servers[0].exchange.security.linkGroup(group, user);
        })

        .then(function() {
          return servers[0].exchange.security.addGroupPermissions("group1", {
            methods: {
              "/DOMAIN_NAME/component1/method1": { authorized: true }
            }
          });
        })

        .then(function() {
          return Promise.delay(400);
        })

        .then(function() {
          return performAction(55002, "username1", "component1", "method1");
        })

        .then(function() {
          return servers[0].exchange.security.unlinkGroup(group, user);
        })

        .then(function() {
          return Promise.delay(400);
        })

        .then(function() {
          return new Promise(function(resolve, reject) {
            performAction(55002, "username1", "component1", "method1")
              .then(function() {
                reject(new Error("missing AccessDeniedError 1"));
              })
              .catch(function(e) {
                if (e.message === "unauthorized" && e.name === "AccessDenied") {
                  return resolve();
                }
                reject(new Error("missing AccessDeniedError 2"));
              });
          });
        })

        .then(function() {
          done();
        })

        .catch(done);
    });

    it("handles sync for delete group", function(done) {
      var user, group;

      servers[0].exchange.security
        .upsertUser({
          username: "username2",
          password: "password"
        })

        .then(function(_user) {
          user = _user;
          return servers[0].exchange.security.upsertGroup({
            name: "group2"
          });
        })

        .then(function(_group) {
          group = _group;
          return servers[0].exchange.security.linkGroup(group, user);
        })

        .then(function() {
          return servers[0].exchange.security.addGroupPermissions("group2", {
            methods: {
              "/DOMAIN_NAME/component1/method1": { authorized: true }
            }
          });
        })

        .then(function() {
          return Promise.delay(400);
        })

        .then(function() {
          return performAction(55002, "username2", "component1", "method1");
        })

        .then(function() {
          return servers[0].exchange.security.deleteGroup(group);
        })

        .then(function() {
          return Promise.delay(400);
        })

        .then(function() {
          return new Promise(function(resolve, reject) {
            performAction(55002, "username2", "component1", "method1")
              .then(function() {
                reject(new Error("missing AccessDeniedError 1"));
              })
              .catch(function(e) {
                if (e.message === "unauthorized" && e.name === "AccessDenied") {
                  return resolve();
                }
                reject(new Error("missing AccessDeniedError 2"));
              });
          });
        })

        .then(function() {
          done();
        })

        .catch(done);
    });

    it("handles sync for delete user", function(done) {
      var user, group;

      servers[0].exchange.security
        .upsertUser({
          username: "username3",
          password: "password"
        })

        .then(function(_user) {
          user = _user;
          return servers[0].exchange.security.upsertGroup({
            name: "group3"
          });
        })

        .then(function(_group) {
          group = _group;
          return servers[0].exchange.security.linkGroup(group, user);
        })

        .then(function() {
          return servers[0].exchange.security.addGroupPermissions("group3", {
            methods: {
              "/DOMAIN_NAME/component1/method1": { authorized: true }
            }
          });
        })

        .then(function() {
          return Promise.delay(400);
        })

        .then(function() {
          return performAction(55002, "username3", "component1", "method1");
        })

        .then(function() {
          return servers[0].exchange.security.deleteUser(user);
        })

        .then(function() {
          return Promise.delay(400);
        })

        .then(function() {
          return new Promise(function(resolve, reject) {
            performAction(55002, "username3", "component1", "method1")
              .then(function() {
                reject(new Error("missing AccessDeniedError 1"));
              })
              .catch(function(e) {
                if (
                  e.message === "Invalid credentials" &&
                  e.name === "AccessDenied"
                ) {
                  return resolve();
                }
                reject(new Error("missing AccessDeniedError 2"));
              });
          });
        })

        .then(function() {
          done();
        })

        .catch(done);
    });
  });
});
