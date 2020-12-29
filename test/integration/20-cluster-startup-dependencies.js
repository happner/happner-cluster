const username = '_ADMIN',
  password = 'happn';
const helpers = {
  client: require('../_lib/client'),
  test: require('../_lib/test-helper'),
  configuration: require('../_lib/helpers/configuration').create(),
  cluster: require('../_lib/helpers/cluster')
};

describe(helpers.test.testName(__filename, 3), function() {
  this.timeout(40000);

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
  });

  it.only('starts up a cluster with interdependencies, happy path, we ensure the correct initialize and startup order', async () => {
    const cluster = helpers.cluster.create();

    await cluster.member.start(helpers.configuration.construct(20, 0), 1000);
    await cluster.member.start(helpers.configuration.construct(20, 1), 1000);
    await cluster.member.start(helpers.configuration.construct(20, 2), 2000);
    await cluster.member.start(helpers.configuration.construct(20, 3), 2000);
    await cluster.member.start(helpers.configuration.construct(20, 4), 2000);
    await cluster.member.start(helpers.configuration.construct(20, 5), 5000);

    await helpers.test.delay(5000);

    const client = await helpers.client.create(username, password, 55002);
    const result = await client.exchange.component2.use();
    helpers.test.expect(result).to.be(2);
    /*
    test.expect(cluster.event.data).to.eql([
      { key: 'member-initiialized', value: 'MEMBER-0' },
      { key: 'member-started', value: 'MEMBER-0' },
      { key: 'member-initiialized', value: 'MEMBER-1' },
      { key: 'member-started', value: 'MEMBER-1' },
      { key: 'member-initiialized', value: 'MEMBER-2' },
      { key: 'member-initiialized', value: 'MEMBER-3' },
      { key: 'member-initiialized', value: 'MEMBER-4' },
      { key: 'member-started', value: 'MEMBER-4' },
      { key: 'member-started', value: 'MEMBER-2' },
      { key: 'member-initiialized', value: 'MEMBER-5' },
      { key: 'member-started', value: 'MEMBER-5' },
      { key: 'member-started', value: 'MEMBER-3' },
      { key: 'cluster-ready', value: { members: 6 } }
    ]);
    */
    await helpers.client.destroy(client);
    await cluster.destroy();
  });

  xit('starts up a cluster with interdependencies, we inject a component with dependencies - ensure it starts because its existing dependencies are there', async () => {});
  xit('starts up a cluster with interdependencies, we inject a component with dependencies - ensure it start is delayed as it depends on a follow on injected component', async () => {});
});
