const _ = require('lodash');
module.exports = class Configuration extends require('./helper') {
  constructor() {
    super();
  }

  static create() {
    return new Configuration();
  }

  extract(test, index, name) {
    const configuration = this.get(test, index);
    return {
      module: {
        name,
        config: configuration.modules[name]
      },
      component: {
        name,
        config: configuration.components[name]
      }
    };
  }

  get(test, index) {
    return require(`../configurations/${test}/${index}`);
  }

  construct(test, index, secure = true, minPeers, hosts, joinTimeout, replicate) {
    const base = this.base(index, secure, minPeers, hosts, joinTimeout, replicate);
    return _.defaultsDeep(base, this.get(test, index));
  }

  base(index, secure = true, minPeers, hosts, joinTimeout, replicate) {
    hosts = hosts || [`${this.address.self()}:9900`, `${this.address.self()}:9901`];
    joinTimeout = joinTimeout || 1000;
    replicate = replicate || ['*'];

    return {
      name: 'MESH_' + index,
      domain: 'DOMAIN_NAME',
      port: 9900 + index,
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
