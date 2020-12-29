const Helper = require('./helper');
const HappnerCluster = require('../../..');
module.exports = class Cluster extends Helper {
  constructor() {
    super();
    const self = this;
    self.instances = [];
    self.member = {
      start: async (configuration, wait) => {
        HappnerCluster.create(configuration, (e, instance) => {
          // eslint-disable-next-line no-console
          if (e) console.warn('ERROR STARTING TEST INSTANCE: ' + e.message);
          self.instances.push(instance);
        });
        await self.delay(wait);
      }
    };
  }
  static create() {
    return new Cluster();
  }
  async destroy() {
    for (let instance of this.instances) if (instance.stop) await instance.stop();
  }
};
