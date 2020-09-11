module.exports = Component;

function Component() {}

Component.prototype.method1 = function($happn, callback) {
  callback(null, $happn.info.mesh.name + ':component1:method1');
};

Component.prototype.method2 = function($happn, $origin, callback) {
  $happn.exchange.remoteComponent3.method1(callback);
};

Component.prototype.method3 = function($happn, $origin, callback) {
  $happn.event.remoteComponent3.on(
    'test-event',
    function() {},
    function(e) {
      callback(e);
    }
  );
};
