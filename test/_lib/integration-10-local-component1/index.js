module.exports = Component;

function Component() {}

Component.prototype.localMethodToRemoteMethod = function(
  $origin,
  $happn,
  component,
  method,
  asAdmin,
  callback
) {
  if (typeof asAdmin === 'function') {
    callback = asAdmin;
    asAdmin = false;
  }

  if (asAdmin) {
    //console.log('running asAdmin...');
    return $happn.asAdmin.exchange[component][method](function(e) {
      callback(e);
    });
  }

  $happn.exchange[component][method](function(e) {
    callback(e);
  });
};

Component.prototype.localMethodToRemoteEvent = function($happn, $origin, asAdmin, callback) {
  if (typeof asAdmin === 'function') {
    callback = asAdmin;
    asAdmin = false;
  }

  let eventAPI = asAdmin ? $happn.asAdmin.event : $happn.event;

  eventAPI.localComponent1.on(
    'test-event',
    function() {},
    function(e) {
      callback(e);
    }
  );
};

Component.prototype.localMethodToData = function($origin, $happn, asAdmin, callback) {
  if (typeof asAdmin === 'function') {
    callback = asAdmin;
    asAdmin = false;
  }

  let dataAPI = asAdmin ? $happn.asAdmin.data : $happn.data;

  dataAPI.set(
    '/test/data',
    {
      test: 'data'
    },
    callback
  );
};
