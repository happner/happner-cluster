module.exports = Component;

function Component() {}

Component.prototype.start = function($happn, callback) {
  callback();
};

Component.prototype.stop = function($happn, callback) {
  callback();
};

Component.prototype.callDependency = async function($happn, component, method) {
  //$happn.exchange[component][method](callback);
  return await $happn.exchange.$call({
    component,
    method
  });
};
