var HappnerCluster = require('../..');
var Happner = require('happner-2');
var HappnCluster = require('happn-cluster');
var Promise = require('bluebird');
var expect = require('expect.js');

describe('02 - unit - broker component', function() {

  it('injects and detaches the broker component', function(done) {
    //package, mesh, client
    var mockModels = {};
    var mockMesh = {};
    var mockClient = {};

    var broker = require('../../lib/broker-component').create(mockModels, mockMesh, mockClient);

    broker.inject(function(e) {
      if (e) return done(e);
      expect(broker.__models).to.be(mockModels);
      expect(broker.__mesh).to.be(mockMesh);
      expect(broker.__client).to.be(mockClient);
      broker.detach(done);
    });
  });

  it('tests the __checkDuplicateInjections', function(done) {

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
    var mockMesh = {};
    var mockClient = {};

    try {

      var broker = require('../../lib/broker-component').create(mockModels, mockMesh, mockClient);

      broker.inject(function(){
        done(new Error('unexpected...'))
      });
    } catch (e) {
      expect(e.toString()).to.be('Error: Duplicate attempts to broker the remoteComponent3 component by brokerComponent & brokerComponent1');
      done();
    }
  });
});
