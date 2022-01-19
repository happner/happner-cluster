1.4.0 2017-04-06
----------------
  - onward release of happn-3, happner-2, happn-cluster
  - test emitLocal() in cluster context

1.4.1 2017-04-13
----------------
  - update subscription filter to not filter out subscriptions with no subscriptionData
  - onward release of happn-cluster
  - onward release of happner-2
  - onward release of happner-client

1.4.2 2017-04-19
----------------
  - onward release of happner-2

2.0.0 2017-05-20
----------------
  - updated happner-2 to 3.0.0
  - start happn-cluster proxy (through which client access cluster) after component startMethods are run

2.0.1 2017-08-04
----------------
  - add `/_SYSTEM/_NETWORK/_SETTINGS/NAME` and `/_SYSTEM/_SECURITY/_SETTINGS/KEYPAIR` to local storage (nedb, non-shared)

3.0.0 2017-08-19
----------------
  - bump to happn-cluster ^3.0.0

3.0.1 2017-08.19
----------------
  - bumped to happner-client ^2.0.0 (circular)

4.0.0 2017-11-27
----------------
  - integrated happn subscription format fix
  - updated happn and happner

4.1.0 2018-01-09
----------------
  - updated to happn-cluster 4.2.0 and happner-client 3.0.1

5.0.0 2018-04-13
----------------
  - updated happn-cluster and happner-client and happner-2
  - added tests for security update replication into cluster

6.0.0 2018-05-24
----------------
  - updated happn-cluster and happner-client and happner-2

6.0.1 2018-05-29
----------------
  - updated package-lock

6.1.0 2018-09-05
----------------
  - updated package-lock
  - component brokering (without permissions)

7.0.0 2018-10-12
----------------
  - happn-3 v 8.0.0

7.0.1 2018-10-12
----------------
  - happn-3 v 8.0.1

7.0.2 2018-10-29
----------------
  - happn-3 v 8.0.3

7.1.0 2018-11-06
----------------
  - happn-3 v 8.1.1

7.2.0 2018-11-17
----------------
  - happn-3 v 8.2.1
  - happner-2 v 9.2.1
  - happner-client v 6.2.0

7.3.0 2018-11-17
----------------
  - happn-3 v 8.2.7
  - happner-2 v 9.3.0
  - happner-client v 6.3.0

8.0.0 2019-03-01
----------------
- happn-3 v 9.0.0
- happner-2 v 10.0.0

8.1.0 2019-05-11
----------------
- happn-3 v 10.0.0
- happner-2 v 10.1.0

8.1.1 2019-06-20
----------------
- happn-cluster 8.1.1

8.1.2 2019-07-11
----------------
- happn-cluster 8.1.2

8.1.3 2019-07-23
----------------
- fix: arguments are now passed across brokered component methods

8.2.0 2019-07-24
----------------
- feature: dynamic loading of brokered API definitions
- feature: deferred listen until all brokered components have loaded a remote exchange at least once

8.2.1 2019-08-12
----------------
- fix: __checkDuplicateInjections of brokerage fixed

8.2.2 2019-08-21
----------------
- fix: dependenciesSatisfied of brokerage fixed, when multiple of the same component in cluster

8.3.0 2019-09-27
----------------
- upgrade: happner-client v9
- feature: web brokering

9.0.0 2019-11-28
----------------
  - happn-3 version 11.0.0, breaking: client disconnection on token revocation
  - happn-cluster version 9.0.0

9.0.1 2020-01-25
----------------
  - linting

9.0.2 2020-02-25
----------------
  - fix: cluster brokering component injection - no duplicates
  - test: stress test scripts
  - dep: happn-3 upgrades 11.2.4
  - dep: happn-cluster upgrades 9.0.3

9.0.3 2020-06-24
----------------
  - dep: happn-3 upgrade 11.5.2
  - dep: happner-2 upgrade 11.4.13
  - dep: happn-cluster upgrade 9.0.4
  - dep: happner-client upgrade 11.1.0

9.0.4 2020-06-26
----------------
  - fix: #189 - correct version range injected by broker

9.0.5 2020-07-08
----------------
  - dep: happn-cluster upgrade 9.0.5

9.0.6 2020-07-16
----------------
  - dep: happn-3 upgrade in package-lock v11.5.4, test fixed tests 06,07 to stabilise cluster before running tests

9.0.7 2020-07-27
----------------
  - feature / fix: ability to add paths to orchestrator replicate config

9.0.8 2020-07-30
----------------
  - feature / fix: broker does not re-publish mesh description if deferrListen is true JIRA: SMC-617

9.0.9 2020-09-10
----------------
  - patch: mesh description is updated in the rest component when an element is updated in the mesh - JIRA:SMC-1074 happner-cluster #199

9.0.10 2020-10-04
-----------------
  - happn-3 patch: selective security cache clearing and concurrency 1 queue on dataChanged event - SMC-1189
  - happn-cluster patch: SMC-1252 - cluster member restarts cause leak of peer admin

