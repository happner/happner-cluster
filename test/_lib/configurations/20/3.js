module.exports = {
  modules: {
    component3: {
      instance: {
        initialize: async () => {},
        start: async () => {},
        use: async () => {}
      }
    }
  },
  components: {
    component3: {
      initMethod: 'initialize',
      startMethod: 'start',
      dependencies: {
        component5: {
          version: '*'
        }
      }
    }
  }
};
