module.exports = Component;

function Component() {}

Component.prototype.start = function(callback) {
  callback();
};

Component.prototype.stop = function(callback) {
  callback();
};

Component.prototype.method = function($happn, callback) {
  callback(null, $happn.info.mesh.name + ':component-1:method');
};
