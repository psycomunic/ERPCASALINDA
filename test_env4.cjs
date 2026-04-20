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

function findPaths(obj, targetStr, currentPath = '') {
  if (obj === null || obj === undefined) return;
  
  if (typeof obj === 'object') {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        findPaths(obj[key], targetStr, currentPath ? currentPath + '.' + key : key);
      }
    }
  } else if (typeof obj === 'string' && obj.includes(targetStr)) {
    console.log(`MATCH at ${currentPath} = ${obj}`);
  } else if (typeof obj === 'number' && obj.toString().includes(targetStr)) {
    console.log(`MATCH at ${currentPath} = ${obj}`);
  }
}

async function run() {
  const meta = await req('/api/v2/site/pedido/0012604710252');
  const d = JSON.parse(meta.body);
  console.log("Searching for 27878:");
  findPaths(d, '27878');
}
run();
