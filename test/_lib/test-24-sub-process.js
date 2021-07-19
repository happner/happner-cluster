const baseConfig = require('./base-config');
const libDir = require('./lib-dir');
const HappnerCluster = require('../..');
const users = require('./users');
let localInstance;
(async () => {
  if (process.argv[2] == '2') {
    await startInternal(2, 2);
    await users.add(localInstance, 'username', 'password');
    await users.allowMethod(localInstance, 'username', 'breakingComponent', 'happyMethod');
    await users.allowMethod(localInstance, 'username', 'breakingComponent', 'breakingMethod');
  } else {
    await startInternal(3, 2);
  }
})();
async function startInternal(id, clusterMin) {
  const server = await HappnerCluster.create(remoteInstanceConfig(id, clusterMin));
  localInstance = server;
}

function remoteInstanceConfig(seq, sync) {
  var config = baseConfig(seq, sync, true);
  config.modules = {
    breakingComponent: {
      path: libDir + 'integration-24-breaking-component'
    }
  };
  config.components = {
    breakingComponent: {
      startMethod: 'start',
      stopMethod: 'stop'
    }
  };
  return config;
}
