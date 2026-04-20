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

async function testEndpoints() {
  const meta = await req('/api/v2/site/pedido/0012604710252');
  const d = JSON.parse(meta.body).data;
  console.log("Got id:", d.id);
  const id = d.id;
  
  const endpoints = [
    `/api/v2/documento-fiscal?pedido=${id}`,
    `/api/v2/documento-fiscal?pedidoId=${id}`,
    `/api/v2/site/documento-fiscal?pedido=${id}`,
    `/api/v2/site/pedido/${id}/nota-fiscal`,
    `/api/v2/faturamento/pedido/${id}/nota-fiscal`,
    `/api/v2/faturamento/documento-fiscal?pedido=${id}`
  ];
  for (let e of endpoints) {
    console.log(`TESTING ${e}`);
    const res = await req(e);
    if (res.status === 200 && res.body.includes('27878')) {
        console.log(`FOUND 27878 in ${e} !!`);
        console.log(res.body);
        return;
    }
  }
}
testEndpoints();
