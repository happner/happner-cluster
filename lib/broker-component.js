function BrokerComponent(package, mesh, client){
  this.__package = package;
  this.__mesh = mesh;
  this.__client = client;
}

BrokerComponent.prototype.break = function(){

}

BrokerComponent.bridge = function(package, mesh, client){

  return new BrokerComponent(package, mesh, client);
}

module.exports = BrokerComponent;
