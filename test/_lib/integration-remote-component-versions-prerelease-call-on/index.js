module.exports = Component;

function Component() {}

Component.prototype.start = function($happn, callback) {
  callback();
};

Component.prototype.stop = function($happn, callback) {
  callback();
};

Component.prototype.brokeredMethod1 = function($happn, callback) {
  callback(null, $happn.info.mesh.name + ':prereleaseComponent:brokeredMethod1');
};
