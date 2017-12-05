module.exports = function (seq, minPeers, secure) {
  var config = {
    name: 'MESH_' + seq,
    domain: 'DOMAIN_NAME',
    port: 57000 + seq,
    cluster: {
      requestTimeout: 10 * 1000,
      responseTimeout: 20 * 1000
    },
    happn: {
      secure: typeof secure == 'boolean' ? secure : false,
      services: {
        membership: {
          config: {
            host: '127.0.0.1',
            port: 56000 + seq,
            seed: seq == 1,
            seedWait: 300,
            hosts: ['127.0.0.1:56001']
          }
        },
        proxy: {
          config: {
            port: 55000 + seq
          }
        },
        orchestrator: {
          config: {
            minimumPeers: minPeers || 3
          }
        }
      }
    }
  }

  if (secure) {
    config.happn.services.security = {
      config: {
        adminUser: {
          username: '_ADMIN',
          password: 'happn'
        }
      }
    }
  }

  return config;
};
