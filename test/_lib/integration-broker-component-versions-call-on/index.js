module.exports = Component;
const delay = require('await-delay');

function Component() {}

Component.prototype.start = function($happn, callback) {
  let counter = 0;
  this.interval = setInterval(() => {
    counter++;
    $happn.emit('tick', { counter });
  }, 500);
  callback();
};

Component.prototype.stop = function(callback) {
  clearInterval(this.interval);
  callback();
};

Component.prototype.directMethod = function($happn, callback) {
  callback(null, $happn.info.mesh.name + ':brokerComponent:directMethod');
};

Component.prototype.subscribeToRemoteAndGetEvent = async function($happn) {
  let events = [];
  let eventId = await $happn.event.$on(
    {
      component: 'remoteComponent1',
      path: '*',
      options: {}
    },
    data => {
      events.push(data);
    }
  );
  await $happn.exchange.remoteComponent1.brokeredMethod1();
  await delay(2000);
  await $happn.event.$off({
    component: 'remoteComponent1',
    id: eventId
  });
  return events;
};
