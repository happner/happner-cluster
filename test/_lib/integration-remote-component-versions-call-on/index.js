module.exports = Component;

function Component() {}

Component.prototype.start = function($happn, callback) {
  callback();
};

Component.prototype.stop = function($happn, callback) {
  callback();
};

Component.prototype.brokeredMethod1 = function($happn, callback) {
  const topic = `${$happn.info.mesh.name}:remoteComponent:brokeredMethod1`;
  $happn.emit(topic, { topic });
  callback(null, topic);
};
