const vite = require('vite');
const env = vite.loadEnv('development', process.cwd(), '');
console.log("PASS via vite loadEnv == ", env.VITE_MAGAZORD_PASS);
const auth = Buffer.from(env.VITE_MAGAZORD_USER + ':' + env.VITE_MAGAZORD_PASS).toString('base64');
console.log("AUTH = ", auth);

const https = require('https');
https.get({
  hostname: 'casalinda.painel.magazord.com.br',
  path: '/api/v2/site/pedido/0012604710252',
  headers: { 'Authorization': 'Basic ' + auth, 'Accept': 'application/json' }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log("Status:", res.statusCode, "Body:", body.substring(0,200)));
});
