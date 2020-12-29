module.exports = {
  modules: {
    component2: {
      instance: {
        initialize: async () => {},
        start: async () => {},
        use: async () => {
          return 2;
        }
      }
    }
  },
  components: {
    component2: {
      initMethod: 'initialize',
      startMethod: 'start',
      dependencies: {
        component4: {
          version: '*'
        }
      }
    }
  }
};
