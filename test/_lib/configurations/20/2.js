module.exports = {
  modules: {
    component2: {
      instance: {
        initialize: async () => {
          this.state = { initialized: true };
        },
        start: async () => {
          this.state = this.state || {};
          this.state.started = true;
        },
        use: async () => {
          return 2;
        },
        is: async () => {
          if (!this.state) this.state = {};
          return this.state;
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
