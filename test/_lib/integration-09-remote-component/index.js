module.exports = Component;

function Component() {}

Component.prototype.start = function($happn, callback) {
  callback();
};

Component.prototype.stop = function($happn, callback) {
  callback();
};

Component.prototype.brokeredMethod1 = function($happn, callback) {
  callback(null, $happn.info.mesh.name + ':remoteComponent:brokeredMethod1');
};

Component.prototype.brokeredMethod2 = function($happn, callback) {
  callback(null, $happn.info.mesh.name + ':remoteComponent:brokeredMethod2');
};

Component.prototype.brokeredMethodFail = function($happn, callback) {
  callback(new Error('test error'));
};

Component.prototype.brokeredMethodTimeout = function($happn, callback) {

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
