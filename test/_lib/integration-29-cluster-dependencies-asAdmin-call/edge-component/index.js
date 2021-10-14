module.exports = Component;

function Component() {}

Component.prototype.start = function($happn, callback) {
  callback();
};

Component.prototype.stop = function($happn, callback) {
  callback();
};

Component.prototype.callRemote = function($happn, callback) {
  $happn.exchange
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
