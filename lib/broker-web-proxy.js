let brokerWebProxyInstances = {};

module.exports = class BrokerWebProxy {
  constructor(mesh){
    this.httpProxy = require('http-proxy').createProxyServer();
    this.mesh = mesh;
    this.routes = {};
    this.proxies = {};
    brokerWebProxyInstances[mesh._mesh.config.name] = this;
  }

  static create(mesh){
    return new BrokerWebProxy(mesh);
  }

  static instance (meshName){
    return brokerWebProxyInstances[meshName];
  }

  getProtocol(req){
    return req.connection.encrypted ? 'https' : 'http';
  }

  selectTarget(peers){
    //TODO: round robin?
    return peers[0];
  }

  handleRequest(req, res, next){
    let path = require('url').parse(req.url).pathname;
    let peers = this.routes[path];
    if (!peers || peers.length == 0) return next();

    let target = this.selectTarget(peers);
    return this.httpProxy.web(req, res, { target:target.url });
  }

  async attachToClusterMiddlewareServer(clusterMiddlewareServer){
    clusterMiddlewareServer.use(this.handleRequest.bind(this));
  }

  connectRoute(path, url){
    this.routes[path] = this.routes[path] || [];
    this.routes[path].push(url);
  }

  connectRoutes(model, url){
    Object.keys(model.routes).forEach((path) => {
      this.connectRoute(path, {version:model.version, name:model.name, url});
    });
  }

  disconnectRoutes(model, $happn){

  }
};
