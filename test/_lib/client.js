var Happner = require('happner-2');
var Promise = require('bluebird');

module.exports.create = function(username, password, port, authType) {
  return new Promise(function(resolve, reject) {
    var client = new Happner.MeshClient({
      hostname: 'localhost',
      port
    });

    client.username = username;
    let creds = {
      username,
      password
    };
    if (authType) creds.authType = authType;
    client
      .login(creds)
      .then(function() {
        resolve(client);
      })
      .catch(reject);
  });
};

module.exports.destroy = function(client) {
  return new Promise(function(resolve, reject) {
    client.disconnect(function(e) {
      if (e) return reject(e);
      resolve();
    });
  });
};

module.exports.callMethod = function(seq, client, component, method) {
  return new Promise(function(resolve) {
    client.exchange[component][method]()
      .then(function(result) {
        resolve({
          seq: seq,
          user: client.username,
          component: component,
          method: method,
          result: result
        });
      })
      .catch(function(error) {
        resolve({
          seq: seq,
          user: client.username,
          component: component,
          method: method,
          error: error.message
        });
      });
  });
};

module.exports.subscribe = function(seq, client, component, event, handler) {
  return new Promise(function(resolve) {
    client.event[component].on(event, handler, function(e) {
      if (e) return resolve({ seq: seq, error: e.message });
      resolve({ seq: seq, result: true });
    });
  });
};
