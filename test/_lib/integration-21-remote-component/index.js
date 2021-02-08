module.exports = Component;

function Component() {}

Component.prototype.start = function($happn, callback) {
  callback();
};

Component.prototype.stop = function($happn, callback) {
  callback();
};

Component.prototype.brokeredMethodTimeout = function() {};

Component.prototype.brokeredEventEmitMethod = function($happn, callback) {
  $happn.emit('/brokered/event', {
    brokered: {
      event: {
        data: {
          from: $happn.info.mesh.name
        }
      }
    }
  });
  callback(null, $happn.info.mesh.name + ':remoteComponent:brokeredEventEmitMethod');
};

Component.prototype.attachToEvent = function($happn, callback) {
  $happn.event.remoteComponent1.on('test/path', () => {}, callback);
};
