const https = require('https');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf-8');
const user = env.match(/VITE_MAGAZORD_USER=(.*)/)[1].trim();
let passRaw = env.match(/VITE_MAGAZORD_PASS=(.*)/)[1].trim();
if (passRaw.startsWith("'")) passRaw = passRaw.substring(1);

const auth = Buffer.from(user + ':' + passRaw).toString('base64');

function req(path) {
  return new Promise((resolve) => {
    https.get({
      hostname: 'casalinda.painel.magazord.com.br',
      path: path,
      headers: { 'Authorization': 'Basic ' + auth, 'Accept': 'application/json' }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
  });
}

async function testEndpoints() {
  const endpoints = [
    '/api/v2/site/pedido/0012604710252?incluir=notas',
    '/api/v2/site/pedido/0012604710252/documento-fiscal',
    '/api/v2/site/pedido/0012604710252/nota',
    '/api/v2/site/pedido/0012604710252/notas'
  ];
  for (let e of endpoints) {
    console.log(`TESTING ${e}`);
    const res = await req(e);
    if (res.status === 200 && res.body.includes('27878')) {
      console.log(`FOUND 27878 in ${e} !!`);
      break;
    }
  }
}
testEndpoints();
