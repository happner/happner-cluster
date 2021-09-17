const baseConfig = require('./base-config');
const libDir = require('./lib-dir');
const HappnerCluster = require('../..');
const users = require('./users');
let localInstance;
const GetSeq = require('./helpers/getSeqClass');
let getSeq;

let inputArgs = process.argv.slice(2).map(num => parseInt(num));

(async () => {
  if (inputArgs[0] === 2) {
    getSeq = new GetSeq(inputArgs[1] + 1, inputArgs[1]);
    let next = getSeq.getNext();
    await startInternal(next, 2);
    await users.add(localInstance, 'username', 'password');
    await users.allowMethod(localInstance, 'username', 'breakingComponent', 'happyMethod');
    await users.allowMethod(localInstance, 'username', 'breakingComponent', 'breakingMethod');
  } else {
    getSeq = new GetSeq(inputArgs[1] + inputArgs[0] - 1, inputArgs[1]);
    let next = getSeq.getNext();
    await startInternal(next, 2);
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
      path: libDir + 'integration-25-breaking-component'
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
