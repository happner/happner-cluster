function Broker(brokeredComponentName, model, $happn){
  this.__brokeredComponentName = brokeredComponentName;
  this.__model = model;
  this.__$happn = $happn;
  this.__internalClient = $happn.exchange[brokeredComponentName];
  this.__mapExternalToInternalMethods();
}

Broker.prototype.__mapExternalToInternalMethods = function(){

  var _this = this;

  Object.keys(_this.__model.methods).forEach(function(methodName){
    _this[methodName] = _this.__internalClient[methodName];
  });
}

Broker.create = function(brokeredComponentName, model, $happn){
  return new Broker(brokeredComponentName, model, $happn);
}

module.exports = Broker;
