var MongoClient = require('mongodb').MongoClient;

module.exports = function (url, collectionName, callback) {
  MongoClient.connect(url, function (err, client) {
    if (err) return callback(err);

    var db = client.db(collectionName);
    var collection = db.collection(collectionName);

    collection.drop(function (err) {
      if (err && err.message == 'ns not found') {
        return callback(null); // no such collection to delete
      }
      callback(err);
    });
  });
};
