const Helper = require('./helper');
const HappnerCluster = require('../../..');
module.exports = class Cluster extends Helper {
  constructor() {
    super();
    this.instances = [];
    this.events = {
      data: []
    };
    this.member = {
      start: async (configuration, wait) => {
        HappnerCluster.create(configuration, (e, instance) => {
          if (e) {
            // eslint-disable-next-line no-console
            console.warn('ERROR STARTING TEST INSTANCE: ' + e.message);
          }
          this.events.data.push({
            key: 'member-started',
            value: instance._mesh.config.name
          });
          this.instances.push(instance);
        });
        await this.delay(wait);
      }
    };
    this.component = {
      inject: (index, configuration) => {
        this.instances.sort((a, b) => {
          if (a._mesh.config.name < b._mesh.config.name) return -1;
          return 1;
        });
        const instances = this.instances;
        return new Promise((resolve, reject) => {
          instances[index]._mesh._createElement(configuration, true, e => {
            if (e) return reject(e);
            resolve();
          });
        });
      }
    };
  }
  static create() {
    return new Cluster();
  }
  async destroy() {
    this.instances.sort((a, b) => {
      if (a._mesh.config.name < b._mesh.config.name) return -1;
      return 1;
    });
    for (let instance of this.instances) {
      if (instance.stop) {
        await instance.stop();
      }
    }
  }
};
