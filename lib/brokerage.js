function Brokerage(models, mesh, client, $happn) {

  this.__models = models;
  this.__mesh = mesh;
  this.__client = client;
  this.__$happn = $happn;
}

Brokerage.create = function(models, mesh, client, $happn) {
  return new Brokerage(models, mesh, client, $happn);
}

Brokerage.prototype.__checkDuplicateInjections = function() {

  var occurrences = {};
  var _this = this;

  Object.keys(_this.__models).forEach(function(injectorKey) {
    Object.keys(_this.__models[injectorKey]).forEach(function(modelKey) {
      if (!occurrences[modelKey]) occurrences[modelKey] = {
        injectors: [],
        count: 0
      };
      occurrences[modelKey].injectors.push(injectorKey);
      occurrences[modelKey].count++;
    });
  });

  for (var modelKey in occurrences)
    if (occurrences[modelKey].count > 1)
      throw new Error('Duplicate attempts to broker the ' + modelKey + ' component by ' + occurrences[modelKey].injectors.join(' & '));
}

Brokerage.prototype.detach = function(callback) {

  callback();
}

Brokerage.prototype.constructBrokeredElement = function(brokeredComponentName, model, $happn){

  return {
    module: {
      name: brokeredComponentName,
      config: {
        instance:  require('./broker').create(brokeredComponentName, model, $happn)
      }
    },
    component: {
      name: brokeredComponentName,
      config: model
    }
  }
}

Brokerage.prototype.injectBrokeredComponent = function(model) {

  var _this = this;

  var elementsToConstruct = Object.keys(model.package)
    .map(function(brokeredComponentName){
      return _this.__mesh._createElement(_this.constructBrokeredElement(brokeredComponentName, model.package[brokeredComponentName], model.$happn));
    });

  return Promise.all(elementsToConstruct);
}

Brokerage.prototype.inject = function(callback) {

  var _this = this;
  _this.__checkDuplicateInjections(); //will throw if multiple components are injecting the same model
  var modelsToInject = [];

  Object.keys(_this.__models).forEach(function(injectorKey) {
    var model = _this.__models[injectorKey]
    modelsToInject.push(_this.injectBrokeredComponent(model))
  });

  Promise.all(modelsToInject)
    .then(function(){
      callback();
    })
    .catch(callback);
}

module.exports = Brokerage;
