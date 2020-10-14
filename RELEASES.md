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

