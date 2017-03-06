module.exports = Component;

function Component() {}

Component.prototype.start = function ($happn, callback) {
  this.interval = setInterval(function () {
    $happn.emit('testevent/' + $happn.info.mesh.name);
  }, 500);

  callback();
};

Component.prototype.stop = function ($happn, callback) {
  clearInterval(this.interval);
  callback();
};

Component.prototype.method1 = function($happn, callback) {
  callback(null, $happn.info.mesh.name + ':component3:method1');
};

Component.prototype.method2 = function($happn, callback) {
  callback(null, $happn.info.mesh.name + ':component3:method2');
};
