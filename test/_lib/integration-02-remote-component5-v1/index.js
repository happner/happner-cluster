module.exports = Component;

function Component() {}

Component.prototype.start = function($happn, callback) {
  this.interval = setInterval(function() {
    $happn.emit('testevent/v1/' + $happn.info.mesh.name);
  }, 200);

  callback();
};

Component.prototype.stop = function($happn, callback) {
  if (this.interval) clearInterval(this.interval);
  callback();
};

Component.prototype.method1 = function($happn, callback) {
  callback(null, $happn.info.mesh.name + ':component5-v1:method1');
};

Component.prototype.method2 = function($happn, callback) {
  callback(null, $happn.info.mesh.name + ':component5-v1:method2');
};
