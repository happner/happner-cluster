const path = require('path');
const callsites = require('callsites');
const TestHelper = {
  getTestFile() {
    const calls = callsites();
    for (const call of calls) {
      if (call.getFileName().endsWith('test-helper.js')) continue;
      return call.getFileName();
    }
  },
  describe(cb, timeout = 10e3) {
    const testName = TestHelper.testName(null, 4);
    describe(testName, function() {
      this.timeout(timeout);
      cb(TestHelper);
    });
  },
  testName: function(fileName, depth = 4) {
    if (!fileName) fileName = TestHelper.getTestFile();
    const partsArray = fileName.split(path.sep);
    return partsArray.slice(partsArray.length - depth).join('/');
  },
  expect: require('expect.js'),
  delay: require('await-delay'),
  path: require('path'),
  sinon: require('sinon'),
  why: require('why-is-node-running'),
  baseConfig: require('./base-config'),
  HappnerCluster: require('../..'),
  stopCluster: require('./stop-cluster'),
  clearMongoCollection: require('./clear-mongo-collection'),
  getSeq: require('./helpers/getSeq'),
  client: require('./client'),
  axios: require('axios').default
};
module.exports = TestHelper;
