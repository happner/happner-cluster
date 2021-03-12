var Promise = require('bluebird');
var async = require('async');

module.exports.add = function(server, username, password, permissions) {
  var user = {
    username: username,
    password: password,
    permissions: permissions || {}
  };
  return server.exchange.security.addUser(user);
};

module.exports.generatePermissions = function(user) {
  var component, event, method, path;
  var allowedEvents = user.allowedEvents;
  var allowedMethods = user.allowedMethods;

  var permissions = {
    methods: {},
    events: {}
  };
  for (component in allowedMethods) {
    for (method in allowedMethods[component]) {
      path = '/DOMAIN_NAME/' + component + '/' + method;
      permissions.methods[path] = { authorized: true };
    }
  }
  for (component in allowedEvents) {
    for (event in allowedEvents[component]) {
      path = '/DOMAIN_NAME/' + component + '/' + event;
      permissions.events[path] = { authorized: true };
    }
  }
  return permissions;
};

// can only process one permission change at a time
var queue = async.queue(function(task, callback) {
  var server = task.server;
  var username = task.username;
  var permissions = task.permissions;
  var method = task.method;
  server.exchange.security[method](username, permissions, callback);
}, 1);

module.exports.allowMethod = function(server, username, component, method) {
  var path = '/DOMAIN_NAME/' + component + '/' + method;
  var permissions = { methods: {} };
  permissions.methods[path] = { authorized: true };

  return new Promise(function(resolve, reject) {
    queue.push(
      {
        server: server,
        username,
        permissions: permissions,
        method: 'addUserPermissions'
      },
      function(err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });
};

module.exports.denyMethod = function(server, username, component, method) {
  var path = '/DOMAIN_NAME/' + component + '/' + method;
  var permissions = { methods: {} };
  permissions.methods[path] = {};

  return new Promise(function(resolve, reject) {
    queue.push(
      {
        server: server,
        username,
        permissions: permissions,
        method: 'removeUserPermissions'
      },
      function(err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });
};

module.exports.allowWebMethod = function(server, username, path) {
  var permissions = { web: {} };
  permissions.web[path] = {
    actions: ['get', 'put', 'post'],
    description: 'a test web permission'
  };
  return new Promise(function(resolve, reject) {
    queue.push(
      {
        server: server,
        username,
        permissions: permissions,
        method: 'addUserPermissions'
      },
      function(err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });
};

module.exports.denyWebMethod = function(server, username, path) {
  var permissions = { web: {} };
  permissions.web[path] = {};

  return new Promise(function(resolve, reject) {
    queue.push(
      {
        server: server,
        username,
        permissions: permissions,
        method: 'removeUserPermissions'
      },
      function(err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });
};

module.exports.allowEvent = function(server, username, component, event) {
  var path = '/DOMAIN_NAME/' + component + '/' + event;
  var permissions = { events: {} };
  permissions.events[path] = { authorized: true };

  return new Promise(function(resolve, reject) {
    queue.push(
      {
        server: server,
        username,
        permissions: permissions,
        method: 'addUserPermissions'
      },
      function(err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });
};

module.exports.denyEvent = function(server, username, component, event) {
  var path = '/DOMAIN_NAME/' + component + '/' + event;
  var permissions = { events: {} };
  permissions.events[path] = {};

  return new Promise(function(resolve, reject) {
    queue.push(
      {
        server: server,
        username,
        permissions: permissions,
        method: 'removeUserPermissions'
      },
      function(err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });
};

module.exports.allowDataPath = function(server, username, path) {
  var permissions = { data: {} };
  permissions.data[path] = { actions: ['*'] };

  return new Promise(function(resolve, reject) {
    queue.push(
      {
        server: server,
        username,
        permissions: permissions,
        method: 'addUserPermissions'
      },
      function(err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });
};

module.exports.denyDataPath = function(server, username, path) {
  var permissions = { data: {} };
  permissions.data[path] = { authorized: false };

  return new Promise(function(resolve, reject) {
    queue.push(
      {
        server: server,
        username,
        permissions: permissions,
        method: 'removeUserPermissions'
      },
      function(err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });
};

module.exports.getUser = function(server, username) {
  return new Promise((res, rej) => {
    server.exchange.security.getUser(username, (e, user) => {
      if (e) return rej(e);
      res(user);
    });
  });
};
