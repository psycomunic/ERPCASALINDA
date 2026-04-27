import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tyjdetvuzqpjzhdmdzxo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_S3BR6xih1XutmQEKDoa02A_9kQQ816t';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MOLDURAS = [
  'Sem Moldura (Borda Infinita)',
  'Caixa Preta', 'Caixa Branca', 'Caixa Dourada', 'Caixa Madeira',
  'Flutuante Preta', 'Flutuante Branca', 'Flutuante Dourada', 'Flutuante Madeira',
  'Côncava Preta', 'Côncava Branca', 'Côncava Dourada', 'Côncava Madeira',
  'Inox',
  'Trono de Ouro', 'Majestade Negra', 'Galeria Imperial',
  'Roma Moderna', 'Palaciana', 'Realce Imperial', 'Imperial Prata e Ouro', 'Barroco Imperial'
];

const VIDROS = [
  '85x85', '115x115', '145x145',
  '85x55', '115x75', '145x95', '175x100',
  '55x35', '175x95',
  '40x20', '55x30', '70x40', '90x50', '120x70'
];

async function seed() {
  const itens = [];
  
  MOLDURAS.forEach((m, idx) => {
    itens.push({
      id: `mld-${idx + 100}`,
      codigo: `MLD-${Date.now().toString().slice(-4)}${idx}`,
      nome: `Moldura ${m}`,
      categoria: 'MOLDURA', // Adjust if needed
      subcategoria: 'Madeira/Inox',
      quantidade: 0,
      quantidade_minima: 50,
      unidade: 'm',
      localizacao: 'Prateleira 1',
      fornecedor_id: null
    });
  });

  VIDROS.forEach((v, idx) => {
    itens.push({
      id: `vid-${idx + 100}`,
      codigo: `VID-${Date.now().toString().slice(-4)}${idx}`,
      nome: `Vidro ${v}`,
      categoria: 'VIDRO',
      subcategoria: '2mm Antirreflexo',
      quantidade: 0,
      quantidade_minima: 10,
      unidade: 'un',
      localizacao: 'Prateleira 2',
      fornecedor_id: null
    });
  });

  // Since Supabase `id` is usually an auto-generated UUID, we shouldn't supply the ID explicitly unless it's text.
  // The database schema likely uses UUIDs for `id`. Let's just omit ids to let Supabase generate them.
  const records = itens.map(i => {
    const { id, ...rest } = i;
    return rest;
  });

  console.log(`Inserting ${records.length} items...`);
  const { data, error } = await supabase.from('estoque_itens').insert(records);
  
  if (error) {
    console.error('Error inserting data:', error);
  } else {
    console.log('Successfully inserted data!');
  }
}

seed();
