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
          // eslint-disable-next-line no-console
          if (e) console.warn('ERROR STARTING TEST INSTANCE: ' + e.message);
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
    this.instances.sort((a,b)  => {a._mesh.config.name - b._mesh.config.name})
    for (let instance of this.instances) {
      
      if (instance.stop) {

      // console.log("descr:",  instance.describe())

      await instance.stop();
    }
  }
  }
};
