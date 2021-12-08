module.exports = Component;

function Component() {}

Component.prototype.start = function(callback) {
  callback();
};

Component.prototype.stop = function(callback) {
  callback();
};

Component.prototype.callRemote = function($happn, callback) {
  $happn.asAdmin.exchange
    .$call({
      component: 'remoteComponent',
      method: 'remoteMethod',
      arguments: []
    })
    .then(result => {
      callback(null, result);
    })
    .catch(e => {
      callback(e);
    });
};
