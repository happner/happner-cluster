module.exports = RemoteComponent;

function RemoteComponent() {
}

RemoteComponent.prototype.start = function ($happn, callback) {
  this.interval = setInterval(function () {
    $happn.emit('event', {
      origin: $happn.info.mesh.name
    });
  }, 900);
  callback();
};

RemoteComponent.prototype.stop = function ($happn, callback) {
  clearInterval(this.interval);
  callback();
};

var timeout = 35000;

RemoteComponent.prototype.method1 = function ($happn, seq, callback) {

  if (timeout > 1) timeout = timeout - 1000;

  setTimeout(function(){

    console.log('timeout is:::', timeout);

    callback(null, seq + ':' + $happn.info.mesh.name  + ':' + $happn.name + ':method1');
  }, timeout);
};
