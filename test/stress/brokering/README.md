# start 6 brokers
node test/stress/brokering/broker --seq 1
node test/stress/brokering/broker --seq 2
node test/stress/brokering/broker --seq 3
node test/stress/brokering/broker --seq 4
node test/stress/brokering/broker --seq 5
node test/stress/brokering/broker --seq 6

# start some brokered to by the above components
node test/stress/brokering/instance-1.js --seq 7
node test/stress/brokering/instance-1.js --seq 8

# start some activity, 100 client connections distributed randomly amongst brokers, each doing a method call, a web request and event emit every second:
node test/stress/brokering/activity.js --clients 100 --ports 55001,55002,55003,55004,55005,55006 --interval 1000
