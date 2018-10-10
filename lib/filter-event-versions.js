var semver = require('semver');

module.exports = function (message, recipients) {

  if (!message.request) return recipients;
  if (!message.request.options) return recipients;
  if (!message.request.options.meta) return recipients;
  if (!message.request.options.meta.componentVersion) return recipients;
  if (!recipients[0]) return recipients;

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

  return recipients.filter(function (subscription) {
    return subscription.__keep;
  });
};
