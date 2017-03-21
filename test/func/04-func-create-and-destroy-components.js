var path = require('path');
var HappnerCluster = require('../..');
var Promise = require('bluebird');
var expect = require('expect.js');

var libDir = require('../_lib/lib-dir');
var baseConfig = require('../_lib/base-config');
var stopCluster = require('../_lib/stop-cluster');
var minPeers = 1;

describe('03 - func - create and destroy components', function () {

  var servers, localInstance;

  function localInstanceConfig(seq) {
    var config = baseConfig(seq, minPeers);
    config.modules = {
      'dependency1': {
        instance: {}
      },
      'component': {
        path: libDir + 'func-04-component'
      }
    };
    config.components = {
      'dependency1': {},
      'component': {}
    };
    return config;
  }

  beforeEach('start cluster', function (done) {
    this.timeout(4000);

    Promise.all([
      HappnerCluster.create(localInstanceConfig(1))
    ])
      .then(function (_servers) {
        servers = _servers;
        localInstance = servers[0];
        done();
      })
      .catch(done);
  });

  afterEach('stop cluster', function (done) {
    if (!servers) return done();
    stopCluster(servers, done);
  });

  context('_createElement', function () {

    it('does not overwrite components from cluster', function (done) {
      var componentInstance = localInstance._mesh.elements['component'].component.instance;
      var exchange = componentInstance.exchange;

      // both dependencies are from cluster
      expect(exchange.dependency1).to.eql({
        __version: '^2.0.0',
        __custom: true
      });
      expect(exchange.dependency2).to.eql({
        __version: '^2.0.0',
        __custom: true
      });

      localInstance._createElement({
        module: {
          name: 'dependency2',
          config: {
            instance: {}
          }
        },
        component: {
          name: 'dependency2',
          config: {}
        }

      })

        .then(function () {
          // both dependencies are STILL from cluster (not overwritten)
          expect(exchange.dependency1).to.eql({
            __version: '^2.0.0',
            __custom: true
          });
          expect(exchange.dependency2).to.eql({
            __version: '^2.0.0',
            __custom: true
          });
        })

        .then(done).catch(done);
    });

  });

  context('_destroyElement', function () {

    it('does not remove components from cluster', function (done) {

      var componentInstance = localInstance._mesh.elements['component'].component.instance;
      var exchange = componentInstance.exchange;

      // both dependencies are from cluster
      expect(exchange.dependency1).to.eql({
        __version: '^2.0.0',
        __custom: true
      });
      expect(exchange.dependency2).to.eql({
        __version: '^2.0.0',
        __custom: true
      });

      localInstance._destroyElement('dependency1')

        .then(function () {
          // both dependencies are STILL from cluster (not removed)
          expect(exchange.dependency1).to.eql({
            __version: '^2.0.0',
            __custom: true
          });
          expect(exchange.dependency2).to.eql({
            __version: '^2.0.0',
            __custom: true
          });
        })

        .then(done).catch(done);

    });

  });


});
