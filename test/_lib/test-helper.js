const path = require('path');
module.exports = {
  testName: function(fileName, depth = 3) {
    var partsArray = fileName.split(path.sep);
    return partsArray.slice(partsArray.length - depth).join('/');
  },
  expect: require('expect.js'),
  delay: require('await-delay'),
  path: require('path'),
  sinon: require('sinon'),
  why: require('why-is-node-running')
};
