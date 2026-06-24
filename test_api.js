const user = 'MZDKfa05c6fac5df376e7a4c373bbcf5fccde76197984b68baf91344f5c380c9';
const pass = '@Up31Kizl%cP';
const auth = Buffer.from(user + ':' + pass).toString('base64');
fetch('https://larevida.painel.magazord.com.br/api/v2/site/pedido?limit=1', {
  headers: {
    'Authorization': 'Basic ' + auth,
    'Accept': 'application/json'
  }
}).then(res => res.text()).then(console.log).catch(console.error);
