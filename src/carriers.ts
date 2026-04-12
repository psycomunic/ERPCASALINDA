/**
 * carriers.ts
 * Lista completa de transportadoras do sistema Casa Linda.
 * Fonte: lista importada pelo usuário (45 registros).
 */

export type CarrierType =
  | 'Portal de Transportes'
  | 'Correios'
  | 'Entrega Própria (Outros)'
  | 'Retirar na Loja'

export interface Carrier {
  id: number
  nome: string
  tipo: CarrierType
}

export const CARRIERS: Carrier[] = [
  // ─── Portal de Transportes ─────────────────────────────────────────────────
  { id: 35, nome: 'Aceville Transportes',       tipo: 'Portal de Transportes' },
  { id: 42, nome: 'Aeropress',                  tipo: 'Portal de Transportes' },
  { id: 30, nome: 'Azul Cargo',                 tipo: 'Portal de Transportes' },
  { id: 16, nome: 'Bauer Express',              tipo: 'Portal de Transportes' },
  { id: 18, nome: 'Braspress',                  tipo: 'Portal de Transportes' },
  { id: 33, nome: 'Buslog',                     tipo: 'Portal de Transportes' },
  { id: 10, nome: 'Carriers',                   tipo: 'Portal de Transportes' },
  { id: 26, nome: 'Cnxlog',                     tipo: 'Portal de Transportes' },
  { id:  1, nome: 'Correios Local',             tipo: 'Portal de Transportes' },
  { id: 12, nome: 'DLOG-N',                     tipo: 'Portal de Transportes' },
  { id: 23, nome: 'Daytona Express',            tipo: 'Portal de Transportes' },
  { id: 37, nome: 'Destak Transportes',         tipo: 'Portal de Transportes' },
  { id: 43, nome: 'Dialogo',                    tipo: 'Portal de Transportes' },
  { id: 17, nome: 'Direcional',                 tipo: 'Portal de Transportes' },
  { id: 28, nome: 'GFL (Magalu Log)',            tipo: 'Portal de Transportes' },
  { id: 39, nome: 'GSM',                        tipo: 'Portal de Transportes' },
  { id: 24, nome: 'IS Entregas',                tipo: 'Portal de Transportes' },
  { id: 36, nome: 'J&T Express',                tipo: 'Portal de Transportes' },
  { id: 44, nome: 'JadLog',                     tipo: 'Portal de Transportes' },
  { id: 38, nome: 'Jamef',                      tipo: 'Portal de Transportes' },
  { id: 41, nome: 'LOGDI',                      tipo: 'Portal de Transportes' },
  { id: 34, nome: 'Loggi',                      tipo: 'Portal de Transportes' },
  { id: 20, nome: 'Nativa Transportes',         tipo: 'Portal de Transportes' },
  { id: 29, nome: 'Next Express',               tipo: 'Portal de Transportes' },
  { id: 21, nome: 'Ouro Negro',                 tipo: 'Portal de Transportes' },
  { id: 15, nome: 'Platinum Log',               tipo: 'Portal de Transportes' },
  { id: 40, nome: 'Postex',                     tipo: 'Portal de Transportes' },
  { id: 11, nome: 'Premici Envios',             tipo: 'Portal de Transportes' },
  { id: 13, nome: 'Rede Forte',                 tipo: 'Portal de Transportes' },
  { id: 32, nome: 'Rede Sul',                   tipo: 'Portal de Transportes' },
  { id: 31, nome: 'Rodonaves',                  tipo: 'Portal de Transportes' },
  { id: 14, nome: 'Saturno Brasil Transportes', tipo: 'Portal de Transportes' },
  { id: 27, nome: 'Smart2C',                    tipo: 'Portal de Transportes' },
  { id: 25, nome: 'Total Express',              tipo: 'Portal de Transportes' },
  { id: 45, nome: 'Zanotelli Transportes',      tipo: 'Portal de Transportes' },

  // ─── Correios ──────────────────────────────────────────────────────────────
  { id:  5, nome: 'Americanas Entregas',        tipo: 'Correios' },
  { id:  9, nome: 'Envvias',                    tipo: 'Correios' },
  { id:  6, nome: 'Magalu Entregas',            tipo: 'Correios' },
  { id:  3, nome: 'Mercado Livre - ME2',        tipo: 'Correios' },
  { id:  8, nome: 'Shopee Entregas',            tipo: 'Correios' },

  // ─── Entrega Própria (Outros) ──────────────────────────────────────────────
  { id: 22, nome: 'Delivery By Amazon',         tipo: 'Entrega Própria (Outros)' },
  { id:  7, nome: 'Mercado Livre Coletas',      tipo: 'Entrega Própria (Outros)' },
  { id:  4, nome: 'Transportadora do Treinamento', tipo: 'Entrega Própria (Outros)' },

  // ─── Retirar na Loja ───────────────────────────────────────────────────────
  { id: 19, nome: 'Retirar na Loja',            tipo: 'Retirar na Loja' },
]

/** Sorted name list for dropdowns */
export const CARRIER_NAMES = CARRIERS.map(c => c.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'))

/** Group by type for select optgroups */
export const CARRIERS_BY_TYPE = (
  ['Retirar na Loja', 'Entrega Própria (Outros)', 'Correios', 'Portal de Transportes'] as CarrierType[]
).map(tipo => ({
  tipo,
  items: CARRIERS.filter(c => c.tipo === tipo).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
}))

/** Type badge colors */
export const CARRIER_TYPE_COLOR: Record<CarrierType, string> = {
  'Portal de Transportes':   'bg-blue-100 text-blue-700',
  'Correios':                'bg-yellow-100 text-yellow-700',
  'Entrega Própria (Outros)':'bg-purple-100 text-purple-700',
  'Retirar na Loja':         'bg-green-100 text-green-700',
}
