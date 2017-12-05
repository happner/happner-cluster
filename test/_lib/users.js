var Promise = require('bluebird');
var async = require('async');

module.exports.add = function (server, username, password, permissions) {
  var user = {
    username: username,
    password: password
  };

  var group = {
    name: username + '_group',
    permissions: permissions || {}
  }

  return Promise.all([
    server.exchange.security.addGroup(group),
    server.exchange.security.addUser(user)
  ]).spread(function (group, user) {
    return server.exchange.security.linkGroup(group, user);
  });
}

// can only process one permission change at a time
var queue = async.queue(function (task, callback) {
  var server = task.server;
  var group = task.group;
  var permissions = task.permissions;
  var method = task.method;
  server.exchange.security[method](group, permissions, callback);
}, 1);

module.exports.allowMethod = function (server, username, component, method) {
  var group = username + '_group';
  var path = '/DOMAIN_NAME/' + component + '/' + method;
  var permissions = { methods: {} };
  permissions.methods[path] = { authorized: true };

  return new Promise(function (resolve, reject) {
    queue.push({
      server: server,
      group: group,
      permissions: permissions,
      method: 'addGroupPermissions'
    }, function (err) {
      if (err) return reject(err);
      resolve();
    })
  });
}

module.exports.denyMethod = function (server, username, component, method) {
  var group = username + '_group';
  var path = '/DOMAIN_NAME/' + component + '/' + method;
  var permissions = { methods: {} };
  permissions.methods[path] = {};

  return new Promise(function (resolve, reject) {
    queue.push({
      server: server,
      group: group,
      permissions: permissions,
      method: 'removeGroupPermissions'
    }, function (err) {
      if (err) return reject(err);
      resolve();
    })
  });
}

module.exports.allowEvent = function (server, username, component, event) {
  var group = username + '_group';
  var path = '/DOMAIN_NAME/' + component + '/' + event;
  var permissions = { events: {} };
  permissions.events[path] = { authorized: true };

  return new Promise(function (resolve, reject) {
    queue.push({
      server: server,
      group: group,
      permissions: permissions,
      method: 'addGroupPermissions'
    }, function (err) {
      if (err) return reject(err);
      resolve();
    })
  });
}

module.exports.denyEvent = function (server, username, component, event) {
  var group = username + '_group';
  var path = '/DOMAIN_NAME/' + component + '/' + event;
  var permissions = { events: {} };
  permissions.events[path] = {};

  return new Promise(function (resolve, reject) {
    queue.push({
      server: server,
      group: group,
      permissions: permissions,
      method: 'removeGroupPermissions'
    }, function (err) {
      if (err) return reject(err);
      resolve();
    })
  });
}
