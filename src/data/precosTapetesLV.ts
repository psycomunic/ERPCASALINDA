/**
 * Catálogo de preços de custo — Tapetes Tellaio (Lar e Vida)
 *
 * Linhas: RIOS e LAGOS
 * Total: 40 coleções com tabelas próprias de tamanho × valor (R$ c/ IPI).
 *
 * Restrições de desenho:
 *   - `desenhos`: o preço só vale para esses desenhos
 *   - `desenhosExcluidos`: NÃO faz nesses desenhos
 *
 * Fonte: planilha de custos Tellaio (entregue pelo cliente)
 */

export type LinhaTapete = 'RIOS' | 'LAGOS'

export interface PrecoTamanho {
  tamanho: string         // canonical: "1,40 × 2,00"
  valor: number           // R$ unitário (com IPI)
  desenhos?: string[]     // se presente, só vale pra estes desenhos
  desenhosExcluidos?: string[]  // se presente, NÃO faz nesses desenhos
}

export interface PrecoColecao {
  nome: string
  linha: LinhaTapete
  m2: number              // valor por m² de referência
  tamanhos: PrecoTamanho[]
}

// ─── LINHA LAGOS ──────────────────────────────────────────────────────────────

const LAGOS: PrecoColecao[] = [
  {
    nome: 'BAIKAL', linha: 'LAGOS', m2: 89.91, tamanhos: [
      { tamanho: '1,00 × 1,50', valor: 143.63 },
      { tamanho: '1,40 × 2,00', valor: 268.11 },
      { tamanho: '2,00 × 2,50', valor: 478.77 },
      { tamanho: '2,00 × 3,00', valor: 574.52 },
      { tamanho: '2,40 × 3,00', valor: 689.43 },
      { tamanho: '2,50 × 3,50', valor: 837.85 },
      { tamanho: '3,00 × 4,00', valor: 1149.05 },
    ],
  },
  {
    nome: 'BATUR', linha: 'LAGOS', m2: 71.50, tamanhos: [
      { tamanho: '1,00 × 1,50', valor: 114.22 },
      { tamanho: '1,40 × 2,00', valor: 213.21 },
      { tamanho: '2,00 × 2,50', valor: 380.74 },
      { tamanho: '2,40 × 3,00', valor: 548.26 },
      { tamanho: '2,50 × 3,50', valor: 666.29 },
      { tamanho: '3,00 × 4,00', valor: 913.77 },
    ],
  },
  {
    nome: 'CASPIO', linha: 'LAGOS', m2: 61.91, tamanhos: [
      { tamanho: '1,00 × 1,50', valor: 98.90 },
      { tamanho: '1,40 × 2,00', valor: 184.62 },
      { tamanho: '2,00 × 2,50', valor: 329.67 },
      { tamanho: '2,40 × 3,00', valor: 474.73 },
      { tamanho: '2,50 × 3,50', valor: 576.92 },
      { tamanho: '3,00 × 4,00', valor: 791.21 },
    ],
  },
  {
    nome: 'FALKNER', linha: 'LAGOS', m2: 75.50, tamanhos: [
      { tamanho: '1,00 × 1,50', valor: 120.61 },
      { tamanho: '1,40 × 2,00', valor: 225.14 },
      { tamanho: '2,00 × 2,50', valor: 402.04 },
      { tamanho: '2,40 × 3,00', valor: 578.93 },
      { tamanho: '2,50 × 3,50', valor: 703.57 },
      { tamanho: '3,00 × 4,00', valor: 964.89 },
    ],
  },
  {
    nome: 'GUAIBA', linha: 'LAGOS', m2: 75.50, tamanhos: [
      { tamanho: '1,00 × 1,50', valor: 120.61 },
      { tamanho: '1,40 × 2,00', valor: 225.14 },
      { tamanho: '2,00 × 2,50', valor: 402.04 },
      { tamanho: '2,40 × 3,00', valor: 578.93 },
      { tamanho: '2,50 × 3,50', valor: 703.57 },
      { tamanho: '3,00 × 4,00', valor: 964.89 },
      { tamanho: '1,50 × 1,50', valor: 180.92, desenhos: ['01'] },
      { tamanho: '2,00 × 2,00', valor: 321.63, desenhos: ['01'] },
      { tamanho: '2,50 × 2,50', valor: 502.55, desenhos: ['01'] },
    ],
  },
  {
    nome: 'HILLIER', linha: 'LAGOS', m2: 89.90, tamanhos: [
      { tamanho: '1,40 × 2,00', valor: 268.08 },
      { tamanho: '2,00 × 2,50', valor: 478.72 },
      { tamanho: '2,40 × 3,00', valor: 689.35 },
      { tamanho: '2,50 × 3,50', valor: 837.76 },
      { tamanho: '3,00 × 4,00', valor: 1148.92 },
      { tamanho: '1,50 × 1,50', valor: 215.42, desenhos: ['04', '05'] },
      { tamanho: '2,00 × 2,00', valor: 382.97, desenhos: ['04', '05'] },
      { tamanho: '2,50 × 2,50', valor: 598.40, desenhos: ['04', '05'] },
    ],
  },
  {
    nome: 'LADOGA', linha: 'LAGOS', m2: 102.90, tamanhos: [
      { tamanho: '1,40 × 2,00', valor: 306.85 },
      { tamanho: '2,00 × 2,50', valor: 547.94 },
      { tamanho: '2,40 × 3,00', valor: 789.04 },
    ],
  },
  {
    nome: 'NAKURU', linha: 'LAGOS', m2: 85.50, tamanhos: [
      { tamanho: '1,00 × 1,50', valor: 136.59 },
      { tamanho: '1,40 × 2,00', valor: 254.96 },
      { tamanho: '2,00 × 2,50', valor: 455.29 },
      { tamanho: '2,40 × 3,00', valor: 655.61 },
      { tamanho: '2,50 × 3,50', valor: 796.75 },
      { tamanho: '3,00 × 4,00', valor: 1092.69 },
      { tamanho: '1,50 × 1,50', valor: 204.88, desenhos: ['04', '08'] },
      { tamanho: '2,00 × 2,00', valor: 364.23, desenhos: ['04', '08'] },
      { tamanho: '2,50 × 2,50', valor: 569.11, desenhos: ['04', '08'] },
    ],
  },
  {
    nome: 'NIASSA', linha: 'LAGOS', m2: 102.90, tamanhos: [
      { tamanho: '1,40 × 2,00', valor: 306.85 },
      { tamanho: '2,00 × 2,50', valor: 547.94 },
      { tamanho: '2,40 × 3,00', valor: 789.04 },
      { tamanho: '2,50 × 3,50', valor: 958.90 },
      { tamanho: '3,00 × 4,00', valor: 1315.06 },
    ],
  },
  {
    nome: 'ONEGA', linha: 'LAGOS', m2: 89.90, tamanhos: [
      { tamanho: '1,40 × 2,00', valor: 268.08 },
      { tamanho: '2,00 × 2,50', valor: 478.72 },
      { tamanho: '2,40 × 3,00', valor: 689.35 },
      { tamanho: '2,50 × 3,50', valor: 837.76 },
      { tamanho: '3,00 × 4,00', valor: 1148.92 },
    ],
  },
  {
    nome: 'TAAL', linha: 'LAGOS', m2: 64.50, tamanhos: [
      { tamanho: '1,00 × 1,50', valor: 103.04 },
      { tamanho: '1,40 × 2,00', valor: 192.34 },
      { tamanho: '2,00 × 2,50', valor: 343.46 },
      { tamanho: '2,40 × 3,00', valor: 494.59 },
      { tamanho: '2,50 × 3,50', valor: 601.06 },
      { tamanho: '3,00 × 4,00', valor: 824.31 },
      { tamanho: '1,50 × 1,50', valor: 154.56, desenhos: ['15', '16'] },
      { tamanho: '2,00 × 2,00', valor: 274.77, desenhos: ['15', '16'] },
      { tamanho: '2,50 × 2,50', valor: 429.33, desenhos: ['15', '16'] },
    ],
  },
  {
    nome: 'TITICACA', linha: 'LAGOS', m2: 112.90, tamanhos: [
      { tamanho: '1,40 × 2,00', valor: 336.67 },
      { tamanho: '2,00 × 2,50', valor: 601.19 },
      { tamanho: '2,40 × 3,00', valor: 865.72 },
      { tamanho: '2,50 × 3,50', valor: 1052.09 },
      { tamanho: '3,00 × 3,50', valor: 1262.50 },
    ],
  },
  {
    nome: 'VENER', linha: 'LAGOS', m2: 56.90, tamanhos: [
      { tamanho: '1,00 × 1,50', valor: 90.90 },
      { tamanho: '1,40 × 2,00', valor: 169.68 },
      { tamanho: '2,00 × 2,50', valor: 302.99 },
      { tamanho: '2,40 × 3,00', valor: 436.31 },
      { tamanho: '2,50 × 3,50', valor: 530.24 },
      { tamanho: '3,00 × 4,00', valor: 727.18 },
      { tamanho: '1,50 × 1,50', valor: 136.35, desenhos: ['08'] },
      { tamanho: '2,00 × 2,00', valor: 242.39, desenhos: ['08'] },
      { tamanho: '2,50 × 2,50', valor: 378.74, desenhos: ['08'] },
    ],
  },
  {
    nome: 'VITORIA', linha: 'LAGOS', m2: 80.90, tamanhos: [
      { tamanho: '1,00 × 1,50', valor: 129.24 },
      { tamanho: '1,40 × 2,00', valor: 241.24 },
      { tamanho: '2,00 × 2,50', valor: 430.79 },
      { tamanho: '2,40 × 3,00', valor: 620.34 },
      { tamanho: '2,50 × 3,50', valor: 753.89 },
      { tamanho: '3,00 × 4,00', valor: 1033.90 },
      { tamanho: '2,00 × 3,00', valor: 516.95 },
    ],
  },
  {
    nome: 'VOSTOK', linha: 'LAGOS', m2: 42.00, tamanhos: [
      { tamanho: '1,00 × 1,50', valor: 67.10 },
      { tamanho: '1,40 × 2,00', valor: 125.24 },
      { tamanho: '2,00 × 2,50', valor: 223.65 },
      { tamanho: '2,00 × 3,00', valor: 268.38 },
      { tamanho: '2,40 × 3,00', valor: 322.06 },
    ],
  },
  {
    nome: 'WABBY', linha: 'LAGOS', m2: 113.95, tamanhos: [
      { tamanho: '0,50 × 1,00', valor: 60.68 },
      { tamanho: '0,60 × 1,80', valor: 131.07 },
      { tamanho: '1,00 × 1,40', valor: 169.90 },
      { tamanho: '1,40 × 2,00', valor: 339.80 },
      { tamanho: '2,00 × 2,40', valor: 582.51 },
      { tamanho: '2,00 × 3,00', valor: 728.14 },
      { tamanho: '2,30 × 3,00', valor: 837.36 },
      { tamanho: '1,50 × 1,50', valor: 273.05 },
      { tamanho: '2,00 × 2,00', valor: 485.43 },
    ],
  },
]

