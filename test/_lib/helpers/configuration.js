const _ = require('lodash');
module.exports = class Configuration extends require('./helper') {
  constructor() {
    super();
  }

  static create() {
    return new Configuration();
  }

  construct(test, index, secure = true, minPeers, hosts, joinTimeout, replicate) {
    const specified = require(`../configurations/${test}/${index}`);
    const base = this.base(index, secure, minPeers, hosts, joinTimeout, replicate);
    const merged = _.defaultsDeep(base, specified);
    return merged;
  }

  base(index, secure = true, minPeers, hosts, joinTimeout, replicate) {
    hosts = hosts || [`${this.address.self()}:56000`, `${this.address.self()}:56001`];
    joinTimeout = joinTimeout || 1000;
    replicate = replicate || ['*'];

    return {
      name: 'MESH_' + index,
      domain: 'DOMAIN_NAME',
      port: 57000 + index,
      cluster: {
        requestTimeout: 10000,
        responseTimeout: 20000
      },
      happn: {
        secure,
        services: {
          security: {
            config: {
              sessionTokenSecret: 'TEST-SESSION-TOKEN-SECRET'
            }
          },
          data: {
            config: {
              autoUpdateDBVersion: true
            }
          },
          membership: {
            config: {
              host: `${this.address.self()}`,
              port: 56000 + index,
              seed: index === 0,
              seedWait: 1000,
              hosts,
              joinTimeout
            }
          },
          proxy: {
            config: {
              port: 55000 + index
            }
          },
          orchestrator: {
            config: {
              minimumPeers: minPeers || 3,
              replicate
            }
          }
        }
      }
    };
  }
};
