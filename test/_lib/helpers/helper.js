// return first external ipv4 address
const os = require('os');

module.exports = class Helper extends require('events').EventEmitter {
  constructor() {
    super();
    this.delay = require('await-delay');
    this.address = {
      self: interfaces => {
        const NETWORK_INTERFACE = parseInt(process.env['NETWORK_INTERFACE']) || 0;
        interfaces = interfaces || os.networkInterfaces();
        let addresses = Object.keys(interfaces)
          .reduce((acc, current) => [...acc, ...interfaces[current]], [])
          .filter(iface => !iface.internal && iface.family === 'IPv4')
          .map(iface => iface.address);
        if (NETWORK_INTERFACE && addresses.length >= NETWORK_INTERFACE + 1)
          return addresses[NETWORK_INTERFACE];
        return addresses[0];
      }
    };
  }
};
