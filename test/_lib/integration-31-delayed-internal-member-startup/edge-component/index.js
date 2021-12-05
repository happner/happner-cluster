module.exports = Component;

function Component() {}

Component.prototype.start = function($happn, callback) {
  callback();
};

Component.prototype.stop = function($happn, callback) {
  callback();
};

Component.prototype.callRemote = function($happn, component, method, args, callback) {
  $happn.asAdmin.exchange
    .$call({
      component,
      method,
      arguments: args
    })
    .then(result => {
      callback(null, result);
    })
    .catch(e => {
      callback(e);
    });
};
