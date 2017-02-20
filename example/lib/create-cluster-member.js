var HappnerCluster = require('../..');

module.exports = function (seq) {

  var config = {
    name: 'MESH_' + seq,
    domain: 'DOMAIN_NAME',
    port: 57000 + seq,
    // util: {
    //   logLevel: process.env.LOG_LEVEL || 'error'
    // },
    happn: {
      services: {
        membership: {
          config: {
            host: '127.0.0.1',
            port: 56000 + seq,
            seed: seq == 0,
            seedWait: 300,
            hosts: ['127.0.0.1:56000', '127.0.0.1:56001', '127.0.0.1:56002']
          }
        },
        proxy: {
          config: {
            port: 55000 + seq
          }
        },
        orchestrator: {
          config: {
            // minimumPeers: 3
          }
        }
      }
    }
  };

  // see ../node_modules modules and components

  if (seq == 0) {
    config.modules = {
      'local-component': {}
    };
    config.components = {
      'local-component': {
        startMethod: 'start',
        stopMethod: 'stop'
      }
    };
  }

  if (seq > 0) {
    config.modules = {
      'remote-component': {}
    };
    config.components = {
      'remote-component': {
        // startMethod: 'start',
        // stopMethod: 'stop'
      }
    };
  }

  HappnerCluster.create(config)

    .catch(function (error) {
      console.error(error);
      process.exit(1);
    })

};
