module.exports = Component;

function Component() {}

Component.prototype.start = function($happn, callback) {
  this.interval = setInterval(function() {
    $happn.emit('testevent/' + $happn.info.mesh.name);
  }, 200);

  callback();
};

Component.prototype.stop = function($happn, callback) {
  clearInterval(this.interval);
  callback();
};

Component.prototype.brokeredMethod1 = function($happn, callback) {
  callback(null, $happn.info.mesh.name + ':remoteComponent:brokeredMethod1');
};

Component.prototype.brokeredMethod2 = function($happn, callback) {
  callback(null, $happn.info.mesh.name + ':remoteComponent:brokeredMethod2');
};

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
