module.exports = LocalComponent;

function LocalComponent() {}

LocalComponent.prototype.start = function($happn, callback) {
  var _this = this;

  // interval call method into cluster
  // (remote-component only "implemented" when other cluster members are running)
  var sequence = 0;
  this.interval = setInterval(function() {
    !(function(seq) {
      $happn.data.set('/something/here', { seq: seq });

      $happn.exchange['remote-component']
        .method1(seq)
        .then(function(result) {
          $happn.log.info('%d reply %s', seq, result);
        })
        .catch(function(error) {
          $happn.log.error('%d error %s', seq, error.toString());
        });
    })(sequence++);
  }, 900);

  // subscribe to cluster events
  $happn.event['remote-component'].on(
    'event',
    function(data) {
      $happn.log.info('event from %s', data.origin);
    },
    function(e, subscriptionId) {
      if (e) {
        $happn.log.error('failed to subscribe to event');
        return;
      }
      _this.subscriptionId = subscriptionId;
    }
  );

  callback();
};

LocalComponent.prototype.stop = function($happn, callback) {
  clearInterval(this.interval);

  if (this.subscriptionId) {
    $happn.event['remote-component'].off(this.subscriptionId);
  }

  callback();
};
