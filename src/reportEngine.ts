/**
 * reportEngine.ts
 * Central report data source — all mock data for the ERP reports.
 * In production, replace with real API calls using the same shape.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReportOrder {
  id: string; cliente: string; produto: string; material: string
  etapa: string; prazo: string; status: string; valor: number
}

export interface ReportTx {
  data: string; descricao: string; categoria: string
  valor: number; tipo: 'entrada' | 'saida'; status: string
}

export interface ReportItem {
  ref: string; nome: string; unidade: string
  atual: number; minimo: number; status: string
}

export interface ReportAsset {
  tag: string; nome: string; categoria: string
  localizacao: string; valor: number; dataAquisicao: string; status: string
}

export interface ReportDespacho {
  id: string; cliente: string; produto: string
  transportadora: string; rastreio: string
  prazoEntrega: string; dataDespacho: string; endereco: string
}

// ─── Mock datasets ─────────────────────────────────────────────────────────────

export const ORDERS: ReportOrder[] = [
  { id:'0821', cliente:'Mariana S. Oliveira', produto:'Trip Natureza Aquarela 100×90', material:'Papel Matte Premium', etapa:'Impressão',           prazo:'18/04/2026', status:'Pendente',  valor: 680 },
  { id:'0820', cliente:'Lucas Ferreira',      produto:'Canvas Abstract Gold 80×60',    material:'Canvas Lona',         etapa:'Acabamento',           prazo:'12/04/2026', status:'Concluído', valor: 420 },
  { id:'0819', cliente:'Ricardo Augusto',     produto:'Canvas Skyline NY 120×80',      material:'Canvas Lona',         etapa:'Impressão',            prazo:'20/04/2026', status:'OK',        valor: 550 },
  { id:'0818', cliente:'Patrícia Nunes',      produto:'Quadro Provençal 60×80',        material:'Tecido Linho',        etapa:'Entelamento + Vidro',  prazo:'14/04/2026', status:'Concluído', valor: 380 },
  { id:'0817', cliente:'Gustavo Henrique',    produto:'Painel Geométrico 90×120',      material:'PVC Vinílico',        etapa:'Embalagem',            prazo:'12/04/2026', status:'Concluído', valor: 720 },
  { id:'0816', cliente:'Amanda Rocha',        produto:'Canvas Praia Sunset 100×70',    material:'Canvas Lona',        etapa:'Embalagem',            prazo:'13/04/2026', status:'Concluído', valor: 510 },
  { id:'0815', cliente:'Fernanda Lima',       produto:'Moldura Filete Carvalho 60×70', material:'—',                  etapa:'Corte Moldura',        prazo:'13/04/2026', status:'Atrasado',  valor: 290 },
  { id:'0814', cliente:'Bruno Carvalho',      produto:'Tríptico Abstrato 3×40×60',    material:'Papel Matte Premium', etapa:'Acabamento',           prazo:'11/04/2026', status:'Concluído', valor: 850 },
  { id:'0813', cliente:'Isabela Martins',     produto:'Quadro Mandala 80×80',          material:'Canvas Lona',        etapa:'Acabamento',           prazo:'11/04/2026', status:'Concluído', valor: 460 },
  { id:'0810', cliente:'João Pedro Santos',   produto:'Quadro Espelhado Lux 100×100',  material:'Canvas Lona',        etapa:'Entelamento + Vidro',  prazo:'15/04/2026', status:'OK',        valor: 940 },
  { id:'0808', cliente:'Carla Mendes',        produto:'Painel Moderno 80×60',          material:'Canvas Lona',        etapa:'Entelamento + Vidro',  prazo:'16/04/2026', status:'OK',        valor: 380 },
  { id:'0803', cliente:'Ana Paula Ramos',     produto:'Canvas Abstrato 90×70',         material:'Canvas Lona',        etapa:'Pronto para Envio',    prazo:'14/04/2026', status:'Pronto',    valor: 490 },
  { id:'0800', cliente:'Roberto Faria',       produto:'Tríptico Floresta 3×60×80',    material:'Canvas Lona',        etapa:'Pronto para Envio',    prazo:'15/04/2026', status:'Pronto',    valor: 1100 },
  { id:'0795', cliente:'Cláudia Souza',       produto:'Quadro Portofino 80×100',       material:'Canvas Lona',        etapa:'Despachado',           prazo:'13/04/2026', status:'Despachado',valor: 620 },
  { id:'0792', cliente:'Marcos Vinícius',     produto:'Canvas New York 120×80',        material:'Canvas Lona',        etapa:'Despachado',           prazo:'12/04/2026', status:'Despachado',valor: 550 },
]

export const TRANSACTIONS: ReportTx[] = [
  { data:'2026-04-12', descricao:'Venda Pedido #8821 – Tecidos Linho',    categoria:'VENDAS',        valor:4500,  tipo:'entrada', status:'pago'     },
  { data:'2026-04-12', descricao:'Venda Pedido #8820 – Lucas Ferreira',   categoria:'VENDAS',        valor:420,   tipo:'entrada', status:'pago'     },
  { data:'2026-04-12', descricao:'Frete Entrega Zona Leste',              categoria:'LOGÍSTICA',     valor:420,   tipo:'saida',   status:'pago'     },
  { data:'2026-04-11', descricao:'Fornecedor Madeira Carvalho – Lote 12', categoria:'MATÉRIA PRIMA', valor:12800, tipo:'saida',   status:'pendente' },
  { data:'2026-04-11', descricao:'Comissão Arquiteta Carla – Parceria',   categoria:'VENDAS',        valor:2100,  tipo:'entrada', status:'atrasado' },
  { data:'2026-04-11', descricao:'Venda Pedido #8817 – Gustavo H.',       categoria:'VENDAS',        valor:720,   tipo:'entrada', status:'pago'     },
  { data:'2026-04-10', descricao:'Energia Elétrica Fábrica',              categoria:'OPERACIONAL',   valor:980,   tipo:'saida',   status:'pago'     },
  { data:'2026-04-10', descricao:'Manutenção Showroom – Pintura',         categoria:'MANUTENÇÃO',    valor:1250,  tipo:'saida',   status:'pago'     },
  { data:'2026-04-09', descricao:'Venda Pedido #8814 – Bruno C.',         categoria:'VENDAS',        valor:850,   tipo:'entrada', status:'pago'     },
  { data:'2026-04-09', descricao:'Venda Pedido #8813 – Isabela M.',       categoria:'VENDAS',        valor:460,   tipo:'entrada', status:'pago'     },
  { data:'2026-04-08', descricao:'Salários Equipe Produção – Semana 1',   categoria:'RH',            valor:8400,  tipo:'saida',   status:'pago'     },
  { data:'2026-04-07', descricao:'Compra Papel Matte Premium 10 Resmas',  categoria:'MATÉRIA PRIMA', valor:1200,  tipo:'saida',   status:'pago'     },
  { data:'2026-04-07', descricao:'Venda Pedido #8810 – João P.',          categoria:'VENDAS',        valor:940,   tipo:'entrada', status:'pendente' },
  { data:'2026-04-05', descricao:'Compra Canvas Lona – Rolo 50m',         categoria:'MATÉRIA PRIMA', valor:2800,  tipo:'saida',   status:'pago'     },
  { data:'2026-04-01', descricao:'Aluguel Galpão – Abril',               categoria:'OPERACIONAL',   valor:5500,  tipo:'saida',   status:'pago'     },
]

export const STOCK_ITEMS: ReportItem[] = [
  { ref:'REF:ALU-022', nome:'Perfil Alumínio Prata',  unidade:'metros',    atual:420.5, minimo:100,  status:'NORMAL'  },
  { ref:'REF:VDR-3WC', nome:'Vidro Float 3mm Clear',  unidade:'m²',        atual:14.2,  minimo:25,   status:'CRÍTICO' },
  { ref:'REF:TEL-POL', nome:'Tela Poliéster Branca',  unidade:'rolos',     atual:8.0,   minimo:5,    status:'ATENÇÃO' },
  { ref:'REF:CNR-CPQ', nome:'Cantoneira Plástica L',  unidade:'unidades',  atual:1250,  minimo:500,  status:'NORMAL'  },
  { ref:'REF:PAP-MT1', nome:'Papel Matte Premium A3', unidade:'resmas',    atual:4,     minimo:10,   status:'CRÍTICO' },
  { ref:'REF:TIN-CYN', nome:'Tinta Pigmentada Ciano', unidade:'cartuchos', atual:2,     minimo:8,    status:'CRÍTICO' },
  { ref:'REF:TIN-MAG', nome:'Tinta Pigmentada Magenta',unidade:'cartuchos',atual:3,     minimo:8,    status:'CRÍTICO' },
  { ref:'REF:MOL-CAR', nome:'Moldura Carvalho 3cm',   unidade:'metros',    atual:85,    minimo:50,   status:'ATENÇÃO' },
  { ref:'REF:EMB-CXA', nome:'Caixa Embalagem G',      unidade:'unidades',  atual:42,    minimo:20,   status:'NORMAL'  },
  { ref:'REF:FTA-ADH', nome:'Fita Adesiva Reforçada', unidade:'rolos',     atual:18,    minimo:10,   status:'NORMAL'  },
]

export const ASSETS: ReportAsset[] = [
  { tag:'PAT-001', nome:'Impressora Industrial HP Latex',  categoria:'Maquinário', localizacao:'Produção A',  valor:85000,  dataAquisicao:'12/01/2024', status:'ATIVO' },
  { tag:'PAT-045', nome:'Estação de Trabalho Dell XPS',    categoria:'TI',          localizacao:'Escritório',  valor:12500,  dataAquisicao:'05/03/2025', status:'ATIVO' },
  { tag:'PAT-040', nome:'Mesa de Corte Automatizada',       categoria:'Maquinário', localizacao:'Produção B',  valor:42000,  dataAquisicao:'20/11/2023', status:'MANUTENÇÃO' },
  { tag:'PAT-012', nome:'Caminhão de Entrega Iveco',        categoria:'Veículos',   localizacao:'Externo',     valor:110000, dataAquisicao:'08/06/2022', status:'ATIVO' },
  { tag:'PAT-033', nome:'Servidor de Armazenamento NAS',    categoria:'TI',          localizacao:'Escritório',  valor:8900,   dataAquisicao:'14/09/2024', status:'ATIVO' },
  { tag:'PAT-027', nome:'Ar-Condicionado Central 60.000',   categoria:'Estrutura',  localizacao:'Produção A',  valor:15800,  dataAquisicao:'03/02/2023', status:'ATIVO' },
]

export const DESPACHOS: ReportDespacho[] = [
  { id:'0795', cliente:'Cláudia Souza',  produto:'Quadro Portofino 80×100',    transportadora:'JadLog',          rastreio:'BR123456789BR',   prazoEntrega:'13/04/2026', dataDespacho:'10/04/2026 09:30', endereco:'Rua Augusta, 200 — Cerqueira César, SP' },
  { id:'0792', cliente:'Marcos Vinícius',produto:'Canvas New York 120×80',     transportadora:'Loggi',           rastreio:'LG09876543210',   prazoEntrega:'12/04/2026', dataDespacho:'09/04/2026 14:00', endereco:'Rua Oscar Freire, 50 — Jardins, SP' },
  { id:'0788', cliente:'Sofia Almeida',  produto:'Tríptico Botânico 3×60×80', transportadora:'Total Express',   rastreio:'TE00123411ABC',   prazoEntrega:'12/04/2026', dataDespacho:'09/04/2026 16:45', endereco:'Al. Santos, 800 — Jardim Paulista, SP' },
  { id:'0803', cliente:'Ana Paula Ramos',produto:'Canvas Abstrato 90×70',      transportadora:'Retirar na Loja', rastreio:'—',               prazoEntrega:'14/04/2026', dataDespacho:'—',                endereco:'Rua das Flores, 452 — Moema, SP' },
  { id:'0800', cliente:'Roberto Faria',  produto:'Tríptico Floresta 3×60×80', transportadora:'Bauer Express',  rastreio:'—',               prazoEntrega:'15/04/2026', dataDespacho:'—',                endereco:'Av. Paulista, 1000 — Bela Vista, SP' },
]

// ─── Utility ───────────────────────────────────────────────────────────────────

export const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

export const today = () => new Date().toISOString().slice(0, 10)

export const filterByDate = <T extends { data: string }>(
  items: T[], from: string, to: string
): T[] => {
  if (!from && !to) return items
  return items.filter(i => {
    if (from && i.data < from) return false
    if (to   && i.data > to)   return false
    return true
  })
}
