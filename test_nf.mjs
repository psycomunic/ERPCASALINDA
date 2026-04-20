import https from 'https';
import dotenv from 'dotenv';
dotenv.config();

const user = process.env.VITE_MAGAZORD_USER;
const pass = process.env.VITE_MAGAZORD_PASS;
const auth = Buffer.from(user + ':' + pass).toString('base64');

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
    '/api/v2/site/pedido/0012604710252?incluir=notasFiscais',
    '/api/v2/site/pedido/0012604710252?incluir=documentoFiscal',
    '/api/v2/site/pedido/0012604710252/nota',
    '/api/v2/site/pedido/0012604710252/notas',
    '/api/v2/site/pedido/0012604710252/nota-fiscal',
    '/api/v2/documento-fiscal'
  ];
  for (let e of endpoints) {
    console.log(`TESTING ${e}`);
    const res = await req(e);
    if (res.status === 200 && res.body.includes('27878')) {
      console.log(`FOUND 27878 in ${e}:`, res.body.substring(0, 150));
      return;
    }
  }
  // Try checking existing details JSON specifically for 27878
  const resDetail = await req('/api/v2/site/pedido/0012604710252');
  if (resDetail.body.includes('27878')) {
    console.log("WAIT, 27878 WAS IN THE DETAIL PAYLOAD ALL ALONG!");
  } else {
    console.log("NOT IN DETAIL PAYLOAD AT ALL");
  }
}

testEndpoints();
