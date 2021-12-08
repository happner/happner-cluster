var Promise = require('bluebird');
var expect = require('expect.js');

describe('02 - unit - brokerage component', function() {
  it('injects the brokerage component', function(done) {
    //package, mesh, client
    var mockModels = {};
    var mockMesh = {
      _mesh: {
        config: {
          name: 'mock'
        }
      }
    };
    var mockClient = {
      on: function() {}
    };

    var brokerage = require('../../lib/brokerage').create(mockModels, mockMesh, mockClient);

    brokerage.inject(function(e) {
      if (e) return done(e);
      expect(brokerage.__models).to.be(mockModels);
      expect(brokerage.__mesh).to.be(mockMesh);
      expect(brokerage.__client).to.be(mockClient);
      done();
    });
  });

  it('tests the __checkDuplicateInjections method', function(done) {
    //package, mesh, client
    var mockModels = {
      brokerComponent: {
        package: {
          remoteComponent3: {
            version: '^2.0.0'
          }
        }
      },
      brokerComponent1: {
        package: {
          remoteComponent3: {
            version: '^2.0.0'
          }
        }
      }
    };

    var mockMesh = {
      _mesh: {
        config: {
          name: 'mock'
        }
      }
    };

    var mockClient = {
      on: function() {}
    };
    var brokerage = require('../../lib/brokerage').create(mockModels, mockMesh, mockClient);

    brokerage.inject(function(e) {
      expect(e.toString()).to.be(
        'Error: Duplicate attempts to broker the remoteComponent3 component by brokerComponent & brokerComponent1'
      );
      done();
    });
  });

  it('tests the instance method', function() {
    //package, mesh, client
    var mockModels = {
      brokerComponent: {
        remoteComponent3: {
          version: '^2.0.0'
        }
      },
      brokerComponent1: {
        remoteComponent3: {
          version: '^2.0.0'
        }
      }
    };

    var mockMesh = {
      _mesh: {
        config: {
          name: 'mock'
        }
      }
    };

    var mockClient = {
      on: function() {}
    };

    var brokerage = require('../../lib/brokerage').create(mockModels, mockMesh, mockClient);
    expect(require('../../lib/brokerage').instance('mock')).to.eql(brokerage);
  });

  it('tests the deferProxyStart method', function(done) {
    //package, mesh, client
    var mockModels = {
      brokerComponent: {
        remoteComponent3: {
          version: '^2.0.0'
        }
      },
      brokerComponent1: {
        remoteComponent3: {
          version: '^2.0.0'
        }
      }
    };

    var mockMesh = {
      _mesh: {
        config: {
          name: 'mock'
        }
      }
    };

    var mockClient = {
      on: function() {}
    };
    var brokerage = require('../../lib/brokerage').create(mockModels, mockMesh, mockClient);
    brokerage
      .deferProxyStart({
        test: 'proxy'
      })
      .then(function() {
        expect(brokerage.__proxy).to.eql({
          test: 'proxy'
        });
        done();
      });
  });

  it('tests the dependenciesSatisfied method', function() {
    //package, mesh, client
    var mockModels = {
      brokerComponent: {
        remoteComponent3: {
          version: '^2.0.0'
        }
      },
      brokerComponent1: {
        remoteComponent3: {
          version: '^2.0.0'
        }
      }
    };

    var mockMesh = {
      _mesh: {
        config: {
          name: 'mock'
        }
      }
    };

    var mockClient = {
      on: function() {}
    };

    var brokerage = require('../../lib/brokerage').create(mockModels, mockMesh, mockClient);
    brokerage.__satisfiedElementNames = ['test1', 'test2'];
    brokerage.__injectedElementNames = ['test2', 'test1'];
    expect(brokerage.dependenciesSatisfied()).to.be(true);

    brokerage.__satisfiedElementNames = ['test1', 'test2'];
    brokerage.__injectedElementNames = ['test2'];
    expect(brokerage.dependenciesSatisfied()).to.be(false);
  });

  it('tests the __checkDependenciesSatisfied method', function(done) {
    //package, mesh, client
    var mockModels = {
      brokerComponent: {
        remoteComponent3: {
          version: '^2.0.0'
        }
      },
      brokerComponent1: {
        remoteComponent3: {
          version: '^2.0.0'
        }
      }
    };

    var mockMesh = {
      disableSchemaPublish: () => {},
      _mesh: {
        config: {
          name: 'mock'
        }
      }
    };

    var mockClient = {
      on: function() {}
    };

    var mockLogger = {};

    var brokerage = require('../../lib/brokerage').create(
      mockModels,
      mockMesh,
      mockClient,
      mockLogger,
      {
        dependenciesSatisfiedDeferListen: true
      }
    );
    brokerage.__proxy = {
      start: done
    };
    brokerage.__satisfiedElementNames = ['test2'];
    brokerage.__injectedElementNames = ['test2', 'test1'];
    brokerage.__checkDependenciesSatisfied();

    brokerage.__satisfiedElementNames = ['test1', 'test2'];
    brokerage.__injectedElementNames = ['test2', 'test1'];
    brokerage.__checkDependenciesSatisfied();
  });

  it('tests the __handleDependencyMet method', function(done) {
    //package, mesh, client
    var mockModels = {
      brokerComponent: {
        remoteComponent3: {
          version: '^2.0.0'
        }
      },
      brokerComponent1: {
        remoteComponent3: {
          version: '^2.0.0'
        }
      }
    };

    var mockMesh = {
      _mesh: {
        config: {
          name: 'mock'
        }
      }
    };

    var mockClient = {
      on: function() {}
    };
    let count = 0;
    var mockLogger = {
      info: function(msg) {
        count++;
        if (count === 2) {
          expect('remote dependency satisfied: remote-mesh.test').to.be(msg);
          done();
        }
      },
      error: function() {
        done(arguments[0]);
      }
    };

    var brokerage = require('../../lib/brokerage').create(
      mockModels,
      mockMesh,
      mockClient,
      mockLogger
    );

    brokerage.__client = {
      construct: function() {
        return {
          exchange: {
            test: {}
          }
        };
      }
    };

    brokerage.__injectedElements = [
      {
        component: {
          name: 'test'
        }
      }
    ];

    brokerage.__mesh = {
      _updateElement: function() {
        return new Promise(resolve => {
          resolve();
        });
      },
      _mesh: {
        config: {
          name: 'test'
        }
      }
    };

    brokerage.__handlePeerArrived({
      componentName: 'test',
      meshName: 'remote-mesh',
      description: {}
    });
  });
});
