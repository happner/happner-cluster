module.exports = Component;

function Component() {}

Component.prototype.start = function($happn, callback) {
  callback();
};

Component.prototype.stop = function($happn, callback) {
  callback();
};

Component.prototype.breakingMethod = function($happn, a, b, callback) {
  if (callback) return callback(null, 'I am happy!');
  process.send('kill');
};

Component.prototype.happyMethod = function($happn, callback) {
  callback(null, $happn.info.mesh.name + ':brokenComponent:happyMethod');
};
