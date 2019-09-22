module.exports = Component;

function Component() {}

Component.prototype.start = function($happn, callback) {
  callback();
};

Component.prototype.stop = function($happn, callback) {
  callback();
};

Component.prototype.brokeredMethod1 = function($happn, callback) {
  callback(null, $happn.info.mesh.name + ':remoteComponent1:brokeredMethod1');
};

Component.prototype.brokeredMethod2 = function($happn, callback) {
  callback(null, $happn.info.mesh.name + ':remoteComponent1:brokeredMethod2');
};

Component.prototype.brokeredMethod3 = function($happn, $origin, param, callback) {
  callback(null, `${$happn.info.mesh.name}:remoteComponent1:brokeredMethod3:${param}:${$origin.username}`);
};

Component.prototype.testJSON = function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({"test": "data"}));
};

Component.prototype.testJSONSticky = function ($happn, req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({"ran_on": `${$happn.info.mesh.name}`}));
};

Component.prototype.brokeredEventEmitMethod = function($happn, callback) {
  $happn.emit('/brokered/event1', {
    brokered: {
      event: {
        data: {
          from: $happn.info.mesh.name
        }
      }
    }
  });
  callback(null, $happn.info.mesh.name + ':remoteComponent1:brokeredEventEmitMethod');
};
