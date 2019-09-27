module.exports = function (seq, minPeers, secure, requestTimeout, responseTimeout) {

  var clusterRequestTimeout = requestTimeout?requestTimeout:10 * 1000;
  var clusterResponseTimeout = responseTimeout?responseTimeout:20 * 1000;

  return {
    name: 'MESH_' + seq,
    domain: 'DOMAIN_NAME',
    port: 57000 + seq,
    cluster: {
      requestTimeout: clusterRequestTimeout,
      responseTimeout: clusterResponseTimeout
    },
    happn: {
      secure: secure,
      services: {
        security:{
          config:{
            sessionTokenSecret:'TEST-SESSION-TOKEN-SECRET'
          }
        },
        data:{
          config:{
            autoUpdateDBVersion:true
          }
        },
        membership: {
          config: {
            host: '127.0.0.1',
            port: 56000 + seq,
            seed: seq == 1,
            seedWait: 300,
            hosts: ['127.0.0.1:56001']
          }
        },
        proxy: {
          config: {
            port: 55000 + seq
          }
        },
        orchestrator: {
          config: {
            minimumPeers: minPeers || 3
          }
        }
      }
    }
  }
};
