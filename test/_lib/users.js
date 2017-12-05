var Promise = require('bluebird');

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

module.exports.allowMethod = function (server, username, component, method) {
  var group = username + '_group';
  var path = '/DOMAIN_NAME/' + component + '/' + method;
  var permissions = { methods: {} };
  permissions.methods[path] = { authorized: true };

  return server.exchange.security.addGroupPermissions(group, permissions);
}
