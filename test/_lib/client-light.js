const HappnerClient = require('happner-client');

module.exports.create = async function(domain, username, password, port) {
  const createdClient = new HappnerClient.Light({
    domain
  });
  await createdClient.connect({ username, password, port });
  return createdClient;
};
