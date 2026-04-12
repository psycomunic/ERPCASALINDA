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
        }
        Insert: Omit<Database['public']['Tables']['pedidos']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['pedidos']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['financeiro_lancamentos']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['financeiro_lancamentos']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['estoque_itens']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['estoque_itens']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['estoque_movimentacoes']['Row'], 'id' | 'created_at'>
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
        Insert: Omit<Database['public']['Tables']['patrimonio']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['patrimonio']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['parceiros']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['parceiros']['Insert']>
      }
      configuracoes: {
        Row: {
          id: string
          chave: string
          valor: Json
          descricao: string | null
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['configuracoes']['Row'], 'id' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['configuracoes']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
