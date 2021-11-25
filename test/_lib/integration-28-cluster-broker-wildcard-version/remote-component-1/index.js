module.exports = Component;
var methodCalls = 0;

function Component() {}

Component.prototype.start = function($happn, callback) {
  callback();
};

Component.prototype.stop = function($happn, callback) {
  callback();
};

Component.prototype.declaredMethod = function($happn, $req_headers, callback) {
  let headers = '';
  if (typeof $req_headers === 'function') {
    callback = $req_headers;
  } else headers = ':true';

  methodCalls++;
  $happn.emit(`test/${methodCalls}`, {}, () => {
    if (methodCalls % 1000 === 0)
      // eslint-disable-next-line no-console
      console.log(`brokeredMethod1 call count:::${methodCalls}`);
    callback(null, `${$happn.info.mesh.name}:remoteComponent1:declaredMethod${headers}`);
  });
};

Component.prototype.undeclaredMethod = function($happn, callback) {
  callback(null, $happn.info.mesh.name + ':remoteComponent1:undeclaredMethod');
};
