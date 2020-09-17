module.exports = Component;

function Component() {}

Component.prototype.emitEvents = function($happn, callback) {
  $happn.emit('event1', { event: 'event1', component: $happn.name });
  $happn.emit('event2', { event: 'event2', component: $happn.name });
  $happn.emit('event3', { event: 'event3', component: $happn.name });
  $happn.emit('event4', { event: 'event4', component: $happn.name });
  $happn.emit('event5', { event: 'event5', component: $happn.name });

  setTimeout(callback, 1000); // wait for publishes + cluster replication
};

Component.prototype.method1 = function(callback) {
  callback(null, true);
};

Component.prototype.method2 = function(callback) {
  callback(null, true);
};

Component.prototype.method3 = function(callback) {
  callback(null, true);
};

Component.prototype.method4 = function(callback) {
  callback(null, true);
};

Component.prototype.method5 = function(callback) {
  callback(null, true);
};
