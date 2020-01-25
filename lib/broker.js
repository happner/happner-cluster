module.exports = class Broker {
  constructor(brokeredComponentName, model, $happn, mesh, url, dynamic) {
    this.__brokeredComponentName = brokeredComponentName;
    this.__model = model;
    this.__$happn = $happn;
    this.__mesh = mesh;
    this.__url = url;
    this.dynamic = dynamic;
    this.__internalClient = $happn.exchange[brokeredComponentName];
    this.__mapExternalToInternalMethods(dynamic);
    if (model && model.routes && Object.keys(model.routes).length > 0 && url)
      this.__proxyExternalToInternalRoutes(model, $happn, mesh, url);
  }

  static create(brokeredComponentName, model, $happn, mesh, url, dynamic) {
    return new Broker(brokeredComponentName, model, $happn, mesh, url, dynamic);
  }

  __mapExternalToInternalMethods(dynamic) {
    if (dynamic)
      return Object.keys(this.__internalClient).forEach(methodName => {
        if (typeof this.__internalClient[methodName] === "function")
          this[methodName] = this.__internalClient[methodName];
      });

    if (this.__model.methods)
      Object.keys(this.__model.methods).forEach(methodName => {
        this[methodName] = this.__internalClient[methodName];
      });
  }

  __proxyExternalToInternalRoutes(model, $happn, mesh, url) {
    require("./broker-web-proxy")
      .instance(mesh._mesh.config.name)
      .connectRoutes(model, url);
  }

  disconnect() {
    require("./broker-web-proxy")
      .instance(this.__mesh._mesh.config.name)
      .disconnectRoutes(this.__model, this.__url);
  }
};
