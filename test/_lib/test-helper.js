const path = require("path");
module.exports = {
  testName: function(fileName, depth) {
    var partsArray = fileName.split(path.sep);
    return partsArray.slice(partsArray.length - depth).join("/");
  },
  expect: require("expect.js"),
  delay: require("await-delay")
};
