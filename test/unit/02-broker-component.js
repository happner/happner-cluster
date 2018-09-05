var HappnerCluster = require('../..');
var Happner = require('happner-2');
var HappnCluster = require('happn-cluster');
var Promise = require('bluebird');
var expect = require('expect.js');

describe('02 - unit - brokerage component', function() {

  it('injects and detaches the brokerage component', function(done) {
    //package, mesh, client
    var mockModels = {};
    var mockMesh = {};
    var mockClient = {};

    var brokerage = require('../../lib/brokerage').create(mockModels, mockMesh, mockClient);

    brokerage.inject(function(e) {
      if (e) return done(e);
      expect(brokerage.__models).to.be(mockModels);
      expect(brokerage.__mesh).to.be(mockMesh);
      expect(brokerage.__client).to.be(mockClient);
      brokerage.detach(done);
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
    var brokerage = require('../../lib/brokerage').create(mockModels, mockMesh, mockClient);

    brokerage.inject(function(e){
      expect(e.toString()).to.be('Error: Duplicate attempts to broker the remoteComponent3 component by brokerComponent & brokerComponent1');
      done();
    });
  });
});
