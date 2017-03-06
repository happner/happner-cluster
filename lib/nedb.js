module.exports.gotConfig = function (config) {
  if (!config.happn.services.data) return false;
  if (!config.happn.services.data.config) return false;
  if (!config.happn.services.data.config.datastores) return false;

  var present = false;
  config.happn.services.data.config.datastores.forEach(function (ds) {
    if (!ds.patterns) return;
    if (ds.patterns.indexOf('/mesh/schema/*') >= 0) {
      present = true;
    }
  });

  return present;
};

module.exports.addConfig = function (config) {
  config.happn.services.data = config.happn.services.data || {};
  config.happn.services.data.config = config.happn.services.data.config || {};
  config.happn.services.data.config.datastores = config.happn.services.data.config.datastores || [];
  config.happn.services.data.config.datastores.push({
    name: 'nedb-own-schema',
    settings: {},
    patterns: [
      '/mesh/schema/*'
    ]
  });
};
