module.exports = Component;

function Component() {}

Component.prototype.start = function($happn, callback) {
  this.receivedEvents = [];
  $happn.event.localComponent.on(
    '/local/event',
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
  $happn.emit('/remote/event', {
    brokered: {
      event: {
        data: {
          from: $happn.info.mesh.name
        }
      }
    }
  });
  callback(null, $happn.info.mesh.name + ':remoteComponent:postEvent');
};
