/**
 * Catálogo de modelos de Cama — Estoque Tellaio (Lar e Vida)
 *
 * Diferente do catálogo de Tapetes, aqui não há preço — apenas:
 *   modelo × variante (cor/desenho) × tamanho × disponibilidade.
 *
 * Fonte: planilha "ESTOQUE TELLAIO" (entregue pelo cliente).
 */

export type CategoriaCama = 'PROTETOR' | 'TRAVESSEIRO' | 'COLCHA' | 'EDREDOM' | 'LENCOL'

export interface DisponibilidadeTamanho {
  tamanho: string         // "Solteiro" | "Casal" | "Queen" | "King" | "Super King" | "Fronha par" | "Padrão"
  disponivel: boolean
  previsao?: string       // ex: "Junho" — quando indisponível
}

export interface VarianteCama {
  nome: string                       // ex: "Branco", "Branco/Cinza", "Sortido", "Des. 1 - Branco"
  desenho?: string                   // ex: "01" | "02" — quando aplicável
  tamanhos: DisponibilidadeTamanho[]
}

export interface ModeloCama {
  nome: string                       // ex: "COLCHA CARVALHO"
  categoria: CategoriaCama
  variantes: VarianteCama[]
}

// Atalhos
const D = (tamanho: string): DisponibilidadeTamanho => ({ tamanho, disponivel: true })
const I = (tamanho: string, previsao?: string): DisponibilidadeTamanho =>
  ({ tamanho, disponivel: false, ...(previsao ? { previsao } : {}) })

// ─── PROTETORES ──────────────────────────────────────────────────────────────

const PROTETOR_COLCHAO_CACTO: ModeloCama = {
  nome: 'PROTETOR COLCHÃO CACTO', categoria: 'PROTETOR',
  variantes: [
    {
      nome: 'Padrão',
      tamanhos: [D('Solteiro'), D('Casal'), D('Queen'), D('King')],
    },
  ],
}

const PROTETOR_TRAVESSEIRO_CACTO: ModeloCama = {
  nome: 'PROTETOR TRAVESSEIRO CACTO', categoria: 'PROTETOR',
  variantes: [
    {
      nome: 'Padrão',
      tamanhos: [I('Padrão', 'Junho')],
    },
  ],
}

// ─── TRAVESSEIROS ────────────────────────────────────────────────────────────

const TRAVESSEIROS: ModeloCama = {
  nome: 'TRAVESSEIROS', categoria: 'TRAVESSEIRO',
  variantes: [
    { nome: 'Azaleia', tamanhos: [D('Padrão')] },
    { nome: 'Dália (233 fios)', tamanhos: [D('Padrão')] },
  ],
}

// ─── COLCHAS ─────────────────────────────────────────────────────────────────

const COLCHA_CARVALHO: ModeloCama = {
  nome: 'COLCHA CARVALHO', categoria: 'COLCHA',
  variantes: [
    { nome: 'Branco', tamanhos: [I('Queen'), D('King'), D('Super King')] },
    { nome: 'Bege',   tamanhos: [D('Queen'), D('King'), D('Super King')] },
    { nome: 'Azul',   tamanhos: [D('Queen'), D('King'), D('Super King')] },
    { nome: 'Cinza',  tamanhos: [D('Queen'), D('King'), D('Super King')] },
  ],
}

