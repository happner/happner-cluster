let brokerWebProxyInstances = {};

module.exports = class BrokerWebProxy {
  constructor(mesh, logger){
    this.httpProxy = require('http-proxy').createProxyServer();
    this.httpProxy.on('error', this.__onProxyError.bind(this));
    this.HashRing = require('hashring');
    this.mesh = mesh;
    this.logger = logger;
    this.routes = {};
    this.proxies = {};
    brokerWebProxyInstances[mesh._mesh.config.name] = this;
  }

  static create(mesh, logger){
    return new BrokerWebProxy(mesh, logger);
  }

  static instance (meshName){
    return brokerWebProxyInstances[meshName];
  }

  __onProxyError(err, req, res){
    this.logger.warn(`proxy error occurred for url: ${req.url}, error: ${err.message}`);
    res.writeHead(500);
    res.end();
  }

  getProtocol(req){
    return req.connection.encrypted ? 'https' : 'http';
  }

  selectTarget(peers, req){
    let requestToken = this.mesh._mesh.happn.server.services.security.tokenFromRequest(req) || Date.now();
    return peers.get(requestToken);
  }

  handleRequest(req, res, next){
    let path = require('url').parse(req.url).pathname;
    let route = this.routes[path];
    if (!route || route.size == 0) return next();
    let target = this.selectTarget(route.peers, req);
    if (!target) return next();
    return this.httpProxy.web(req, res, { target });
  }

  async attachToClusterMiddlewareServer(clusterMiddlewareServer){
    clusterMiddlewareServer.use(this.handleRequest.bind(this));
  }

  connectRoute(path, target){
    this.routes[path] = this.routes[path] || {size:0, peers:new this.HashRing()};
    this.routes[path].peers.add(target.url);
    this.routes[path].size++;
    this.logger.info(`added route ${target.url}, route handlers count: ${this.routes[path].size}`);
  }

  disconnectRoute(path, target){
    if (this.routes[path]){
      this.routes[path].peers.remove(target.url);
      this.routes[path].size--;
      this.logger.info(`removed route ${target.url}, route handlers count: ${this.routes[path].size}`);
      if (this.routes[path].size == 0) delete this.routes[path];
    }
  }

  connectRoutes(model, url){
    Object.keys(model.routes).forEach((path) => {
      this.connectRoute(path, {version:model.version, name:model.name, url});
    });
  }

  disconnectRoutes(model, url){
    Object.keys(model.routes).forEach((path) => {
      this.disconnectRoute(path, {version:model.version, name:model.name, url});
    });
  }
};
