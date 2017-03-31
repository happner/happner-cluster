var HappnerCluster = require('../..');
var Promise = require('bluebird');
var expect = require('expect.js');

describe('05 - func - localcomponent events', function () {

  var server;

  before('start server', function (done) {
    HappnerCluster.create({
      name: 'NODE-01',
      domain: 'DOMAIN_NAME',
      happn: {
        services: {
          membership: {
            config: {
              seed: true,
              hosts: ['localhost:56000']
            }
          }
        }
      },
      modules: {
        'component1': {
          instance: {
            start: function ($happn, callback) {
              this.interval = setInterval(function () {
                $happn.emit('test/event', {some: 'data'});
              }, 1000);
              callback();
            },
            stop: function ($happn, callback) {
              clearInterval(this.interval);
              callback();
            }
          }
        },
        'component2': {
          instance: {
            awaitEvent: function ($happn, callback) {
              var subscriberId;
              $happn.event.component1.on('test/event', function (data, meta) {
                $happn.event.component1.off(subscriberId);
                callback(null, data);
              }, function (e, _subscriberId) {
                if (e) return callback(e);
                subscriberId = _subscriberId;
              });
            }
          }
        }
      },
      components: {
        'component1': {
          startMethod: 'start',
          stopMethod: 'stop'
        },
        'component2': {

        }
      }
    })
      .then(function (_server) {
        server = _server;
        done();
      })
      .catch(done);
  });

  after('stop server', function (done) {
    if (!server) return done();
    server.stop({reconnect: false}, done);
  });

  it('can subscribe to event from local components', function (done) {
    server.exchange.component2.awaitEvent(function (e, result) {
      if (e) return done (e);
      console.log(result);
      done();
    })
  });

});
