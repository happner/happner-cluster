module.exports = Component;

function Component() {}

Component.prototype.emitEvents = function($happn, callback) {
  $happn.emit('event1', 'event1');
  $happn.emit('event2', 'event2');
  callback();
};

Component.prototype.method1 = function(callback) {
  callback(null, true);
};

Component.prototype.method2 = function(callback) {
  callback(null, true);
};
