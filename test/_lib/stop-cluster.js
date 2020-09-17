var Promise = require('bluebird');

module.exports = function(servers, done) {
  Promise.resolve(servers)
    .map(
      function(server) {
        return server.stop({ reconnect: false }).then(function() {
          // stopping all at once causes replicator client happn logouts to timeout
          // because happn logout attempts unsubscribe on server, and all servers
          // are gone
          return Promise.delay(200); // ...so pause between stops (long for travis)
        });
      },
      { concurrency: 1 }
    ) // ...and do them one at a time
    .then(function() {
      done();
    })
    .catch(done);
};
