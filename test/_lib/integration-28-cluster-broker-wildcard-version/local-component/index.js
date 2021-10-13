module.exports = Component;

function Component() {}

Component.prototype.start = function($happn, callback) {
  callback();
};

Component.prototype.stop = function($happn, callback) {
  callback();
};

Component.prototype.callDependency = function($happn, component, method, callback) {
  $happn.exchange[component][method](callback);
};
