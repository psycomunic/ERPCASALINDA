// ─── Auto-generated from Supabase schema ──────────────────────────────────────
// Run `npm run supabase:types` to regenerate after schema changes.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      pedidos: {
        Row: {
          id: string
          numero: string
          magazord_id: number | null
          cliente: string
          produto: string
          material: string | null
          moldura: string | null
          acabamento: string | null
          canal: string | null
          etapa: string
          status: 'Pendente' | 'Atrasado' | 'OK'
          prazo_entrega: string | null
          valor: number | null
          frete: number | null
          obs: string | null
          endereco: string | null
          transportadora: string | null
          rastreio: string | null
          data_despacho: string | null
          data_prevista: string | null
          hora_prevista: string | null
          from_magazord: boolean
          created_at: string
          updated_at: string
          // ─── Lar e Vida extras ─────────────────────────
          store_id: string | null
          sku: string | null
          foto_url: string | null
          nome_fornecedor: string | null
          codigo_fornecedor: string | null
          tamanho: string | null
          cor: string | null
          categoria: string | null
          quantidade: number | null
          cliente_email: string | null
          cliente_telefone: string | null
        }
        Relationships: any[]

        Insert: {
          numero: string
          magazord_id?: number | null
          cliente: string
          produto: string
          material?: string | null
          moldura?: string | null
          acabamento?: string | null
          canal?: string | null
          etapa: string
          status: 'Pendente' | 'Atrasado' | 'OK'
          prazo_entrega?: string | null
          valor?: number | null
          frete?: number | null
          obs?: string | null
          endereco?: string | null
          transportadora?: string | null
          rastreio?: string | null
          data_despacho?: string | null
          data_prevista?: string | null
          hora_prevista?: string | null
          from_magazord?: boolean
          // ─── Lar e Vida extras ─────────────────────────
          store_id?: string | null
          sku?: string | null
          foto_url?: string | null
          nome_fornecedor?: string | null
          codigo_fornecedor?: string | null
          tamanho?: string | null
          cor?: string | null
          categoria?: string | null
          quantidade?: number | null
          cliente_email?: string | null
          cliente_telefone?: string | null
        }
        Update: {
          numero?: string
          magazord_id?: number | null
          cliente?: string
          produto?: string
          material?: string | null
          moldura?: string | null
          acabamento?: string | null
          canal?: string | null
          etapa?: string
          status?: 'Pendente' | 'Atrasado' | 'OK'
          prazo_entrega?: string | null
          valor?: number | null
          frete?: number | null
          obs?: string | null
          endereco?: string | null
          transportadora?: string | null
          rastreio?: string | null
          data_despacho?: string | null
          data_prevista?: string | null
          hora_prevista?: string | null
          from_magazord?: boolean
          // ─── Lar e Vida extras ─────────────────────────
          store_id?: string | null
          sku?: string | null
          foto_url?: string | null
          nome_fornecedor?: string | null
          codigo_fornecedor?: string | null
          tamanho?: string | null
          cor?: string | null
          categoria?: string | null
          quantidade?: number | null
          cliente_email?: string | null
          cliente_telefone?: string | null
        }
      }
      financeiro_lancamentos: {
        Row: {
          id: string
          tipo: 'receita' | 'despesa'
          categoria: string | null
          descricao: string
          valor: number
          data: string
          forma_pagamento: string | null
          status: 'pendente' | 'pago' | 'cancelado'
          pedido_id: string | null
          created_at: string
          updated_at: string
        }
        Relationships: any[]

        Insert: {
          tipo: 'receita' | 'despesa'
          categoria?: string | null
          descricao: string
          valor: number
          data: string
          forma_pagamento?: string | null
          status?: 'pendente' | 'pago' | 'cancelado'
          pedido_id?: string | null
        }
        Update: {
          tipo?: 'receita' | 'despesa'
          categoria?: string | null
          descricao?: string
          valor?: number
          data?: string
          forma_pagamento?: string | null
          status?: 'pendente' | 'pago' | 'cancelado'
          pedido_id?: string | null
        }
      }
      fin_transacoes: {
        Row: {
          id: string
          loja: string | null
          tipo: 'despesa' | 'receita'
          situacao: 'pendente' | 'pago' | 'atrasado' | 'cancelado'
          plano_contas: string | null
          descricao: string
          entidade_tipo: string | null
          fornecedor: string | null
          data_competencia: string | null
          data_vencimento: string
          data_pagamento: string | null
          forma_pagamento: string | null
          conta_bancaria: string | null
          centro_custo: string | null
          nfe: string | null
          valor_bruto: number
          juros_multas: number | null
          desconto: number | null
          valor_final: number
          observacoes: string | null
          anexo_url: string | null
          created_at: string
          updated_at: string
        }
        Relationships: any[]

        Insert: {
          id?: string
          loja?: string | null
          tipo: 'despesa' | 'receita'
          situacao: 'pendente' | 'pago' | 'atrasado' | 'cancelado'
          plano_contas?: string | null
          descricao: string
          entidade_tipo?: string | null
          fornecedor?: string | null
          data_competencia?: string | null
          data_vencimento: string
          data_pagamento?: string | null
          forma_pagamento?: string | null
          conta_bancaria?: string | null
          centro_custo?: string | null
          nfe?: string | null
          valor_bruto: number
          juros_multas?: number | null
          desconto?: number | null
          valor_final: number
          observacoes?: string | null
          anexo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          loja?: string | null
          tipo?: 'despesa' | 'receita'
          situacao?: 'pendente' | 'pago' | 'atrasado' | 'cancelado'
          plano_contas?: string | null
          descricao?: string
          entidade_tipo?: string | null
          fornecedor?: string | null
          data_competencia?: string | null
          data_vencimento?: string
          data_pagamento?: string | null
          forma_pagamento?: string | null
          conta_bancaria?: string | null
          centro_custo?: string | null
          nfe?: string | null
          valor_bruto?: number
          juros_multas?: number | null
          desconto?: number | null
          valor_final?: number
          observacoes?: string | null
          anexo_url?: string | null
          updated_at?: string
        }
      }
      estoque_itens: {
        Row: {
          id: string
          codigo: string | null
          nome: string
          categoria: string | null
          unidade: string
          quantidade: number
          quantidade_minima: number
          localizacao: string | null
          preco_unitario: number | null
          fornecedor: string | null
          created_at: string
          updated_at: string
        }
        Relationships: any[]

        Insert: {
          codigo?: string | null
          nome: string
          categoria?: string | null
          unidade: string
          quantidade: number
          quantidade_minima: number
          localizacao?: string | null
          preco_unitario?: number | null
          fornecedor?: string | null
        }
        Update: {
          codigo?: string | null
          nome?: string
          categoria?: string | null
          unidade?: string
          quantidade?: number
          quantidade_minima?: number
          localizacao?: string | null
          preco_unitario?: number | null
          fornecedor?: string | null
        }
      }
      estoque_movimentacoes: {
        Row: {
          id: string
          item_id: string
          tipo: 'entrada' | 'saida' | 'ajuste'
          quantidade: number
          motivo: string | null
          pedido_id: string | null
          usuario: string | null
          created_at: string
        }
        Relationships: any[]

        Insert: {
          item_id: string
          tipo: 'entrada' | 'saida' | 'ajuste'
          quantidade: number
          motivo?: string | null
          pedido_id?: string | null
          usuario?: string | null
        }
        Update: never
      }
      patrimonio: {
        Row: {
          id: string
          nome: string
          categoria: string | null
          marca: string | null
          modelo: string | null
          numero_serie: string | null
          data_aquisicao: string | null
          valor_aquisicao: number | null
          valor_atual: number | null
          localizacao: string | null
          status: 'ativo' | 'manutenção' | 'inativo' | 'alienado'
          obs: string | null
          created_at: string
          updated_at: string
        }
        Relationships: any[]

        Insert: {
          nome: string
          categoria?: string | null
          marca?: string | null
          modelo?: string | null
          numero_serie?: string | null
          data_aquisicao?: string | null
          valor_aquisicao?: number | null
          valor_atual?: number | null
          localizacao?: string | null
          status?: 'ativo' | 'manutenção' | 'inativo' | 'alienado'
          obs?: string | null
        }
        Update: {
          nome?: string
          categoria?: string | null
          marca?: string | null
          modelo?: string | null
          numero_serie?: string | null
          data_aquisicao?: string | null
          valor_aquisicao?: number | null
          valor_atual?: number | null
          localizacao?: string | null
          status?: 'ativo' | 'manutenção' | 'inativo' | 'alienado'
          obs?: string | null
        }
      }
      parceiros: {
        Row: {
          id: string
          tipo: 'cliente' | 'fornecedor' | 'ambos'
          nome: string
          cnpj_cpf: string | null
          email: string | null
          telefone: string | null
          endereco: string | null
          cidade: string | null
          uf: string | null
          cep: string | null
          status: 'ativo' | 'inativo'
          obs: string | null
          created_at: string
          updated_at: string
        }
        Relationships: any[]

        Insert: {
          tipo: 'cliente' | 'fornecedor' | 'ambos'
          nome: string
          cnpj_cpf?: string | null
          email?: string | null
          telefone?: string | null
          endereco?: string | null
          cidade?: string | null
          uf?: string | null
          cep?: string | null
          status?: 'ativo' | 'inativo'
          obs?: string | null
        }
        Update: {
          tipo?: 'cliente' | 'fornecedor' | 'ambos'
          nome?: string
          cnpj_cpf?: string | null
          email?: string | null
          telefone?: string | null
          endereco?: string | null
          cidade?: string | null
          uf?: string | null
          cep?: string | null
          status?: 'ativo' | 'inativo'
          obs?: string | null
        }
      }
      configuracoes: {
        Row: {
          id: string
          chave: string
          valor: Json
          descricao: string | null
          updated_at: string
        }
        Relationships: any[]

        Insert: {
          chave: string
          valor: Json
          descricao?: string | null
        }
        Update: {
          chave?: string
          valor?: Json
          descricao?: string | null
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
