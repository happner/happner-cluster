module.exports = Component;

function Component() {}

Component.prototype.localMethodToRemoteMethod = function ($origin, $happn, component, method, callback) {
  $happn.exchange[component][method](function(e){
    callback(e);
  });
};

Component.prototype.localMethodToRemoteEvent = function ($happn, $origin, callback) {

  $happn.event.localComponent1.on('test-event', function(data){

  }, function(e){
    callback(e);
  });
};

Component.prototype.localMethodToData = function ($origin, $happn, callback) {
  $happn.data.set('/test/data', {test:"data"}, callback);
};
