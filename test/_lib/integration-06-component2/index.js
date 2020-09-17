module.exports = Component;

function Component() {}

Component.prototype.awaitEvents = function($happn, callback) {
  var events = {};

  var timeout = setTimeout(function() {
    callback(null, events);
  }, 300);

  try {
    $happn.event.component1.on('event/global', function(data) {
      events['event/global'] = data;
    });

    $happn.event.component1.on('event/local', function(data) {
      events['event/local'] = data;
    });
  } catch (e) {
    clearTimeout(timeout);

    callback(e);
  }
};
