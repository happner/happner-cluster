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

    if (!subscription.subscription.fullPath.match(/\/_events\/[A-Za-z]/)) {
      subscription.__keep = true;
      return;
    }

    //
    // "subscriptionData": {
    //   "0": {
    //     "options": {
    //       "event_type": "set",
    //       "meta": {
    //         "componentVersion": "^2.0.0"
    //       },
    //       "count": 0,
    //         "listenerId": 0,
    //         "refCount": 1,
    //         "timeout": 30000
    //     },
    //     "session": {
    //       "id": "faef1742-1eb4-4e50-a67e-5ced35a1d599",
    //         "protocol": "happn_1.3.0",
    //         "happn": {
    //         "name": "MESH_1",
    //           "secure": false,
    //           "encryptPayloads": false,
    //           "publicKey": "A7WZN0jxcdiEGbQ3fDOHgdaG/3A6X8i/1/AyaVj5D3k6"
    //       },
    //       "info": {
    //         "name": "MESH_1",
    //           "memberId": "127.0.0.1:56001",
    //           "url": "http://192.168.0.101:57001",
    //           "_browser": false,
    //           "_local": true
    //       }
    //     }
    //   }
    // },

    try {
      subKeys = Object.keys(subscription.subscription.subscriptionData);

      for (var i = 0; i < subKeys.length; i++) {
        subData = subscription.subscription.subscriptionData[subKeys[i]];
        if (!subData.options) {
          subscription.__keep = true;
          break;
        }
        if (!subData.options.meta) {
          subscription.__keep = true;
          break;
        }
        if (!subData.options.meta.componentVersion) {
          subscription.__keep = true;
          break;
        }
        if (semver.satisfies(
            message.request.options.meta.componentVersion,
            subData.options.meta.componentVersion
          )) {
          subscription.__keep = true;
          break;
        }
      }
    } catch (e) {
      subscription.__keep = true; // fallback to clientside filter
    }

  });


  callback(null, recipients.filter(function (subscription) {
    return subscription.__keep;
  }));
};
