let expect = require('expect.js');
let sinon = require('sinon');
let ClusterPlugin = require('../../lib/cluster-plugin');

describe('04 - Unit tests for cluster-plugin registering dependencies', () => {
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
    mesh._mesh.clusterClient.mount = sinon.fake();
    mesh._mesh.clusterClient.construct = sinon.fake();
    node.start(e => {
      if (e) done(e);
      expect(mesh._mesh.clusterClient.construct.callCount).to.be(2);
      expect(
        mesh._mesh.clusterClient.construct.calledWith({
          component4: { version: '*' },
          anotherComponent: { version: '21.10.81' }
        })
      ).to.be(true);
      expect(
        mesh._mesh.clusterClient.construct.calledWith({ component5: { version: '1.2.3' } })
      ).to.be(true);
      expect(mesh._mesh.config.brokered).to.be(undefined);

      done();
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
    mesh._mesh.clusterClient.mount = sinon.fake();
    mesh._mesh.clusterClient.construct = sinon.fake();
    node.start(e => {
      expect(e.toString()).to.eql("TypeError: Cannot read property 'exchange' of undefined"); //We expect this error because our mesh is not properly constructed
      expect(mesh._mesh.clusterClient.construct.callCount).to.be(1);
      expect(mesh._mesh.config.brokered).to.be(true);
      expect(mesh._mesh.clusterClient.construct.calledWith({ component6: { version: '*' } })).to.be(
        true
      );
      done();
    });
  });
});
