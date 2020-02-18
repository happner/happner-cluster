const commander = require('commander');

commander
  .option('--type1 [number]', 'how many instances of type 1')
  .option('--type2 [number]', 'how many instances of type 2')
  .option('--type3 [number]', 'how many instances of type 2');
