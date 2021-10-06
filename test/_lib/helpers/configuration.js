const PORT_CONSTANTS = require('./port-constants');
const _ = require('lodash');
const getSeq = require('./getSeq');
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

  construct(test, extendedIndex, secure = true, minPeers, hosts, joinTimeout, replicate) {
    let [seqIndex, index] = extendedIndex;
    const base = this.base(index, seqIndex, secure, minPeers, hosts, joinTimeout, replicate);
    return _.defaultsDeep(base, this.get(test, index));
  }

  base(index, seqIndex, secure = true, minPeers, hosts, joinTimeout, replicate) {
    let [first, portIndex] = seqIndex;
    hosts = hosts || [
      `${this.address.self()}:` + getSeq.getSwimPort(1).toString(),
      `${this.address.self()}:` + getSeq.getSwimPort(2).toString()
    ];
    joinTimeout = joinTimeout || 1000;
    replicate = replicate || ['*'];

    return {
      name: 'MESH_' + index,
      domain: 'DOMAIN_NAME',
      port: PORT_CONSTANTS.HAPPN_BASE + portIndex,
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
              port: PORT_CONSTANTS.SWIM_BASE + portIndex,
              seed: portIndex === first,
              seedWait: 1000,
              hosts,
              joinTimeout
            }
          },
          proxy: {
            config: {
              port: PORT_CONSTANTS.PROXY_BASE + portIndex
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
