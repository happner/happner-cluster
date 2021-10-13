const test = require('../_lib/test-helper');
let ClusterPlugin = require('../../lib/cluster-plugin');

describe(test.testName(__filename), function() {
  this.timeout(10000);
  // after('it cleans up and disconnects', async () => {
  //   await test.delay(5000);
  //   test.why();
  // });

  let logger = {
    createLogger: () => {},
    info: () => {}
  };
  it('tests that a cluster plugin correctly reigsters non-brokered dependencies', done => {
    let elements = require('../_lib/configurations/04/0');
    let cp = ClusterPlugin();
    let mesh = {
      _mesh: {
        elements,
        config: {},
        happn: { server: { services: { orchestrator: {} } } }
      }
    };
    let node = cp(mesh, logger);
    mesh._mesh.clusterClient.mount = test.sinon.fake();
    mesh._mesh.clusterClient.construct = test.sinon.fake();
    mesh._mesh.clusterClient.__operations.connection.clients = {
      removeListener: test.sinon.fake()
    };
    node.start(e => {
      if (e) done(e);
      test.expect(mesh._mesh.clusterClient.construct.callCount).to.be(2);
      test
        .expect(
          mesh._mesh.clusterClient.construct.calledWith({
            component4: { version: '*' },
            anotherComponent: { version: '21.10.81' }
          })
        )
        .to.be(true);
      test
        .expect(mesh._mesh.clusterClient.construct.calledWith({ component5: { version: '1.2.3' } }))
        .to.be(true);
      test.expect(mesh._mesh.config.brokered).to.be(undefined);
      node.stop(done);
    });
  });

  it('tests that a cluster plugin correctly reigsters non-brokered dependencies', done => {
    let elements = require('../_lib/configurations/04/1');
    let cp = ClusterPlugin();
    let mesh = {
      _mesh: {
        elements,
        config: {},
        happn: { server: { services: { orchestrator: {} } } }
      }
    };
    let node = cp(mesh, logger);
    mesh._mesh.clusterClient.mount = test.sinon.fake();
    mesh._mesh.clusterClient.construct = test.sinon.fake();
    mesh._mesh.clusterClient.__operations.connection.clients = {
      removeListener: test.sinon.fake()
    };
    node.start(e => {
      test
        .expect(
          e.message === "Cannot read properties of undefined (reading 'exchange')" ||
            e.message === "Cannot read property 'exchange' of undefined"
        )
        .to.be(true); //We expect this error because our mesh is not properly constructed
      test.expect(mesh._mesh.clusterClient.construct.callCount).to.be(1);
      test.expect(mesh._mesh.config.brokered).to.be(true);
      test
        .expect(mesh._mesh.clusterClient.construct.calledWith({ component6: { version: '*' } }))
        .to.be(true);
      node.stop(done);
    });
  });
});
