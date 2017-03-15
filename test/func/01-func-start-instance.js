var HappnerCluster = require('../..');

describe('01 - func - start instance', function () {

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

      .then(function (server) {

        server.stop(done);

      })

      .catch(done);

  });

});
