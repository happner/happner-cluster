function Brokerage(models, mesh, client, logger) {

  this.__models = models;
  this.__mesh = mesh;
  this.__client = client;
  this.logger = logger;
  this.__injectedElements = [];
  this.__client.on('dependency-met', this.__handleDependencyMet.bind(this));
}
//brokeredModels, mesh, client, logger
Brokerage.create = function(models, mesh, client, logger) {
  return new Brokerage(models, mesh, client, logger);
};

Brokerage.prototype.__handleDependencyMet = function(whatChanged) {

  this.__injectedElements
    .filter((injectedComponent) => {
      return injectedComponent.component.name == whatChanged.componentName;
    })
    .forEach((changedComponent) => {
      this.__updateInjectedComponent(changedComponent, whatChanged);
    });
}

Brokerage.prototype.__updateInjectedComponent = function(changedComponent, whatChanged) {
  let newModel = {};
  newModel[changedComponent.component.name] = whatChanged.description;
  let newAPI = this.__client.construct(newModel);
  let updatedElement = this.constructBrokeredElement(changedComponent.component.name, whatChanged.description, newAPI, true);
  this.__mesh._updateElement(updatedElement)
    .then(() => {
      this.logger.info('element re-injected: ' + changedComponent.component.name);
    })
    .catch((e) => {
      this.logger.error('element re-injection failed: ' + changedComponent.component.name, e);
    });
};

Brokerage.prototype.__checkDuplicateInjections = function() {

  let occurrences = {};

  Object.keys(this.__models).forEach((injectorKey) => {
    Object.keys(this.__models[injectorKey]).forEach((modelKey) => {
      if (!occurrences[modelKey]) occurrences[modelKey] = {
        injectors: [],
        count: 0
      };
      occurrences[modelKey].injectors.push(injectorKey);
      occurrences[modelKey].count++;
    });
  });

  for (let modelKey in occurrences)
    if (occurrences[modelKey].count > 1)
      throw new Error('Duplicate attempts to broker the ' + modelKey + ' component by ' + occurrences[modelKey].injectors.join(' & '));
};

Brokerage.prototype.detach = function(callback) {

  let elementsToDetach = this.__injectedElements
    .map((injectedComponent) => {
      return this.__mesh._destroyElement(injectedComponent.component.name);
    });

  Promise.all(elementsToDetach)
    .then(function(){
      callback();
    })
    .catch(callback);
};

Brokerage.prototype.constructBrokeredElement = function(brokeredComponentName, model, $happn, dynamic){
  return {
    module: {
      name: brokeredComponentName,
      config: {
        instance:  require('./broker').create(brokeredComponentName, model, $happn, dynamic)
      }
    },
    component: {
      name: brokeredComponentName,
      config: {
        version:model.version,
        schema:{
          methods:model.methods
        }
      }
    }
  };
};

Brokerage.prototype.injectBrokeredComponent = function(model) {
  let elementsToConstruct = Object.keys(model.package)
    .map((brokeredComponentName) => {
      let elementToInject = this.constructBrokeredElement(brokeredComponentName, model.package[brokeredComponentName], model.$happn);
      this.__injectedElements.push(elementToInject);
      return this.__mesh._createElement(elementToInject, true);
    });

  return Promise.all(elementsToConstruct);
};

Brokerage.prototype.inject = function(callback) {
  try {
    this.__checkDuplicateInjections(); //will throw if multiple components are injecting the same model
  }catch(e){
    return callback(e);
  }

  let modelsToInject = [];

  Object.keys(this.__models).forEach((injectorKey) => {
    modelsToInject.push(this.injectBrokeredComponent(this.__models[injectorKey]));
  });

  Promise.all(modelsToInject)
    .then(function(){
      callback();
    })
    .catch(callback);
};

module.exports = Brokerage;