10.0.0 2020-11-04
-----------------
  - happn-cluster upgrade - SMC-1356 - batching of security updates

10.1.0 2021-01-21
-----------------
  - SMC-917: initial happy path tests, modifications to cluster-plugin
  - SMC-917: updated tests
  - SMC-917 - failing tests on component injection
  - SMC-917: increased timeouts in test 20-cluster-startup-dependencies. … …
  - SMC-917: Added unit tests for changes. Lots of other tests failing
  - SMC-917: All tests passing
  - SMC-917: Reverted clear-mongo-collection test helper to original version
  - SMC-917: Review fixes
  - SMC-917: Removed unecessary relay of startup/dependencies/satisfied e… …
  - SMC-917: updated dependencies
  - SMC-917: re-added package-lock
  - SMC-1645: updated package
  - SMC-1645: refactor, completed tests
  - SMC-1645: test setup
  - SMC-1256: Added tests for data events on clusters
  - SMC-917: updated version and RELEASES

10.2.0 2021-03-31
-----------------
  - SMC-1808: user permissions

10.3.0 2021-07-20 [DEPRECATED - PRERELEASE happner-2]
-----------------
  - SMC-1810: nested permissions in get and on

10.3.1 2021-08-11
-----------------
  - SMC-1810: fixed dependencies
  
10.4.0 2021-08-27
-----------------
  - SMC-3689: added $call override for peer dependencies and discoverMethods for peer dependency configurations in happner-client
  - SMC-3646: updated github actions
  - SMC-3459: added happner-2 dependencies for anonymous access
  - SMC-3242: happn-3 update fixed onBehalfOf and nested permissions issue

10.4.1 2021-09-20
-----------------
  - SMC-4161: happn-3 upgrade 11.13.4

10.4.2 2021-09-28
-----------------
  - happn-3 upgrades:
  - fix: SMC-4209 - concurrency issue, user created logged on deleted, causes security directory update to fatal
  - fix: SMC-4208 - merge insert now uses upsert, moved constants out of data service

10.5.0 2021-09-28
-----------------
  - SMC-3989: intermittent test failures fixed
  - SMC-4186: ability to switch event replication off via happner config

11.0.0 2021-10-07
-----------------
  - SMC-3823: mongo version 4 driver, updated happn-cluster
  - SMC-4309: removed persistMembers functionality

11.0.1 2021-10-13
-----------------
  - SMC-4349: update of happner-client - fix inter-mesh $on
  - SMC-4311: brokered components with * version are sometimes not refreshing api - tests

11.0.2 2021-10-14
-----------------
 - fix: SMC-4385 - happner-client update: remote method call timeouts now print call details (component, version, method)
 - fix: SMC-4387 - components without happner dependencies do not refresh $happn exchange api when a peer arrives

11.0.3 2021-10-15
-----------------
  - dependency happner-2 updated:
    - fix: SMC-3661 - removal of try catch callback anti-pattern
    - fix: SMC-4349 - happner-client update, inter-mesh $on fails due to argument mismatch
    - fix: SMC-4388 - updated mongo data provider, removed main from package.json
    - test: SMC-4393 - test intercomponent $on and $call

11.1.0 2021-11-24
-----------------
  - fix: SMC-4512 -  data provider get action causes fatal when allowNestedPermissions switched on
  - happn-3 upgrade:
  - feature: SMC-2954 - Allows for configuration and use of multiple authentication providers.
  - fix: SMC-4386 -  upsertMultiplePermissions will now allow for removing permissions/prohibitions as well as upserting permissions or prohibitions

11.1.1 2021-11-25
-----------------
  - test: SMC-2954 - ensure multiple auth providers work with the cluster

11.2.0 2021-12-02
-----------------
  - SMC-734: removed bitcore-lib and encrypted payloads

11.2.1 2021-12-04
-----------------
  - SMC-4466: light-client failure fix, updated dependencies

11.2.2 2021-12-05
-----------------
  - SMC-4749: rest request failure - component method not found

11.2.3 2021-12-06
-----------------
  - SMC-4749: rest request failure - component method not found, logging mount methods
  - SMC-4749: rest request failure - component method not found, logging component member

11.2.4 2021-12-07
-----------------
  - SMC-4749: latest happner-2 and happner-client, wrap cluster plugin decorates rest component

11.2.5 2021-12-08
-----------------
  - SMC-4749: brokerage does not consider local placeholders as met dependencies

11.2.6 2021-12-08
-----------------
  - SMC-4749: upped happner-2 dependency, additional logging on brokerage

11.2.7 2021-12-08
-----------------
  - SMC-4848: upped happner-2 dependency, issue with null or undefined arguments and promisify

11.3.0 2022-01-04
-----------------
  - SMC-4550: security lookup tables

11.3.1 2022-01-10
-----------------
  - SMC-4938: lookup tables fail for rest request
  - SMC-4550: upgraded happn-cluster for lookup tables

11.4.0 2022-01-19
-----------------
  - SMC-4933: $happn.isAuthorized(user)


  