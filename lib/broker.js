function Broker(brokeredComponentName, model, $happn){
  this.__brokeredComponentName = brokeredComponentName;
  this.__model = model;
  this.__$happn = $happn;
  this.__internalClient = $happn.exchange[brokeredComponentName];
  this.__mapExternalToInternalMethods();
}

Broker.prototype.__mapExternalToInternalMethods = function(){
  Object.keys(this.__model.methods).forEach((methodName) => {
    this[methodName] = this.__internalClient[methodName];
  });
};

Broker.create = function(brokeredComponentName, model, $happn){
  return new Broker(brokeredComponentName, model, $happn);
};

module.exports = Broker;