const COLCHA_BAMBU: ModeloCama = {
  nome: 'COLCHA BAMBU', categoria: 'COLCHA',
  variantes: [
    { nome: 'Des. 1 - Branco', desenho: '01', tamanhos: [D('Casal'),   D('Queen'), D('King'), D('Super King')] },
    { nome: 'Des. 1 - Cinza',  desenho: '01', tamanhos: [I('Casal'),   D('Queen'), D('King'), D('Super King')] },
    { nome: 'Des. 1 - Bege',   desenho: '01', tamanhos: [I('Casal'),   D('Queen'), D('King'), D('Super King')] },
    { nome: 'Des. 1 - Fendi',  desenho: '01', tamanhos: [I('Casal'),   D('Queen'), D('King'), D('Super King')] },
    { nome: 'Des. 1 - Verde',  desenho: '01', tamanhos: [D('Queen'), D('King'), D('Super King')] },
    { nome: 'Des. 2 - Branco', desenho: '02', tamanhos: [D('Casal'),   D('Queen'), D('King'), D('Super King')] },
    { nome: 'Des. 2 - Cinza',  desenho: '02', tamanhos: [D('Casal'),   D('Queen'), D('King'), D('Super King')] },
    { nome: 'Des. 2 - Bege',   desenho: '02', tamanhos: [I('Casal'),   D('Queen'), D('King'), D('Super King')] },
    { nome: 'Des. 2 - Fendi',  desenho: '02', tamanhos: [D('Casal'),   D('Queen'), D('King'), D('Super King')] },
  ],
}

const COLCHA_JATOBA: ModeloCama = {
  nome: 'COLCHA JATOBÁ', categoria: 'COLCHA',
  variantes: [
    { nome: 'Des. 1 - Sortido', desenho: '01', tamanhos: [D('Solteiro'), D('Casal'), D('Queen'), D('King')] },
    { nome: 'Des. 2 - Sortido', desenho: '02', tamanhos: [D('Solteiro'), D('Casal'), D('Queen'), I('King')] },
  ],
}

const COLCHA_PAU_BRASIL: ModeloCama = {
  nome: 'COLCHA PAU BRASIL', categoria: 'COLCHA',
  variantes: [
    { nome: 'Des. 1 - Sortido', desenho: '01', tamanhos: [D('Solteiro'), I('Casal'), I('Queen'), D('King')] },
    { nome: 'Des. 2 - Sortido', desenho: '02', tamanhos: [D('Solteiro'), D('Casal'), D('Queen'), D('King')] },
  ],
}

// ─── EDREDOM ─────────────────────────────────────────────────────────────────

const EDREDOM_BAMBU: ModeloCama = {
  nome: 'EDREDOM BAMBU', categoria: 'EDREDOM',
  variantes: [
    { nome: 'Branco', tamanhos: [D('Queen'), D('King'), D('Super King')] },
    { nome: 'Cinza',  tamanhos: [D('Queen'), D('King'), D('Super King')] },
    { nome: 'Bege',   tamanhos: [D('Queen'), I('King'), D('Super King')] },
    { nome: 'Fendi',  tamanhos: [I('Queen'), I('King'), D('Super King')] },
  ],
}

// ─── LENÇÓIS ─────────────────────────────────────────────────────────────────

const LENCOL_NOGUEIRA: ModeloCama = {
  nome: 'LENÇOL NOGUEIRA', categoria: 'LENCOL',
  variantes: [
    { nome: 'Sortido (Branco/Cinza/Marfim/Fendi)', tamanhos: [D('Solteiro'), D('Casal'), D('Queen'), D('King')] },
  ],
}

const LENCOL_IPE: ModeloCama = {
  nome: 'LENÇOL IPÊ', categoria: 'LENCOL',
  variantes: [
    { nome: 'Branco', tamanhos: [D('Solteiro'), D('Casal'), D('Queen'), D('King'), I('Fronha par')] },
    { nome: 'Cinza',  tamanhos: [D('Solteiro'), D('Casal'), D('Queen'), D('King'), I('Fronha par')] },
    { nome: 'Marfim', tamanhos: [D('Solteiro'), D('Casal'), D('Queen'), D('King'), I('Fronha par')] },
    { nome: 'Fendi',  tamanhos: [D('Solteiro'), D('Casal'), D('Queen'), D('King'), I('Fronha par')] },
  ],
}

const LENCOL_CEDRO: ModeloCama = {
  nome: 'LENÇOL CEDRO', categoria: 'LENCOL',
  variantes: [
    { nome: 'Sortido (Branco/Cinza/Fendi/Marfim)', tamanhos: [D('Solteiro'), D('Casal'), D('Queen'), D('King'), D('Fronha par')] },
  ],
}

