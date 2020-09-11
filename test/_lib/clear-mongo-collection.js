var MongoClient = require('mongodb').MongoClient;

module.exports = function(url, collectionName, callback) {
  return new Promise((resolve, reject) => {
    const resolveInternal = result => {
      if (callback) callback(null, result);
      resolve(result);
    };
    const rejectInternal = err => {
      if (callback) callback(err);
      reject(err);
    };
    MongoClient.connect(url, function(err, client) {
      if (err) return rejectInternal(err);
      var db = client.db(collectionName);
      var collection = db.collection(collectionName);
      collection.drop(function(err) {
        if (err && err.message !== 'ns not found')
          //eslint-disable-next-line
          console.log("error clearing mongodb: " + err.message);
        client.close(function(err) {
          if (err)
            //eslint-disable-next-line
          console.log("error closing mongodb: " + err.message);
          resolveInternal();
        });
      });
    });
  });
};
