module.exports = Component;

function Component() {}

Component.prototype.start = async function($happn) {
  this.receivedEvents = [];
  await $happn.event.remoteComponent.on('/*/event', (data, meta) => {
    this.receivedEvents.push({ data, meta });
  });
  await $happn.event.localComponent.on('/*/event', (data, meta) => {
    this.receivedEvents.push({ data, meta });
  });
};

Component.prototype.getReceivedEvents = async function() {
  return this.receivedEvents;
};