const LENCOL_CARVALHO: ModeloCama = {
  nome: 'LENÇOL CARVALHO', categoria: 'LENCOL',
  variantes: [
    { nome: 'Branco/Branco', tamanhos: [D('Casal'), D('Queen'), D('King'), I('Fronha par', 'Junho')] },
    { nome: 'Branco/Azul',   tamanhos: [I('Casal'), I('Queen'), I('King'), I('Fronha par', 'Junho')] },
    { nome: 'Branco/Bege',   tamanhos: [D('Casal'), D('Queen'), D('King'), D('Fronha par')] },
    { nome: 'Branco/Cinza',  tamanhos: [D('Casal'), D('Queen'), D('King'), D('Fronha par')] },
    { nome: 'Branco/Preto',  tamanhos: [D('Casal'), D('Queen'), D('King'), D('Fronha par')] },
    { nome: 'Azul/Branco',   tamanhos: [I('Casal'), I('Queen'), D('King'), I('Fronha par', 'Junho')] },
    { nome: 'Bege/Branco',   tamanhos: [D('Casal'), D('Queen'), D('King'), D('Fronha par')] },
    { nome: 'Cinza/Branco',  tamanhos: [D('Casal'), D('Queen'), D('King'), D('Fronha par')] },
    { nome: 'Branco/Verde',  tamanhos: [D('Casal'), D('Queen'), D('King'), D('Fronha par')] },
  ],
}

const LENCOL_BAMBU_MOSSO: ModeloCama = {
  nome: 'LENÇOL BAMBU MOSSÔ', categoria: 'LENCOL',
  variantes: [
    { nome: 'Branco/Branco', tamanhos: [D('Casal'), D('Queen'), D('King'), D('Fronha par')] },
    { nome: 'Branco/Cinza',  tamanhos: [D('Casal'), D('Queen'), D('King'), D('Fronha par')] },
    { nome: 'Branco/Bege',   tamanhos: [D('Casal'), D('Queen'), D('King'), D('Fronha par')] },
    { nome: 'Branco/Fendi',  tamanhos: [D('Casal'), I('Queen'), I('King'), D('Fronha par')] },
    { nome: 'Branco/Verde',  tamanhos: [D('Casal'), D('Queen'), D('King'), D('Fronha par')] },
    { nome: 'Cinza/Branco',  tamanhos: [D('Casal'), D('Queen'), D('King'), D('Fronha par')] },
    { nome: 'Fendi/Branco',  tamanhos: [D('Casal'), I('Queen'), I('King'), D('Fronha par')] },
    { nome: 'Bege/Branco',   tamanhos: [I('Casal'), I('Queen'), I('King'), I('Fronha par', 'Junho')] },
    { nome: 'Verde/Branco',  tamanhos: [D('Casal'), D('Queen'), D('King'), D('Fronha par')] },
  ],
}

const LENCOL_BAMBU_GUADUA: ModeloCama = {
  nome: 'LENÇOL BAMBU GUADUA', categoria: 'LENCOL',
  variantes: [
    { nome: 'Branco/Branco', tamanhos: [D('Casal'), D('Queen'), D('King'), D('Fronha par')] },
    { nome: 'Branco/Cinza',  tamanhos: [D('Casal'), D('Queen'), D('King'), D('Fronha par')] },
    { nome: 'Branco/Fendi',  tamanhos: [D('Casal'), I('Queen'), I('King'), D('Fronha par')] },
    { nome: 'Branco/Bege',   tamanhos: [D('Casal'), D('Queen'), D('King'), D('Fronha par')] },
    { nome: 'Branco/Verde',  tamanhos: [I('Casal'), D('Queen'), D('King'), D('Fronha par')] },
    { nome: 'Cinza/Branco',  tamanhos: [D('Casal'), D('Queen'), D('King'), D('Fronha par')] },
    { nome: 'Fendi/Branco',  tamanhos: [I('Casal'), D('Queen'), I('King'), D('Fronha par')] },
    { nome: 'Bege/Branco',   tamanhos: [D('Casal'), I('Queen'), D('King'), D('Fronha par')] },
    { nome: 'Verde/Branco',  tamanhos: [D('Casal'), D('Queen'), D('King'), D('Fronha par')] },
  ],
}

