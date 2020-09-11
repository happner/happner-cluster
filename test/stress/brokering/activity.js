/* eslint-disable no-console */
const HappnerClient = require('happner-client');
const commander = require('commander');

commander
  .option('--clients [number]', 'clients count')
  .option('--calls [number]', 'method calls')
  .option('--events [number]', 'event emits')
  .option('--interval [number]', 'activity interval')
  .option('--ports [string]', 'ports commaseparated')
  .parse(process.argv);

commander.ports = commander.ports || '55001';
commander.clients = parseInt(commander.clients || 1);
commander.calls = parseInt(commander.calls || 1);
commander.events = parseInt(commander.events || 1);
commander.interval = parseInt(commander.interval || 1000);

var ports = commander.ports.split(',');
var totalCalls = 0;
var totalWebCalls = 0;
var totalEmits = 0;
var HashRing = require('hashring');
var randomPort = new HashRing();

ports.forEach(port => {
  randomPort.add(port);
});

createClients()
  .then(clients => {
    return startActivity(clients);
  })
  .then(() => {
    console.log('STARTED ACTIVITY...');
  });

function failAndExit(e) {
  console.log('FAILED:::', e.message);
  console.log(e.stack);
  process.exit(1);
}

let description;
function getDescription(api) {
  return new Promise(resolve => {
    if (description) return resolve(description);
    api.data.get('/mesh/schema/description', (e, schema) => {
      if (e) return failAndExit(e);
      description = schema;
      return resolve(description);
    });
  });
}

function createClient() {
  return new Promise(resolve => {
    const client = new HappnerClient();
    const port = randomPort.get(Date.now());
    client.connect(
      null,
      {
        username: '_ADMIN',
        password: 'happn',
        port
      },
      e => {
        if (e) return failAndExit(e);
        const api = { data: client.dataClient() };
        getDescription(api).then(schema => {
          api.happner = client.construct(schema.components);
          api.port = port;
          api.token = api.data.session.token;
          api.happner.event.remoteComponent1.on(
            'test/*',
            () => {
              totalEmits++;
              if (totalEmits % commander.clients === 0)
                console.log(`events emitted:::${totalEmits}`);
            },
            () => {
              resolve(api);
            }
          );
        });
      }
    );
  });
}

function doRequest(path, client) {
  return new Promise((resolve, reject) => {
    var request = require('request');
    var options;

    options = {
      url: `http://127.0.0.1:${client.port}${path}?happn_token=${client.token}`
    };

    request(options, function(error, response, body) {
      if (error) return reject(error);
      resolve({
        response,
        body
      });
    });
  });
}

async function createClients() {
  const createdClients = [];
  for (var i = 0; i < commander.clients; i++) {
    createdClients.push(await createClient());
  }
  return createdClients;
}

function startActivity(clients) {
  clients.forEach(client => {
    client.happner.exchange.remoteComponent1.brokeredMethod1((e, data) => {
      if (e) return failAndExit(e);
      totalCalls++;
      if (totalCalls % commander.clients === 0)
        console.log(`data method called:::${data} total calls:::${totalCalls}`);
    });
    doRequest('/remoteComponent1/testJSON', client)
      .then(response => {
        totalWebCalls++;
        if (totalWebCalls % commander.clients === 0) {
          console.log(
            `web method called:::${response.body.toString()} total web calls:::${totalCalls}`
          );
        }
      })
      .catch(e => {
        console.log('web method failed...', e);
      });
  });
  setTimeout(() => {
    startActivity(clients);
  }, commander.interval);
}
