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
  
  happn: { // was "datalayer"
    services: {
      data: {
        // see data sub-config in happn-cluster docs
      }
      membership: {
        // see membership sub-config in happn-cluster docs
      }
    }
  },
    
  modules: {
    ...
  },
    
  components: {
    ...
  }
}

HappnerCluster.create(config).then...
```