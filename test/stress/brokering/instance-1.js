const HappnerCluster = require('../../..');
const baseConfig = require('../../_lib/base-config');
const libDir = require('../../_lib/lib-dir');
const commander = require('commander');

commander
  .option('--seq [number]', 'sequence number')
  .option('--min [number]', 'minimum peers')
  .option('--seed [number]', 'minimum peers')
  .option('--hosts [number]', 'hosts')
  .parse(process.argv);

commander.seq = parseInt(commander.seq || 1);
commander.hosts = commander.hosts || '127.0.0.1:56001,127.0.0.1:56002,127.0.0.1:56003';

function internalInstanceConfig(seq, sync) {
  var config = baseConfig(seq, sync, true, null, null, commander.hosts);
  config.modules = {
    remoteComponent: {
      path: libDir + 'integration-09-remote-component'
    },
    remoteComponent1: {
      path: libDir + 'integration-09-remote-component-1'
    }
  };
  config.components = {
    remoteComponent: {
      startMethod: 'start',
      stopMethod: 'stop'
    },
    remoteComponent1: {
      startMethod: 'start',
      stopMethod: 'stop',
      web: {
        routes: {
          testJSON: ['testJSON'],
          testJSONSticky: ['testJSONSticky']
        }
      }
    }
  };
  return config;
}

return HappnerCluster.create(internalInstanceConfig(commander.seq, commander.min));
