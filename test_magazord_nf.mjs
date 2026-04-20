import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const user = process.env.VITE_MAGAZORD_USER;
const pass = process.env.VITE_MAGAZORD_PASS;
const baseUrl = process.env.VITE_MAGAZORD_BASE_URL;

async function run() {
  const url = `${baseUrl}/api/v2/site/pedido/0012604710252`;
  const authMsg = `${user}:${pass}`;
  const encodedAuth = Buffer.from(authMsg).toString('base64');
  
  console.log(`Fetching ${url}...`);
  const res = await fetch(url, {
    headers: {
      'Authorization': `Basic ${encodedAuth}`,
      'Accept': 'application/json'
    }
  });
  
  const text = await res.text();
  console.log("Status:", res.status);
  
  try {
    const json = JSON.parse(text);
    console.log("Parsed JSON, checking keys...");
    const data = json.data || json;
    
    function find_nf(obj, path='') {
        if (typeof obj === 'object' && obj !== null) {
            for (const [k, v] of Object.entries(obj)) {
                if (/nota|nf|fiscal/i.test(k)) {
                    console.log(`  MATCH: ${path ? path+'.' : ''}${k} =`, v);
                }
                if (typeof v === 'object') {
                    find_nf(v, `${path ? path+'.' : ''}${k}`);
                }
            }
        } else if (Array.isArray(obj)) {
            for (let i = 0; i < Math.min(obj.length, 3); i++) {
                find_nf(obj[i], `${path}[${i}]`);
            }
        }
    }
    
    find_nf(data);
    if(data.arrayPedidoNota) {
       console.log("arrayPedidoNota:", JSON.stringify(data.arrayPedidoNota, null, 2));
    }
  } catch(e) {
    console.log("RAW RESP:", text.substring(0, 500));
  }
}

run();
