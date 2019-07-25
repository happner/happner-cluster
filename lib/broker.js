function Broker(brokeredComponentName, model, $happn, dynamic) {
  this.__brokeredComponentName = brokeredComponentName;
  this.__model = model;
  this.__$happn = $happn;
  this.__internalClient = $happn.exchange[brokeredComponentName];
  this.__mapExternalToInternalMethods(dynamic);
}

Broker.prototype.__mapExternalToInternalMethods = function(dynamic) {
  if (!dynamic) {
    if (this.__model.methods)
      Object.keys(this.__model.methods).forEach((methodName) => {
        this[methodName] = this.__internalClient[methodName];
      });
  } else {
    Object.keys(this.__internalClient).forEach((methodName) => {
      if (typeof this.__internalClient[methodName] == 'function')
        this[methodName] = this.__internalClient[methodName];
    });
  }
};

Broker.create = function(brokeredComponentName, model, $happn) {
  return new Broker(brokeredComponentName, model, $happn);
};

module.exports = Broker;
