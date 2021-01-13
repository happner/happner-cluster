module.exports = {
  component3: {
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
          $broker: {
            component6: {
              version: '*'
            }
          }
        }
      }
    }
  }
};
