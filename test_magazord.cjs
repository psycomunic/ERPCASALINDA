const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [key, val] = line.split('=');
  if (key && val) acc[key.trim()] = val.trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

async function run() {
  const url = env.VITE_MAGAZORD_BASE_URL || 'https://casalinda.painel.magazord.com.br';
  const urlApi = url.replace('painel.', 'apiv2.');
  const user = env.VITE_MAGAZORD_USER;
  const pass = env.VITE_MAGAZORD_PASS;
  const basicAuth = Buffer.from(`${user}:${pass}`).toString('base64');
  
  try {
    const res = await fetch(`${urlApi}/v1/pedido?limit=1`, {
      headers: { 'Authorization': `Basic ${basicAuth}` }
    });
    if(!res.ok) throw new Error(await res.text());
    const data = await res.json();
    console.log(data.data[0] || data.items[0] || data);
  } catch(e) { console.error('Fetch 1 failed v1', e.message) }

  // Let's also try proxy route to `/site/pedido`
  try {
    const pRes = await fetch(`http://localhost:5173/api/magazord/site/pedido?limit=1`);
    if(!pRes.ok) throw new Error(await pRes.text());
    const pData = await pRes.json();
    
    const rootItem = pData.data?.items?.[0] || {};
    console.log('--- ROOT FIELDS ---');
    for (const k of Object.keys(rootItem)) {
      if (k.toLowerCase().includes('item') || k.toLowerCase().includes('quant') || k.toLowerCase().includes('vol') || k.toLowerCase().includes('prod') || k.toLowerCase().includes('qtd')) {
        console.log(k, rootItem[k]);
      }
    }
  } catch(e) { console.error('Fetch proxy failed', e.message) }

}
run();
