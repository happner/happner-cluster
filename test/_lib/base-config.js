module.exports = function (seq, minPeers) {
  return {
    name: 'MESH_' + seq,
    domain: 'DOMAIN_NAME',
    port: 57000 + seq,
    util: {
      logLevel: process.env.LOG_LEVEL || 'error'
    },
    cluster: {
      requestTimeout: 10 * 1000,
      responseTimeout: 20 * 1000
    },
    happn: {
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
};
