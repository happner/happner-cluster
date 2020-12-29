module.exports = {
  modules: {
    component1: {
      instance: {
        initialize: async () => {},
        start: async () => {},
        use: async () => {
          return 1;
        }
      }
    }
  },
  components: {
    component1: {
      initMethod: 'initialize',
      startMethod: 'start',
      dependencies: {}
    }
  }
};
