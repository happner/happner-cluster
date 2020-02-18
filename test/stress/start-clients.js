const commander = require('commander');

commander
  .option('--connections [number]', 'connections')
  .option('--events [number]', 'events per connection per second')
  .option('--methods [number]', 'methods per connection per second')
  .option('--web [number]', 'web requests per connection per second')
  .parse(process.argv);
