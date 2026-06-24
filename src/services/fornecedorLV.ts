export type StatusFornecedor = 'disponível' | 'indisponível' | 'previsão agosto'

export interface TapeteFornecedor {
  colecao: string
  desenho: string
  tamanho: string
  status: StatusFornecedor
}

export interface FornecedorDiff {
  novosIndisponiveis: TapeteFornecedor[]
  novosDisponiveis: TapeteFornecedor[]
  novosPrevisao: TapeteFornecedor[]
}

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1KoWaNEvfjguLVgJ_42MTW6uFIElPcCHR/export?format=csv&gid=1209679338'

export async function fetchFornecedorEstoque(): Promise<TapeteFornecedor[]> {
  try {
    const res = await fetch(SHEET_URL)
    const text = await res.text()
    return parseEstoqueCSV(text)
  } catch (err) {
    console.error('Erro ao buscar estoque do fornecedor:', err)
    return []
  }
}

function parseEstoqueCSV(csvData: string): TapeteFornecedor[] {
  const lines = csvData.split('\n').map(l => l.trim())
  const results: TapeteFornecedor[] = []
  
  let currentColecao = ''

  for (let i = 0; i < lines.length; i++) {
    // Basic CSV split ignoring complex quotes since it's a simple layout
    const row = lines[i].split(',').map(s => s.replace(/^"|"$/g, '').trim())
    if (!row.some(x => x)) continue // empty row

    // Detect Colecao headers (col 1 is a string, col 2 is empty)
    const val1 = row[1] || ''
    const val2 = row[2] || ''
    if (val1 && !val2 && !['1','2','3','4','5','6','7','Previsão Agosto','ESTOQUE TELLAIO'].includes(val1)) {
      currentColecao = val1
      continue
    }

    // Iterate through sizes (Size, Status, Empty) -> groups of 3 starting at col 1
    for (let j = 1; j < row.length - 1; j += 3) {
      const size = row[j]
      const rawStatus = (row[j+1] || '').toLowerCase()
      
      if (size && (size.includes('x') || size.includes('X')) && (rawStatus.includes('dispon') || rawStatus.includes('prev'))) {
        const designCol = Math.floor((j-1)/3) + 1
        
        let status: StatusFornecedor = 'indisponível'
        if (rawStatus === 'disponível' || rawStatus === 'disponivel') {
          status = 'disponível'
        } else if (rawStatus.includes('prev')) {
          status = 'previsão agosto'
        }

        results.push({
          colecao: currentColecao.toUpperCase(),
          desenho: designCol.toString().padStart(2, '0'), // '01', '02'
          tamanho: size.replace(/X/g, 'x').replace(/\s+/g, ' ').trim(),
          status
        })
      }
    }
  }

  return results
}

export function compareEstoque(oldData: TapeteFornecedor[], newData: TapeteFornecedor[]): FornecedorDiff {
  const diff: FornecedorDiff = {
    novosIndisponiveis: [],
    novosDisponiveis: [],
    novosPrevisao: []
  }

  if (oldData.length === 0) return diff // Se é o primeiro carregamento, não avisa nada

  const oldMap = new Map<string, StatusFornecedor>()
  oldData.forEach(o => oldMap.set(`${o.colecao}-${o.desenho}-${o.tamanho}`, o.status))

  newData.forEach(n => {
    const key = `${n.colecao}-${n.desenho}-${n.tamanho}`
    const oldStatus = oldMap.get(key)
    
    if (oldStatus && oldStatus !== n.status) {
      if (n.status === 'indisponível') diff.novosIndisponiveis.push(n)
      if (n.status === 'disponível') diff.novosDisponiveis.push(n)
      if (n.status === 'previsão agosto') diff.novosPrevisao.push(n)
    }
  })

  return diff
}
