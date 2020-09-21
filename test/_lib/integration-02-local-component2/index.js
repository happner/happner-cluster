module.exports = Component;

function Component() {}

Component.prototype.start = function($happn, callback) {
  callback();
};

Component.prototype.stop = function($happn, callback) {
  callback();
};

Component.prototype.listTestEvents = function($happn, callback) {
  var events = {};

  $happn.event.remoteComponent3.on(
    'testevent/*',
    function(data, meta) {
      events[meta.path] = 1;
    },
    function(e, subscriptionId) {
      if (e) return callback(e);

      setTimeout(function() {
        $happn.event.remoteComponent3.off(subscriptionId, function(e) {
          if (e) return callback(e);
          callback(null, events);
        });
      }, 600);
    }
  );
};

Component.prototype.listTestCompatibleEvents = function($happn, callback) {
  var events = {};

  $happn.event.remoteComponent5.on(
    'testevent/*/*',
    function(data, meta) {
      events[meta.path] = 1;
    },
    function(e, subscriptionId) {
      if (e) return callback(e);

      setTimeout(function() {
        $happn.event.remoteComponent4.off(subscriptionId, function(e) {
          if (e) return callback(e);
          callback(null, events);
        });
      }, 600);
    }
  );
};
