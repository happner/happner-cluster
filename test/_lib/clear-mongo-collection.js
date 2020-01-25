var MongoClient = require("mongodb").MongoClient;

module.exports = function(url, collectionName, callback) {
  MongoClient.connect(url, function(err, client) {
    if (err) return callback(err);

    var db = client.db(collectionName);
    var collection = db.collection(collectionName);

    collection.drop(function(err) {
      if (err && err.message !== "ns not found")
        //eslint-disable-next-line
        console.log("error clearing mongodb: " + err.message);
      client.close(callback);
    });
  });
};