const LENCOL_BAMBU: ModeloCama = {
  nome: 'LENÇOL BAMBU', categoria: 'LENCOL',
  variantes: [
    { nome: 'Branco', tamanhos: [D('Casal'), D('Queen'), D('King'), D('Fronha par')] },
    { nome: 'Cinza',  tamanhos: [D('Casal'), D('Queen'), D('King'), D('Fronha par')] },
    { nome: 'Marfim', tamanhos: [D('Casal'), D('Queen'), D('King'), D('Fronha par')] },
    { nome: 'Fendi',  tamanhos: [D('Casal'), D('Queen'), D('King'), D('Fronha par')] },
    { nome: 'Verde',  tamanhos: [I('Casal'), D('Queen'), D('King'), D('Fronha par')] },
  ],
}

const LENCOL_FLAMBOYANT: ModeloCama = {
  nome: 'LENÇOL FLAMBOYANT', categoria: 'LENCOL',
  variantes: [
    { nome: 'Branco', tamanhos: [D('Solteiro'), D('Casal'), D('Queen'), D('King'), I('Fronha par')] },
    { nome: 'Cinza',  tamanhos: [D('Solteiro'), D('Casal'), D('Queen'), I('King'), I('Fronha par')] },
    { nome: 'Marfim', tamanhos: [D('Solteiro'), D('Casal'), D('Queen'), I('King'), I('Fronha par')] },
    { nome: 'Fendi',  tamanhos: [D('Solteiro'), D('Casal'), D('Queen'), D('King'), I('Fronha par')] },
  ],
}

// ─── Export ──────────────────────────────────────────────────────────────────

export const MODELOS_CAMA: ModeloCama[] = [
  PROTETOR_COLCHAO_CACTO,
  PROTETOR_TRAVESSEIRO_CACTO,
  TRAVESSEIROS,
  COLCHA_CARVALHO,
  COLCHA_BAMBU,
  COLCHA_JATOBA,
  COLCHA_PAU_BRASIL,
  EDREDOM_BAMBU,
  LENCOL_NOGUEIRA,
  LENCOL_IPE,
  LENCOL_CEDRO,
  LENCOL_CARVALHO,
  LENCOL_BAMBU_MOSSO,
  LENCOL_BAMBU_GUADUA,
  LENCOL_BAMBU,
  LENCOL_FLAMBOYANT,
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function norm(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toUpperCase()
}

export function findModelo(nome: string): ModeloCama | undefined {
  const k = norm(nome)
  return MODELOS_CAMA.find(m => norm(m.nome) === k)
}

export function findVariante(modelo: string, variante: string): VarianteCama | undefined {
  const m = findModelo(modelo)
  if (!m) return undefined
  const k = norm(variante)
  return m.variantes.find(v => norm(v.nome) === k)
}

export function findTamanho(
  modelo: string, variante: string, tamanho: string,
): DisponibilidadeTamanho | undefined {
  const v = findVariante(modelo, variante)
  if (!v) return undefined
  const k = norm(tamanho)
  return v.tamanhos.find(t => norm(t.tamanho) === k)
}

/** Lista modelos (opcionalmente filtrados por categoria). */
export function modelosPorCategoria(categoria?: CategoriaCama): ModeloCama[] {
  return categoria ? MODELOS_CAMA.filter(m => m.categoria === categoria) : MODELOS_CAMA
}

export function variantesDoModelo(modelo: string): VarianteCama[] {
  return findModelo(modelo)?.variantes ?? []
}

export function tamanhosDaVariante(modelo: string, variante: string): DisponibilidadeTamanho[] {
  return findVariante(modelo, variante)?.tamanhos ?? []
}

export function isDisponivel(modelo: string, variante: string, tamanho: string): boolean {
  return findTamanho(modelo, variante, tamanho)?.disponivel ?? false
}
