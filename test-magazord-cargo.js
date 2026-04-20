import 'dotenv/config';
async function test() {
  const user = process.env.VITE_MAGAZORD_USER;
  const pass = process.env.VITE_MAGAZORD_PASS;
  const url = process.env.VITE_MAGAZORD_BASE_URL || 'https://casalinda.magazord.com.br';
  
  if (!user || user.includes('seu-usuario')) {
    console.log("Sem credenciais configuradas.");
    return;
  }
  
  const headers = { 
    'Authorization': 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64'),
    'Content-Type': 'application/json'
  };

  try {
    const res = await fetch(`${url}/magazord-api/v2/site/pedido?limit=1&order=id&orderDirection=desc`, { headers });
    const json = await res.json();
    console.log(JSON.stringify(json.data.items[0], null, 2));
  } catch(e) {
    console.log(e);
  }
}
test();
