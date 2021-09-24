module.exports = Component;

function Component() {}

Component.prototype.start = function($happn, callback) {
  this.receivedEvents = [];
  $happn.event.remoteComponent.on(
    '/remote/event',
    data => {
      this.receivedEvents.push(data);
    },
    callback
  );
};

Component.prototype.getReceivedEvents = async function() {
  return this.receivedEvents;
};

Component.prototype.postEvent = function($happn, callback) {
  $happn.emit('/local/event', {
    brokered: {
      event: {
        data: {
          from: $happn.info.mesh.name
        }
      }
    }
  });
  callback(null, $happn.info.mesh.name + ':localComponent:postEvent');
};
