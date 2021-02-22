module.exports = {
  modules: {
    component5: {
      instance: {
        initialize: async () => {},
        start: async () => {},
        use: async () => {
          return 5;
        }
      }
    }
  },
  components: {
    component5: {
      initMethod: 'initialize',
      startMethod: 'start',
      dependencies: {}
    }
  }
};
