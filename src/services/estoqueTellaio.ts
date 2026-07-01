import { CODIGOS_TAPETES } from '../data/codigosTellaio'
import { fetchProductStockLV } from '../magazordLV'

export interface SincronizacaoResultado {
  sucesso: number
  falhas: number
  itens: {
    ref: string
    nome: string
    categoria: string
    unidade: string
    atual: number
    minimo: number
    status: 'NORMAL' | 'CRÍTICO' | 'ATENÇÃO'
    isMagazord: true
  }[]
}

/**
 * Busca o estoque de todos os tapetes de luxo Tellaio mapeados
 * e retorna formatado para o InventoryLV.tsx.
 */
export async function syncEstoqueTellaioFromMagazord(): Promise<SincronizacaoResultado> {
  const itens: SincronizacaoResultado['itens'] = []
  let sucesso = 0
  let falhas = 0

  // Bate na API da Magazord para cada código
  // Para evitar sobrecarga, vamos fazer em lotes de 5 requisições paralelas
  const BATCH_SIZE = 5
  
  for (let i = 0; i < CODIGOS_TAPETES.length; i += BATCH_SIZE) {
    const lote = CODIGOS_TAPETES.slice(i, i + BATCH_SIZE)
    const promessas = lote.map(async (tapete) => {
      // Usar EAN se houver, senao usar o codigo Tellaio
      const referencia = tapete.ean || tapete.codigo
      const estoque = await fetchProductStockLV(referencia)
      
      if (estoque !== null) {
        sucesso++
        const atual = estoque
        const minimo = 2 // Mínimo arbitrário para alerta
        const status = atual < minimo ? 'CRÍTICO' : atual < minimo * 1.5 ? 'ATENÇÃO' : 'NORMAL'
        
        itens.push({
          ref: tapete.codigo,
          nome: `${tapete.colecao} ${tapete.tamanho} (Des. ${tapete.desenho})`,
          categoria: 'Tapete',
          unidade: 'un',
          atual,
          minimo,
          status,
          isMagazord: true as const
        })
      } else {
        falhas++
      }
    })
    
    await Promise.all(promessas)
  }

  return { sucesso, falhas, itens }
}
