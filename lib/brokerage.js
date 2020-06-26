let brokerageInstances = {};

function Brokerage(models, mesh, client, logger, clusterConfig) {
  this.__models = models;
  this.__mesh = mesh;
  this.__client = client;
  this.logger = logger;
  this.__injectedElements = [];
  this.__injectedElementNames = [];
  this.__satisfiedElementNames = [];
  this.__client.on(
    "peer/arrived/description",
    this.__handlePeerArrived.bind(this)
  );
  this.__client.on(
    "peer/departed/description",
    this.__handlePeerDeparted.bind(this)
  );
  this.__dependenciesSatisfied = false;
  this.__clusterConfig = clusterConfig || {};
  brokerageInstances[mesh._mesh.config.name] = this;
}

Brokerage.create = function(models, mesh, client, logger, clusterConfig) {
  return new Brokerage(models, mesh, client, logger, clusterConfig);
};

Brokerage.instance = function(meshName) {
  return brokerageInstances[meshName];
};

Brokerage.prototype.deferProxyStart = function(proxy) {
  return new Promise(resolve => {
    this.__proxy = proxy;
    resolve();
  });
};

Brokerage.prototype.dependenciesSatisfied = function() {
  let satisfied = this.__satisfiedElementNames
    .filter((elementName, elementIndex) => {
      return this.__satisfiedElementNames.indexOf(elementName) === elementIndex;
    })
    .sort();
  let injected = this.__injectedElementNames.sort();
  return satisfied.join("") === injected.join("");
};

Brokerage.prototype.__checkDependenciesSatisfied = function() {
  if (
    this.__dependenciesSatisfied ||
    !this.__clusterConfig.dependenciesSatisfiedDeferListen
  )
    return; //only do this once
  this.__dependenciesSatisfied = this.dependenciesSatisfied();
  if (this.__dependenciesSatisfied) this.__proxy.start(); //now we can receive client connections
};

Brokerage.prototype.__handlePeerArrived = function(peer) {
  this.__injectedElements
    .filter(injectedComponent => {
      return injectedComponent.component.name === peer.componentName;
    })
    .forEach(changedComponent => {
      this.__updateInjectedComponent(changedComponent, peer);
    });
};

Brokerage.prototype.__handlePeerDeparted = function(peer) {
  this.__injectedElements
    .filter(injectedComponent => {
      return injectedComponent.meshName === peer.meshName;
    })
    .forEach(changedComponent => {
      changedComponent.module.instance.disconnect();
      const changedComponentIndex = this.__injectedElements.indexOf(
        changedComponent
      );

      //see how many components of this name we have
      const componentCount = this.__injectedElements.filter(
        injectedComponent => {
          return (
            injectedComponent.component.name === changedComponent.component.name
          );
        }
      ).length;

      //if we have more than 1 we can remove this one,
      //if not we must leave this as a 'placeholder'
      if (componentCount > 1) {
        this.__injectedElements.splice(changedComponentIndex, 1);
      } else {
        //set the meshName to null, so this component is replaced when a brokered to peer arrives
        this.__injectedElements[changedComponentIndex].meshName = null;
      }
    });
};

Brokerage.prototype.__updateInjectedComponent = function(
  changedComponent,
  whatChanged
) {
  let newModel = {};
  newModel[changedComponent.component.name] = { ...whatChanged.description };
  newModel[changedComponent.component.name].version = whatChanged.version;
  let newAPI = this.__client.construct(newModel);
  let updatedElement = this.constructBrokeredElement(
    changedComponent.component.name,
    whatChanged.description,
    newAPI,
    whatChanged.url,
    true,
    whatChanged.meshName
  );
  updatedElement.module.version = updatedElement.component.config.version;
  this.__mesh
    ._updateElement(updatedElement)
    .then(() => {
      this.__updateInjectedElements(changedComponent, updatedElement);
      this.logger.info(
        "element re-injected: " + changedComponent.component.name
      );
      this.__satisfiedElementNames.push(changedComponent.component.name);
      this.__checkDependenciesSatisfied();
    })
    .catch(e => {
      this.logger.error(
        "element re-injection failed: " + changedComponent.component.name,
        e
      );
    });
};

Brokerage.prototype.__updateInjectedElements = function(
  changedComponent,
  updatedElement
) {
  const changedComponentIndex = this.__injectedElements.indexOf(
    changedComponent
  );

  if (changedComponentIndex === -1 || changedComponent.meshName)
    return this.__injectedElements.push(updatedElement); //a new changed component has been injected, push it to our injected elements

  //this is the 'place holder' preconfigured component
  //we replace it
  return this.__injectedElements.splice(
    changedComponentIndex,
    1,
    updatedElement
  );
};

Brokerage.prototype.__checkDuplicateInjections = function() {
  let occurrences = {};

  Object.keys(this.__models).forEach(injectorKey => {
    Object.keys(this.__models[injectorKey].package).forEach(modelKey => {
      if (!occurrences[modelKey])
        occurrences[modelKey] = {
          injectors: [],
          count: 0
        };
      occurrences[modelKey].injectors.push(injectorKey);
      occurrences[modelKey].count++;
    });
  });

  for (let modelKey in occurrences)
    if (occurrences[modelKey].count > 1)
      throw new Error(
        "Duplicate attempts to broker the " +
          modelKey +
          " component by " +
          occurrences[modelKey].injectors.join(" & ")
      );
};

Brokerage.prototype.constructBrokeredElement = function(
  brokeredComponentName,
  description,
  $happn,
  url,
  dynamic,
  meshName
) {
  return {
    url,
    meshName,
    module: {
      name: brokeredComponentName,
      config: {
        instance: require("./broker").create(
          brokeredComponentName,
          description,
          $happn,
          this.__mesh,
          url,
          dynamic
        )
      }
    },
    component: {
      name: brokeredComponentName,
      config: {
        version: description.version,
        schema: {
          methods: description.methods
        }
      }
    }
  };
};

Brokerage.prototype.injectBrokeredComponent = function(model) {
  let elementsToConstruct = Object.keys(model.package).map(
    brokeredComponentName => {
      let elementToInject = this.constructBrokeredElement(
        brokeredComponentName,
        model.package[brokeredComponentName],
        model.$happn
      );
      this.__injectedElements.push(elementToInject);
      this.__injectedElementNames.push(brokeredComponentName);
      return this.__mesh._createElement(elementToInject, true);
    }
  );
  return Promise.all(elementsToConstruct);
};

Brokerage.prototype.inject = function(callback) {
  try {
    this.__checkDuplicateInjections(); //will throw if multiple components are injecting the same model
  } catch (e) {
    return callback(e);
  }

  let modelsToInject = [];

  Object.keys(this.__models).forEach(injectorKey => {
    modelsToInject.push(
      this.injectBrokeredComponent(this.__models[injectorKey])
    );
  });

  Promise.all(modelsToInject)
    .then(function() {
      callback();
    })
    .catch(callback);
};

module.exports = Brokerage;
