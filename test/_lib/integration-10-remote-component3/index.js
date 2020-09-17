module.exports = Component;

function Component() {}

Component.prototype.method1 = function($happn, callback) {
  callback(null, $happn.info.mesh.name + ':component3:method1');
};

Component.prototype.method2 = function($happn, callback) {
  callback(null, $happn.info.mesh.name + ':component3:method2');
};

Component.prototype.method3 = function($happn, callback) {
  $happn.data.set('/test/data', { test: 'data' }, callback);
};
