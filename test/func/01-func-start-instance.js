var HappnerCluster = require('../..');
var Happner = require('happner-2');

describe('01 - func - start instance', function () {

  var server, client;

  after('stop server', function (done) {

    if (!server) return done();
    server.stop({reconnect: false}, done);

  });

  after('stop client', function (done) {

    if (!client) return done();
    client.disconnect(done);

  });

  it('starts', function (done) {

    this.timeout(4000);

    HappnerCluster.create({
      domain: 'DOMAIN_NAME',
      util: {
        logLevel: process.env.LOG_LEVEL || 'error'
      },
      happn: {
        cluster: {
          requestTimeout: 20 * 1000,
          responseTimeout: 30 * 1000
        },
        services: {
          membership: {
            config: {
              seed: true,
              hosts: ['127.0.0.1:55000']
            }
          }
        }
      }
    })

      .then(function (_server) {

        server = _server;

      })

      .then(function () {

        client = new Happner.MeshClient({});
        return client.login(); // ensures proxy (default 55000) is running

      })

      .then(function () {

        done();

      })

      .catch(done);

  });

});
