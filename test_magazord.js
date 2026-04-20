const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();
async function run() {
  const url = process.env.VITE_MAGAZORD_API_URL || 'https://api.magazord.com.br';
  const token = process.env.VITE_MAGAZORD_API_TOKEN;
  const res = await fetch(`${url}/site/pedido?limit=1`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  console.log(Object.keys(data.data.items[0]));
  console.log('Items related fields:');
  for (const k of Object.keys(data.data.items[0])) {
    if (k.toLowerCase().includes('item') || k.toLowerCase().includes('quant') || k.toLowerCase().includes('vol')) {
      console.log(k, data.data.items[0][k]);
    }
  }
}
run();