// ─── LINHA RIOS ───────────────────────────────────────────────────────────────

const RIOS: PrecoColecao[] = [
  {
    nome: 'AMUR', linha: 'RIOS', m2: 97.50, tamanhos: [
      { tamanho: '1,40 × 2,00', valor: 290.75 },
      { tamanho: '2,00 × 2,50', valor: 519.19 },
      { tamanho: '2,00 × 3,00', valor: 623.03 },
      { tamanho: '2,40 × 3,00', valor: 747.63 },
      { tamanho: '2,50 × 3,50', valor: 908.58 },
      { tamanho: '3,00 × 4,00', valor: 1246.05 },
    ],
  },
  {
    nome: 'ARNO', linha: 'RIOS', m2: 86.50, tamanhos: [
      { tamanho: '1,40 × 2,00', valor: 257.94 },
      { tamanho: '2,00 × 2,50', valor: 460.61 },
      { tamanho: '2,40 × 3,00', valor: 663.28 },
      { tamanho: '2,50 × 3,50', valor: 806.07 },
      { tamanho: '3,00 × 4,00', valor: 1105.47 },
      { tamanho: '3,00 × 5,00', valor: 1381.84 },
      { tamanho: '3,50 × 4,50', valor: 1450.93 },
    ],
  },
  {
    nome: 'CONGO', linha: 'RIOS', m2: 114.50, tamanhos: [
      { tamanho: '1,40 × 2,00', valor: 341.44 },
      { tamanho: '2,00 × 2,50', valor: 609.71 },
      { tamanho: '2,40 × 3,00', valor: 877.99 },
      { tamanho: '2,50 × 3,50', valor: 1067.00 },
      { tamanho: '3,00 × 4,00', valor: 1463.31 },
    ],
  },
  {
    nome: 'DANUBIO', linha: 'RIOS', m2: 90.65, tamanhos: [
      { tamanho: '1,40 × 2,00', valor: 270.32 },
      { tamanho: '2,00 × 2,50', valor: 482.71 },
      { tamanho: '2,40 × 3,00', valor: 695.10 },
      { tamanho: '2,50 × 3,50', valor: 844.74 },
      { tamanho: '3,00 × 4,00', valor: 1158.51 },
      { tamanho: '3,00 × 5,00', valor: 1448.13 },
      { tamanho: '3,50 × 4,50', valor: 1520.54 },
      { tamanho: '1,50 × 1,50', valor: 217.22, desenhos: ['01'] },
      { tamanho: '2,00 × 2,00', valor: 386.17, desenhos: ['01'] },
      { tamanho: '2,50 × 2,50', valor: 603.39, desenhos: ['01'] },
    ],
  },
  {
    nome: 'EUFRATES', linha: 'RIOS', m2: 137.10, tamanhos: [
      { tamanho: '1,30 × 2,00', valor: 379.63 },
      { tamanho: '1,90 × 2,50', valor: 693.55 },
      { tamanho: '2,40 × 3,00', valor: 1051.28 },
      { tamanho: '2,40 × 3,50', valor: 1226.50 },
      { tamanho: '2,90 × 4,00', valor: 1693.73 },
      { tamanho: '2,90 × 5,00', valor: 2117.17 },
      { tamanho: '3,50 × 4,50', valor: 2299.68 },
    ],
  },
  {
    nome: 'GANGES', linha: 'RIOS', m2: 90.90, tamanhos: [
      { tamanho: '1,40 × 2,00', valor: 271.06 },
      { tamanho: '2,00 × 2,50', valor: 484.04 },
      { tamanho: '2,40 × 3,00', valor: 697.02 },
      { tamanho: '2,50 × 3,50', valor: 847.07 },
      { tamanho: '3,00 × 4,00', valor: 1161.70 },
    ],
  },
  {
    nome: 'JAPURA', linha: 'RIOS', m2: 115.90, tamanhos: [
      { tamanho: '1,40 × 2,00', valor: 345.61 },
      { tamanho: '2,00 × 2,50', valor: 617.17 },
      { tamanho: '2,40 × 3,00', valor: 888.72 },
      { tamanho: '2,50 × 3,50', valor: 1080.04 },
      { tamanho: '3,00 × 4,00', valor: 1481.20 },
    ],
  },
  {
    nome: 'JURUA', linha: 'RIOS', m2: 114.50, tamanhos: [
      { tamanho: '1,40 × 2,00', valor: 341.44 },
      { tamanho: '2,00 × 2,50', valor: 609.71 },
      { tamanho: '2,40 × 3,00', valor: 877.99 },
      { tamanho: '2,50 × 3,50', valor: 1067.00 },
      { tamanho: '3,00 × 4,00', valor: 1463.31 },
    ],
  },
  {
    nome: 'LENA', linha: 'RIOS', m2: 100.50, tamanhos: [
      { tamanho: '1,40 × 2,00', valor: 299.69 },
      { tamanho: '2,00 × 2,50', valor: 535.16 },
      { tamanho: '2,40 × 3,00', valor: 770.63 },
      { tamanho: '2,50 × 3,50', valor: 936.53 },
      { tamanho: '3,00 × 4,00', valor: 1284.39 },
    ],
  },
  {
    nome: 'MADEIRA', linha: 'RIOS', m2: 103.90, tamanhos: [
      { tamanho: '1,40 × 2,00', valor: 309.83 },
      { tamanho: '2,00 × 2,50', valor: 553.27 },
      { tamanho: '2,40 × 3,00', valor: 796.71 },
      { tamanho: '2,50 × 3,50', valor: 968.22 },
      { tamanho: '3,00 × 4,00', valor: 1327.84 },
    ],
  },
  {
    nome: 'MISSISSIPI', linha: 'RIOS', m2: 165.50, tamanhos: [
      { tamanho: '1,40 × 2,00', valor: 493.52 },
      { tamanho: '2,00 × 2,50', valor: 881.29 },
      { tamanho: '2,40 × 3,00', valor: 1269.05 },
      { tamanho: '2,50 × 3,50', valor: 1542.25 },
      { tamanho: '3,00 × 4,00', valor: 2115.09 },
      { tamanho: '3,00 × 5,00', valor: 2643.86, desenhos: ['03', '04'] },
      { tamanho: '3,50 × 4,50', valor: 2776.06, desenhos: ['03', '04'] },
    ],
  },
  {
    nome: 'NILO', linha: 'RIOS', m2: 136.90, tamanhos: [
      { tamanho: '1,40 × 2,00', valor: 408.24 },
      { tamanho: '2,00 × 2,50', valor: 728.99 },
      { tamanho: '2,40 × 3,00', valor: 1049.75 },
      { tamanho: '2,50 × 3,50', valor: 1275.74 },
      { tamanho: '3,00 × 4,00', valor: 1749.58 },
    ],
  },
  {
    nome: 'PARANA', linha: 'RIOS', m2: 135.90, tamanhos: [
      { tamanho: '1,40 × 2,00', valor: 405.25 },
      { tamanho: '2,00 × 2,50', valor: 723.67 },
      { tamanho: '2,40 × 3,00', valor: 1042.08 },
      { tamanho: '2,50 × 3,50', valor: 1266.42 },
      { tamanho: '3,00 × 4,00', valor: 1736.80 },
    ],
  },
  {
    nome: 'RENO', linha: 'RIOS', m2: 75.90, tamanhos: [
      { tamanho: '1,40 × 2,00', valor: 226.33 },
      { tamanho: '2,00 × 2,50', valor: 404.17 },
      { tamanho: '2,40 × 3,00', valor: 582.00 },
      { tamanho: '2,50 × 3,50', valor: 707.29 },
      { tamanho: '3,00 × 4,00', valor: 970.00 },
    ],
  },
  {
    nome: 'SAO FRANCISCO', linha: 'RIOS', m2: 135.90, tamanhos: [
      { tamanho: '1,40 × 2,00', valor: 405.25 },
      { tamanho: '2,00 × 2,50', valor: 723.67 },
      { tamanho: '2,40 × 3,00', valor: 1042.08 },
      { tamanho: '2,50 × 3,50', valor: 1266.42 },
      { tamanho: '3,00 × 4,00', valor: 1736.80 },
    ],
  },
  {
    nome: 'SENA', linha: 'RIOS', m2: 103.60, tamanhos: [
      { tamanho: '1,40 × 2,00', valor: 308.94 },
      { tamanho: '2,00 × 2,50', valor: 551.67 },
      { tamanho: '2,40 × 3,00', valor: 794.40 },
      { tamanho: '2,50 × 3,50', valor: 965.42 },
      { tamanho: '3,00 × 4,00', valor: 1324.01 },
      { tamanho: '3,00 × 5,00', valor: 1655.01 },
      { tamanho: '3,50 × 4,50', valor: 1737.76 },
      { tamanho: '1,50 × 1,50', valor: 248.25, desenhos: ['03', '06'] },
      { tamanho: '2,00 × 2,00', valor: 441.34, desenhos: ['03', '06'] },
      { tamanho: '2,50 × 2,50', valor: 689.59, desenhos: ['03', '06'] },
    ],
  },
  {
    nome: 'TAMISA', linha: 'RIOS', m2: 141.78, tamanhos: [
      { tamanho: '1,40 × 2,00', valor: 422.79 },
      { tamanho: '2,00 × 2,50', valor: 754.98 },
      { tamanho: '2,40 × 3,00', valor: 1087.17 },
      { tamanho: '2,50 × 3,50', valor: 1321.21 },
      { tamanho: '3,00 × 4,00', valor: 1811.95 },
    ],
  },
  {
    nome: 'TAPAJOS', linha: 'RIOS', m2: 91.69, tamanhos: [
      { tamanho: '1,40 × 2,00', valor: 273.42 },
      { tamanho: '2,00 × 2,50', valor: 488.25 },
      { tamanho: '2,40 × 3,00', valor: 703.08 },
      { tamanho: '2,50 × 3,50', valor: 854.44 },
      { tamanho: '3,00 × 4,00', valor: 1171.80 },
    ],
  },
  {
    nome: 'TEFE', linha: 'RIOS', m2: 114.50, tamanhos: [
      { tamanho: '1,40 × 2,00', valor: 341.44 },
      { tamanho: '2,00 × 2,50', valor: 609.71 },
      { tamanho: '2,40 × 3,00', valor: 877.99 },
      { tamanho: '2,50 × 3,50', valor: 1067.00 },
      { tamanho: '3,00 × 4,00', valor: 1463.31 },
    ],
  },
  {
    nome: 'TEJO', linha: 'RIOS', m2: 97.90, tamanhos: [
      { tamanho: '1,40 × 2,00', valor: 291.94 },
      { tamanho: '2,00 × 2,50', valor: 521.32 },
      { tamanho: '2,40 × 3,00', valor: 750.70 },
      { tamanho: '2,50 × 3,50', valor: 912.31 },
      { tamanho: '3,00 × 4,00', valor: 1251.16 },
    ],
  },
  {
    nome: 'TEVERE', linha: 'RIOS', m2: 88.50, tamanhos: [
      { tamanho: '1,40 × 2,00', valor: 263.91 },
      { tamanho: '2,00 × 2,50', valor: 471.26 },
      { tamanho: '2,40 × 3,00', valor: 678.62 },
      { tamanho: '2,50 × 3,50', valor: 824.71 },
      { tamanho: '3,00 × 4,00', valor: 1131.03 },
      { tamanho: '3,00 × 5,00', valor: 1413.79 },
      { tamanho: '3,50 × 4,50', valor: 1484.48 },
    ],
  },
  {
    nome: 'TIETE', linha: 'RIOS', m2: 97.50, tamanhos: [
      { tamanho: '1,40 × 2,00', valor: 290.75 },
      { tamanho: '2,00 × 2,50', valor: 519.19 },
      { tamanho: '2,40 × 3,00', valor: 747.63 },
      { tamanho: '2,50 × 3,50', valor: 908.58 },
      { tamanho: '3,00 × 4,00', valor: 1246.05 },
      { tamanho: '3,00 × 5,00', valor: 1557.56, desenhosExcluidos: ['05'] },
      { tamanho: '3,50 × 4,50', valor: 1635.44, desenhosExcluidos: ['05'] },
    ],
  },
  {
    nome: 'TIGRE', linha: 'RIOS', m2: 156.50, tamanhos: [
      { tamanho: '1,30 × 2,00', valor: 433.35 },
      { tamanho: '1,90 × 2,50', valor: 791.69 },
      { tamanho: '2,40 × 3,00', valor: 1200.04 },
      { tamanho: '2,40 × 3,50', valor: 1400.05 },
      { tamanho: '2,90 × 4,00', valor: 1933.40 },
      { tamanho: '2,90 × 5,00', valor: 2416.75 },
      { tamanho: '3,50 × 4,50', valor: 2625.09 },
    ],
  },
  {
    nome: 'XINGU', linha: 'RIOS', m2: 118.90, tamanhos: [
      { tamanho: '2,00 × 2,50', valor: 633.14 },
      { tamanho: '2,40 × 3,00', valor: 911.73 },
      { tamanho: '2,50 × 3,50', valor: 1108.00 },
      { tamanho: '3,00 × 4,00', valor: 1519.54 },
    ],
  },
]

