module.exports.gotConfig = function(config) {
  if (!config.happn.services.data) return false;
  if (!config.happn.services.data.config) return false;
  if (!config.happn.services.data.config.datastores) return false;

  var present = false;
  config.happn.services.data.config.datastores.forEach(function(ds) {
    if (!ds.patterns) return;

    // use /nesh/schema to spot the nedb datastore
    if (ds.patterns.indexOf("/mesh/schema/*") >= 0) {
      if (ds.patterns.indexOf("/_SYSTEM/_NETWORK/_SETTINGS/NAME") < 0) {
        ds.patterns.push("/_SYSTEM/_NETWORK/_SETTINGS/NAME");
      }

      if (ds.patterns.indexOf("/_SYSTEM/_SECURITY/_SETTINGS/KEYPAIR") < 0) {
        ds.patterns.push("/_SYSTEM/_SECURITY/_SETTINGS/KEYPAIR");
      }

      present = true;
    }
  });

  return present;
};

module.exports.addConfig = function(config) {
  config.happn.services.data = config.happn.services.data || {};
  config.happn.services.data.config = config.happn.services.data.config || {};
  config.happn.services.data.config.datastores =
    config.happn.services.data.config.datastores || [];
  config.happn.services.data.config.datastores.push({
    name: "nedb-own-schema",
    settings: {},
    patterns: [
      "/mesh/schema/*",
      "/_SYSTEM/_NETWORK/_SETTINGS/NAME",
      "/_SYSTEM/_SECURITY/_SETTINGS/KEYPAIR"
    ]
  });
};
