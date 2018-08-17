[![npm](https://img.shields.io/npm/v/happner-cluster.svg)](https://www.npmjs.com/package/happner-cluster)[![Build Status](https://travis-ci.org/happner/happner-cluster.svg?branch=master)](https://travis-ci.org/happner/happner-cluster)[![Coverage Status](https://coveralls.io/repos/happner/happner-cluster/badge.svg?branch=master&service=github)](https://coveralls.io/github/happner/happner-cluster?branch=master)

# happner-cluster

Extends happner with clustering capabilities.

## Install

`npm install happner-cluster happn-service-mongo-2 —save`

Note data service installed separately.

## Starting a cluster node

Happner-cluster and happner configs are almost identical excpet that cluster nodes should include a domain name and the happn subconfigs necessary for clustering - as minimum shown below.

 For more on happn-cluster subconfig see [happn-cluster docs](https://github.com/happner/happn-cluster)

```javascript
var HappnerCluster = require('happner-cluster');

var config = {

  // name: 'UNIQUE_NAME', // allow default uniqie name
  domain: 'DOMAIN_NAME', // same as other cluster nodes

  cluster: {
    //  requestTimeout: 20 * 1000, // exchange timeouts
    //  responseTimeout: 30 * 1000
  },

  happn: { // was "datalayer"
    services: {
      data: {
        // see data sub-config in happn-cluster docs
        config: {
          datastores: [
            // defaulted by happn-cluster
            //{
            //  name: 'mongo',
            //  provider: 'happn-service-mongo-2',
            //  isDefault: true,
            //  settings: {
            //    collection: 'happn-cluster',
            //    database: 'happn-cluster',
            //    url: 'mongodb://127.0.0.1:27017'
            //    url: 'mongodb://username:password@127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/happn?replicaSet=test-set&ssl=true&authSource=admin'
            //  }
            //},

            // defaulted by happner-cluster to prevent overwrites in shared db
            // where each cluster server requires unique data at certain paths
            //{
            //  name: 'nedb-own-schema',
            //  settings: {},
            //  patterns: [
            //    '/mesh/schema/*',
            //    '/_SYSTEM/_NETWORK/_SETTINGS/NAME',
            //    '/_SYSTEM/_SECURITY/_SETTINGS/KEYPAIR'
            //  ]
            //}
          ]
        }
      }
      membership: {
        // see membership sub-config in happn-cluster docs
      }
    }
  },

  modules: {
  },

  components: {
  }
}

HappnerCluster.create(config).then...
```

##  Using remote components in the cluster

A component that wishes to use non-local components whose instances reside elsewhere in the cluster should declare the dependencies in their package.json

Given a clusternode with component1...

```javascript
config = {
  modules: {
    'component1': {
      // using most complex example of module which defines multiple component classes
      path: 'node-module-name',
      construct: {
        name: 'Component1'
      }
    }
  },
  components: {
    'component1': {...}
  }
}
```

…to enable component1 to use remote components from elsewhere in the cluster...

```javascript
Component1.prototype.method = function ($happner, callback) {
  // $happner aka $happn
  // call remote component not defined locally
  $happner.exchange['remote-component'].method1(function (e, result) {
    callback(e, result);
  });

  // also
  // $happner.event['remote-component'].on() .off() .offPath()
}
```

…it should declare the dependency in its package.json file…

```javascript
// package.json expressed as js
{
  name: 'node-module-name',
  version: '1.0.0',
  happner: {
    dependencies: {
      'component1': { // the component name which has the dependencies
                      // (allows 1 node_module to define more than 1 mesh component class)
        'remote-component': {
          version: '^1.0.0', // will only use matching versions from
                             // elsewhefre in the cluster
          methods: { // list of methods desired on the remote compnoent
            method1: {},
            method2: {}
          }
        },
        'remote-component2': {
          version: '~1.0.0'
          // no methods, only interested in events
        }
      }
    }
  }
}
```

__Note:__

* If a component is defined locally and remotely then local is preferred and remote never used.
* If the component is defined on multiple remote nodes, a round-robin is performed on the method calls.
