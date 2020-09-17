const HappnerCluster = require('../../..');
const baseConfig = require('../../_lib/base-config');
const libDir = require('../../_lib/lib-dir');
const commander = require('commander');

commander
  .option('--seq [number]', 'sequence number')
  .option('--min [number]', 'minimum peers')
  .option('--seed [number]', 'minimum peers')
  .option('--hosts [number]', 'hosts')
  .option('--join-timeout [number]', 'join timeout')
  .parse(process.argv);

commander.seq = parseInt(commander.seq || 1);
commander.hosts = commander.hosts || '127.0.0.1:56001,127.0.0.1:56002,127.0.0.1:56003';
commander.joinTimeout = commander.joinTimeout || 300;

function brokerInstanceConfig(seq, sync) {
  var config = baseConfig(seq, sync, true, null, null, commander.hosts, commander.joinTimeout);
  config.authorityDelegationOn = true;
  config.modules = {
    localComponent: {
      path: libDir + 'integration-09-local-component'
    },
    brokerComponent: {
      path: libDir + 'integration-10-broker-component-dynamic'
    }
  };
  config.components = {
    localComponent: {
      startMethod: 'start',
      stopMethod: 'stop'
    },
    brokerComponent: {
      startMethod: 'start',
      stopMethod: 'stop'
    }
  };
  return config;
}

HappnerCluster.create(brokerInstanceConfig(commander.seq, commander.min)).then(instance => {
  setInterval(() => {
    // eslint-disable-next-line no-console
    console.log(
      `active sessions: ${
        Object.keys(instance._mesh.happn.server.services.session.__activeSessions.__cache).length
      }`
    );
  }, 5000);
});
