const PORT_CONSTANTS = require('./port-constants');
module.exports = class GetSeq {
  constructor(num, first = null, constants = null) {
    if (first) this.first = first;
    this.num = num || 1;
    this.constants = constants || PORT_CONSTANTS;
  }
  getNext() {
    return [this.first, this.num++];
  }

  getFirst() {
    this.first = this.num;
    return [this.first, this.num++];
  }
  getLast() {
    this.last = this.num;
    return [this.first, this.num++];
  }

  getCurrent() {
    return [this.first, this.num - 1];
  }

  getPort(num) {
    return this.constants.PROXY_BASE + this.first + num - 1;
  }
  getHappnPort(num) {
    return this.constants.HAPPN_BASE + this.first + num - 1;
  }
  getSwimPort(num) {
    return this.constants.SWIM_BASE + this.first + num - 1;
  }
  getProxyPort(num) {
    return this.constants.PROXY_BASE + this.first + num - 1;
  }

  getMeshName(num) {
    let meshNum = this.first + num - 1;
    return 'MESH_' + meshNum.toString();
  }
  lookupFirst() {
    return this.first;
  }
  lookupLast() {
    return this.last;
  }
};
