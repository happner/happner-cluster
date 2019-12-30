var HappnerCluster = require("../..");
var Promise = require("bluebird");
var expect = require("expect.js");

var libDir = require("../_lib/lib-dir");
var baseConfig = require("../_lib/base-config");
var stopCluster = require("../_lib/stop-cluster");

describe(require("../_lib/test-helper").testName(__filename, 3), function() {
  this.timeout(20000);

  var servers, localInstance;

  function localInstanceConfig(seq) {
    var config = baseConfig(seq);
    config.modules = {
      localComponent1: {
        path: libDir + "integration-02-local-component1"
      },
      localComponent2: {
        path: libDir + "integration-02-local-component2"
      },
      remoteComponent4: {
        path: libDir + "integration-02-remote-component4-v1"
      }
    };
    config.components = {
      localComponent1: {
        startMethod: "start",
        stopMethod: "stop"
      },
      localComponent2: {
        startMethod: "start",
        stopMethod: "stop"
      },
      remoteComponent4: {
        startMethod: "start",
        stopMethod: "stop"
      }
    };
    return config;
  }

  function remoteInstance1Config(seq) {
    var config = baseConfig(seq);
    config.modules = {
      remoteComponent3: {
        path: libDir + "integration-02-remote-component3"
      },
      remoteComponent4: {
        path: libDir + "integration-02-remote-component4-v2"
      },
      remoteComponent5: {
        path: libDir + "integration-02-remote-component5-v1"
      }
    };
    config.components = {
      remoteComponent3: {
        startMethod: "start",
        stopMethod: "stop"
      },
      remoteComponent4: {
        startMethod: "start",
        stopMethod: "stop"
      },
      remoteComponent5: {
        startMethod: "start",
        stopMethod: "stop"
      }
    };
    return config;
  }

  function remoteInstance2Config(seq) {
    var config = baseConfig(seq);
    config.modules = {
      remoteComponent3: {
        path: libDir + "integration-02-remote-component3"
      },
      remoteComponent4: {
        path: libDir + "integration-02-remote-component4-v2"
      },
      remoteComponent5: {
        path: libDir + "integration-02-remote-component5-v2"
      }
    };
    config.components = {
      remoteComponent3: {
        startMethod: "start",
        stopMethod: "stop"
      },
      remoteComponent4: {
        startMethod: "start",
        stopMethod: "stop"
      },
      remoteComponent5: {
        startMethod: "start",
        stopMethod: "stop"
      }
    };
    return config;
  }

  before("start cluster", function(done) {
    this.timeout(20000);

    Promise.all([
      HappnerCluster.create(localInstanceConfig(1)),
      HappnerCluster.create(remoteInstance1Config(2)),
      HappnerCluster.create(remoteInstance2Config(3))
    ])
      .then(function(_servers) {
        servers = _servers;
        localInstance = servers[0];
        done();
      })
      .catch(done);
  });

  after("stop cluster", function(done) {
    if (!servers) return done();
    stopCluster(servers, done);
  });

  context("exchange", function() {
    it("uses happner-client to mount all $happn components", function(done) {
      // ... and apply models from each component's
      //     package.json happner dependency declaration
      // ... and round robbin second call to second remote component

      var results = {};

      localInstance.exchange.localComponent1.callDependency(
        "remoteComponent3",
        "method1",
        function(e, result) {
          if (e) return done(e);

          results[result] = 1;

          localInstance.exchange.localComponent1.callDependency(
            "remoteComponent3",
            "method1",
            function(e, result) {
              if (e) return done(e);

              results[result] = 1;

              try {
                expect(results).to.eql({
                  "MESH_2:component3:method1": 1,
                  "MESH_3:component3:method1": 1
                });
                done();
              } catch (e) {
                done(e);
              }
            }
          );
        }
      );
    });

    it("overwrites local components that are wrong version", function(done) {
      localInstance.exchange.localComponent1.callDependency(
        "remoteComponent4",
        "method1",
        function(e, result) {
          if (e) return done(e);
          try {
            expect(result.split(":")[1]).to.be("component4-v2");
            done();
          } catch (e) {
            done(e);
          }
        }
      );
    });

    it("responds with not implemented", function(done) {
      localInstance.exchange.localComponent1.callDependency(
        "remoteComponent0",
        "method1",
        function(e) {
          try {
            expect(e.message).to.be(
              "Not implemented remoteComponent0:^1.0.0:method1"
            );
            done();
          } catch (e) {
            done(e);
          }
        }
      );
    });
  });

  context("events", function() {
    it("can subscribe cluster wide", function(done) {
      this.timeout(5000);

      localInstance.exchange.localComponent2.listTestEvents(function(
        e,
        result
      ) {
        if (e) return done(e);

        try {
          expect(result).to.eql({
            "/_events/DOMAIN_NAME/remoteComponent3/testevent/MESH_3": 1,
            "/_events/DOMAIN_NAME/remoteComponent3/testevent/MESH_2": 1
          });
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it("does not receive events from incompatible component versions", function(done) {
      localInstance.exchange.localComponent2.listTestCompatibleEvents(function(
        e,
        result
      ) {
        if (e) return done(e);

        try {
          expect(result).to.eql({
            "/_events/DOMAIN_NAME/remoteComponent5/testevent/v2/MESH_3": 1
          });
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });
});
