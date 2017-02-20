var HappnerCluster = require('../..');

module.exports = function (seq) {

  HappnerCluster.create({

  })

    .catch(function (error) {
      console.error(error);
      process.exit(1);
    })

};