export const PRECOS_TAPETES: PrecoColecao[] = [...LAGOS, ...RIOS]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normaliza strings de coleção/tamanho (case-insensitive, trim, sem acento). */
function norm(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toUpperCase()
}

/** Encontra uma coleção pelo nome (case-insensitive, ignora acentos). */
export function findColecao(nome: string): PrecoColecao | undefined {
  const k = norm(nome)
  return PRECOS_TAPETES.find(c => norm(c.nome) === k)
}

/**
 * Busca o preço unitário para uma combinação coleção × tamanho.
 * Retorna null se a coleção/tamanho não estiver mapeada.
 *
 * Se houver múltiplas linhas pro mesmo tamanho (raro), retorna a primeira.
 */
export function findPreco(colecao: string, tamanho: string): PrecoTamanho | null {
  const col = findColecao(colecao)
  if (!col) return null
  const t = norm(tamanho)
  return col.tamanhos.find(x => norm(x.tamanho) === t) ?? null
}

/** Lista nomes de coleções de uma linha (na ordem do catálogo). */
export function colecoesDaLinha(linha: LinhaTapete): string[] {
  return PRECOS_TAPETES.filter(c => c.linha === linha).map(c => c.nome)
}

/** Lista todos os tamanhos válidos para uma coleção. */
export function tamanhosDaColecao(colecao: string): PrecoTamanho[] {
  return findColecao(colecao)?.tamanhos ?? []
}
