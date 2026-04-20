const vite = require('vite');
const env = vite.loadEnv('development', process.cwd(), '');
const auth = Buffer.from(env.VITE_MAGAZORD_USER + ':' + env.VITE_MAGAZORD_PASS).toString('base64');
const https = require('https');

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
  const meta = await req('/api/v2/site/pedido/0012604710252');
  if (meta.body.includes('27878')) {
     console.log("IT IS IN THE DETAIL PAYLOAD!!!");
  } else {
     console.log("Not in detail payload.");
  }
}
run();
