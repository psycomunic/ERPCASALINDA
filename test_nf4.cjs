const https = require('https');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf-8');
const user = env.match(/VITE_MAGAZORD_USER=(.*)/)[1].trim();
let passRaw = env.match(/VITE_MAGAZORD_PASS=(.*)/)[1].trim();if (passRaw.startsWith("'")) passRaw = passRaw.substring(1);
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

async function run() {
   console.log("Fetching order...");
   const r = await req('/api/v2/site/pedido/0012604710252');
   console.log("Status:", r.status);
   console.log("Body preview:", r.body.substring(0, 300));
}
run();
