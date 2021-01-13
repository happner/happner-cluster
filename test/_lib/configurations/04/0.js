module.exports = {
  component1: {
    module: {
      instance: {
        initialize: async () => {},
        start: async () => {},
        use: async () => {}
      }
    },
    component: {
      initMethod: 'initialize',
      startMethod: 'start',
      config: {
        dependencies: {
          component4: {
            version: '*'
          },
          anotherComponent: {
            version: '21.10.81'
          }
        }
      }
    }
  },
  component2: {
    module: {
      instance: {
        initialize: async () => {},
        start: async () => {},
        use: async () => {}
      },
      package: {
        happner: {
          dependencies: {
            component2: {
              component5: {
                version: '1.2.3'
              }
            }
          }
        }
      }
    },
    component: {
      initMethod: 'initialize',
      startMethod: 'start'
    }
  }
};
