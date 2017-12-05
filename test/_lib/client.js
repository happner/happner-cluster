var Happner = require('happner-2');
var Promise = require('bluebird');

module.exports.create = function (username, password, port, callback) {
  var client = new Happner.MeshClient({
    hostname: 'localhost',
    port: port
  });

  client.login({
      username: username,
      password: password
    })
    .then(function () {
      callback(null);
    })
    .catch(callback);

  return client;
}

module.exports.callMethod = function (seq, client, component, method) {
  return new Promise(function (resolve) {

    client.exchange[component][method]()
      .then(function (result) {
        resolve({ seq: seq, result: result });
      })
      .catch(function (error) {
        resolve({ seq: seq, error: error.message });
      });

  });
}

module.exports.subscribe = function (seq, client, component, event, handler) {
  return new Promise(function (resolve) {

    client.event[component].on(event, handler, function (e) {
      if (e) return resolve({ seq: seq, error: e.message });
      resolve({ seq: seq, result: true });
    });

  });
}
