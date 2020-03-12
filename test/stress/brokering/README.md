# start 3 brokers

node test/stress/brokering/broker --seq 1
node test/stress/brokering/broker --seq 2
node test/stress/brokering/broker --seq 3
node test/stress/brokering/broker --seq 4
node test/stress/brokering/broker --seq 5
node test/stress/brokering/broker --seq 6

# start some brokered to by the above components
node test/stress/brokering/instance-1.js --seq 7
node test/stress/brokering/instance-1.js --seq 8

# start some activity, 100 clients connecting, doing a method call and a web request every second
node test/stress/brokering/activity.js --clients 100  --ports 55001,55002,55003,55004,55005,55006
