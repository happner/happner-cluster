var HappnerCluster = require('../..');
var Happner = require('happner-2');
var HappnCluster = require('happn-cluster');
var Promise = require('bluebird');
var expect = require('expect.js');

describe('01 - unit - cluster create', function () {

  beforeEach(function () {
    this.originalCreate = Happner.create;
  });

  afterEach(function () {
    Happner.create = this.originalCreate;
  });


  it('switches the datalayer definition', function (done) {
    Happner.create = function () {
      return Promise.resolve({
        _mesh: {
          happn: {
            server: {
              services: {
                proxy: {
                  start: function () {}
                }
              }
            }
          }
        }
      });
    };

    HappnerCluster.create({});

    expect(Happner.AssignedHappnServer).to.be(HappnCluster);
    done();
  });

  it('calls happner create', function (done) {
    Happner.create = function () {
      return Promise.resolve({
        _mesh: {
          happn: {
            server: {
              services: {
                proxy: {
                  start: function () {
                    done();
                  }
                }
              }
            }
          }
        }
      });
    };

    HappnerCluster.create({});
  });

  it('defines replication path', function (done) {
    Happner.create = function (config) {
      expect(config.happn.services.orchestrator.config.replicate).to.eql([
        '/_events/*'
      ]);
      return Promise.resolve({
        _mesh: {
          happn: {
            server: {
              services: {
                proxy: {
                  start: function () {
                    done();
                  }
                }
              }
            }
          }
        }
      });
    };

    HappnerCluster.create({});
  });

});
