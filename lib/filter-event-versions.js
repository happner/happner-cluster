var semver = require('semver');

module.exports = function (message, recipients, callback) {

  if (!message.request) return callback(null, recipients);
  if (!message.request.options) return callback(null, recipients);
  if (!message.request.options.meta) return callback(null, recipients);
  if (!message.request.options.meta.componentVersion) return callback(null, recipients);
  if (!recipients[0]) return callback(null, recipients);

  recipients.forEach(function (subscription) {
    var subKeys, subData;

    subscription.__keep = false;

    if (!subscription.data.path.match(/\/_events\/[A-Za-z]/)) {
      subscription.__keep = true;
      return;
    }

    try {
      var data = subscription.data;

      if (!data.options) {
        subscription.__keep = true;
        return;
      }

      if (!data.options.meta) {
        subscription.__keep = true;
        return;
      }

      if (!data.options.meta.componentVersion) {
        subscription.__keep = true;
        return;
      }

      if (semver.satisfies(
        message.request.options.meta.componentVersion,
        data.options.meta.componentVersion
      )) {
        subscription.__keep = true;
        return;
      }

    } catch (e) {
      subscription.__keep = true; // fallback to clientside filter
    }

  });

  callback(null, recipients.filter(function (subscription) {
    return subscription.__keep;
  }));
};
