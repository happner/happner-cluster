const username = '_ADMIN',
  password = 'happn';
const helpers = {
  client: require('../_lib/client'),
  test: require('../_lib/test-helper'),
  configuration: require('../_lib/helpers/configuration').create(),
  cluster: require('../_lib/helpers/cluster')
};

describe(helpers.test.testName(__filename, 3), function() {
  this.timeout(60000);

  it('starts up a cluster with no interdependencies, happy path, we ensure we can start and teardown the cluster', async () => {
    const cluster = helpers.cluster.create();

    await cluster.member.start(helpers.configuration.construct(20, 0), 1000);
    await cluster.member.start(helpers.configuration.construct(20, 1), 1000);
    await cluster.member.start(helpers.configuration.construct(20, 4), 2000);
    await cluster.member.start(helpers.configuration.construct(20, 5), 5000);

    const client = await helpers.client.create(username, password, 55001);
    const result = await client.exchange.component1.use();
    helpers.test.expect(result).to.be(1);
    await helpers.client.destroy(client);
    await cluster.destroy();
    helpers.test.expect(null).to.be.null;
  });

  it('starts up a cluster with interdependencies, happy path, we ensure the startup order is correct', async () => {
    const cluster = helpers.cluster.create();

    await cluster.member.start(helpers.configuration.construct(20, 0), 2000);
    await cluster.member.start(helpers.configuration.construct(20, 1), 2000);
    await cluster.member.start(helpers.configuration.construct(20, 2), 2000);
    await cluster.member.start(helpers.configuration.construct(20, 3), 2000);
    await helpers.test.delay(5000);
    await cluster.member.start(helpers.configuration.construct(20, 4), 2000);
    await cluster.member.start(helpers.configuration.construct(20, 5), 2000);
    await helpers.test.delay(5000);
    //check member 2 (depending on member 4) is accessible
    const client = await helpers.client.create(username, password, 55002);
    const result = await client.exchange.component2.use();
    helpers.test.expect(result).to.be(2);
    //check everything started
    const values = cluster.events.data.map(item => {
      return item.value;
    });
    values.sort();
    helpers.test
      .expect(values)
      .to.eql(['MESH_0', 'MESH_1', 'MESH_2', 'MESH_3', 'MESH_4', 'MESH_5']);
    //check the members started in the correct order
    //sometimes MESH_1 starts before MESH_0, slice away the first 2
    helpers.test.expect(cluster.events.data.slice(2)).to.eql([
      { key: 'member-started', value: 'MESH_4' },
      { key: 'member-started', value: 'MESH_2' },
      { key: 'member-started', value: 'MESH_5' },
      { key: 'member-started', value: 'MESH_3' }
    ]);
    await helpers.client.destroy(client);
    await cluster.destroy();
    helpers.test.expect(null).to.be.null;
  });

  it('starts up a cluster with interdependencies, we ensure that members with unsatisfied dependencies are not accessible', async () => {
    const cluster = helpers.cluster.create();

    await cluster.member.start(helpers.configuration.construct(20, 0), 2000);
    await cluster.member.start(helpers.configuration.construct(20, 1), 2000);
    await cluster.member.start(helpers.configuration.construct(20, 2), 2000);
    await cluster.member.start(helpers.configuration.construct(20, 3), 2000);
    await helpers.test.delay(5000);
    const values = cluster.events.data.map(item => {
      return item.value;
    });
    values.sort();
    helpers.test.expect(values).to.eql(['MESH_0', 'MESH_1']);
    let error;
    try {
      //check member 2 is not accessible - as member 4 has not been started
      await helpers.client.create(username, password, 55002);
    } catch (e) {
      error = e.message;
    }
    helpers.test.expect(error).to.be('connect ECONNREFUSED 127.0.0.1:55002');

    //start member 4 up - this should make member 2 available
    await cluster.member.start(helpers.configuration.construct(20, 4), 5000);

    const client = await helpers.client.create(username, password, 55002);
    const result = await client.exchange.component2.use();
    helpers.test.expect(result).to.be(2);
    await helpers.client.destroy(client);

    //start member 5 up So that we can cleanly destroy cluster
    await cluster.member.start(helpers.configuration.construct(20, 5), 2000);
    await helpers.test.delay(2000);

    await cluster.destroy();
    helpers.test.expect(null).to.be.null;
  });

  it('starts up a cluster, we inject a component with dependencies - ensure it starts because its existing dependencies are there', async () => {
    const cluster = helpers.cluster.create();

    await cluster.member.start(helpers.configuration.construct(20, 0), 2000);
    await cluster.member.start(helpers.configuration.construct(20, 1), 2000);
    await cluster.member.start(helpers.configuration.construct(20, 4), 7000);
    await cluster.component.inject(1, helpers.configuration.extract(20, 2, 'component2'));
    await helpers.test.delay(4000);

    //check member 2 (depending on member 4) is accessible
    const client = await helpers.client.create(username, password, 55001);
    await helpers.test.delay(4000);
    const result = await client.exchange.component2.use();
    helpers.test.expect(result).to.be(2);
    await helpers.client.destroy(client);
    await cluster.destroy();
    helpers.test.expect(null).to.be.null;
  });

  it('starts up a cluster with interdependencies, we inject a component with dependencies - ensure it start is delayed as it depends on a follow on injected component', async () => {
    const cluster = helpers.cluster.create();

    await cluster.member.start(helpers.configuration.construct(20, 0), 2000);
    await cluster.member.start(helpers.configuration.construct(20, 1), 2000);
    await cluster.member.start(helpers.configuration.construct(20, 5), 5000);
    //dont await this - as it will hold up the  test
    cluster.component.inject(1, helpers.configuration.extract(20, 2, 'component2'));

    await helpers.test.delay(5000);

    //check component2 (depending on member 4) is not accessible
    let client = await helpers.client.create(username, password, 55001);
    helpers.test.expect(client.exchange.component2).to.be(undefined);
    await helpers.client.destroy(client);
    await helpers.test.delay(2000);

    await cluster.member.start(helpers.configuration.construct(20, 4), 5000);
    await helpers.test.delay(8000);

    client = await helpers.client.create(username, password, 55001);
    await helpers.test.delay(2000);

    helpers.test.expect(client.exchange.component2).to.be.ok;

    helpers.test.expect((await client.exchange.component2.is()).initialized).to.be(true);
    helpers.test.expect((await client.exchange.component2.is()).started).to.be(true);
    await helpers.client.destroy(client);
    await cluster.destroy();
  });
});
