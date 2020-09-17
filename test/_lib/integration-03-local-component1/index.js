module.exports = Component;

function Component() {}

Component.prototype.callDependency = function($happn, component, method, callback) {
  $happn.exchange[component][method](callback);
};
