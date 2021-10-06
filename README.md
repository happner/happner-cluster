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
  domain: 'DOMAIN_NAME', // same as other cluster nodes, used for event replication - allows clusters to be segmented by domain

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
      },
      orchestrator: {
          config: {
            minimumPeers: minPeers || 3, //minimum peers before stabilise
            replicate: [
              'my-custom-path/*'
            ] //listen to all cluster events on this path, the following are also listened to by default:
            // `/_events/${config.domain}/*/*`,
            // `/_events/${config.domain}/*/*/*`,
            // `/_events/${config.domain}/*/*/*/*`,
            // `/_events/${config.domain}/*/*/*/*/*`,
            // `/_events/${config.domain}/*/*/*/*/*/*`,
            // `/_events/${config.domain}/*/*/*/*/*/*/*`
            // NB: to not listen to any cluster events apart from security replication, set replicate: false
          }
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
          methods: { // list of methods desired on the remote compnoent - these will not be discovered and will need to be statically defined
            method1: {},
            method2: {}
          }
        },
        'remote-component2': {
          version: '~1.0.0'
          // no methods, only interested in events
        },
        'remote-component3': {
          version: '~1.0.0'
          discoverMethods: true //this special switch will result method discovery for the component
        }
      }
    }
  }
}

// NB: if method discovery is switched on, inside your component method - where $happn is passed in be aware that the methods may only be available after startup - as the mesh description of the arriving peer on the cluster is used to generate the method api for the discovered component, this means that the declarative approach using $call with $happn should be used to ensure the api does not break, ie:

//dont do this
await $happn.exchange['remote-component3'].discoveredMethod(arg1, arg2);


//rather do this, if the method is not around you can at least handle the method missing error
try {
  await $happn.exchange.$call({
    component: 'remote-component3',
    method: 'discoveredMethod',
    arguments: [arg1, arg2]
  });
} catch (e) {
  if (e.message === 'invalid endpoint options: [remote-component3.discoveredMethod] method does not exist on the api') {
    methodMissingHandler();
  }
  throw e;
}
```

__Note:__

* If a component is defined locally and remotely then local is preferred and remote never used.
* If the component is defined on multiple remote nodes, a round-robin is performed on the method calls.

Brokered components using $broker
---------------------------------
*Using special syntax in the package.json happner config, it is possible to broker remote dependencies as if they were local components served up by the mesh*

The following is an example package.json of a component that is brokering requests to the internal dependency remoteComponent, note the special $broker dependency name, which instructs the cluster to inject remoteComponent into the meshes exchange:
```json
{
  "name": "broker-component",
  "version": "1.0.1",
  "happner": {
    "dependencies": {
      "$broker": {
        "remoteComponent": {
          "version": "^2.0.0",
          "methods": {
            "brokeredMethod1": {},
            "brokeredEventEmitMethod":{}
          }
        }
      }
    }
  }
}
```
Based on the above setup, clients are now able to connect to an edge cluster node (which has declared the broker component) and call the brokered dependencies as if they were loaded as components on the edge node:

```javascript

var client = new Happner.MeshClient({
  hostname: 'localhost',
  port: 8080
});

client.login({
    username: 'username',
    password: 'password'
  })
  .then(function () {
    //NB NB: remoteComponent is now injected into the exchange as if the internal component
    // were a declared component on the edge cluster node:
    return client.exchange.remoteComponent.brokeredMethod1();
  })
  .then(function(result){
    //happy days...
  })

```

__Note:__

* Duplicate injected dependencies (components with the same name brokered from different brokers) will fail to load, even if they are pointing to internal components with different versions.
