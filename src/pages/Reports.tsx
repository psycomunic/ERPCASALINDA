import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Download, Printer, Factory, DollarSign,
  Package, Building2, Truck, BarChart2, Calendar,
  ChevronDown, Check, X, AlertTriangle, TrendingUp, TrendingDown
} from 'lucide-react'
import {
  ORDERS, TRANSACTIONS, STOCK_ITEMS, ASSETS, DESPACHOS,
  fmtBRL, filterByDate,
  type ReportOrder, type ReportTx, type ReportItem,
  type ReportAsset, type ReportDespacho,
} from '../reportEngine'

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportId =
  | 'producao-diaria'
  | 'expedicao'
  | 'financeiro'
  | 'estoque'
  | 'patrimonio'
  | 'executivo'

interface ReportMeta {
  id: ReportId
  title: string
  subtitle: string
  icon: React.ElementType
  color: string
  bg: string
  description: string
}

// ─── Report definitions ────────────────────────────────────────────────────────

const REPORTS: ReportMeta[] = [
  {
    id: 'producao-diaria',
    title: 'Produção Diária',
    subtitle: 'Quadros produzidos, etapas e status',
    icon: Factory,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    description: 'Relatório completo da produção: quadros concluídos, em progresso, atrasados e previsões de entrega.',
  },
  {
    id: 'expedicao',
    title: 'Expedição & Entregas',
    subtitle: 'Despachos, rastreamento e prazos',
    icon: Truck,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
    description: 'Pedidos prontos para envio, despachados, rastreamento e prazos de entrega ao cliente.',
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    subtitle: 'Entradas, saídas e saldo do período',
    icon: DollarSign,
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
    description: 'DRE simplificado: faturamento, despesas por categoria, saldo líquido e status de pagamentos.',
  },
  {
    id: 'estoque',
    title: 'Estoque / Almoxarifado',
    subtitle: 'Inventário, críticos e movimentações',
    icon: Package,
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200',
    description: 'Inventário completo de insumos, itens abaixo do mínimo, alertas de reposição.',
  },
  {
    id: 'patrimonio',
    title: 'Patrimônio',
    subtitle: 'Ativos fixos e manutenções',
    icon: Building2,
    color: 'text-rose-600',
    bg: 'bg-rose-50 border-rose-200',
    description: 'Listagem de todos os ativos patrimoniais, valor total, status e histórico de manutenções.',
  },
  {
    id: 'executivo',
    title: 'Resumo Executivo',
    subtitle: 'Visão geral do negócio',
    icon: BarChart2,
    color: 'text-navy-900',
    bg: 'bg-blue-50 border-navy-900/20',
    description: 'Dashboard completo: KPIs de produção, financeiro, estoque e expedição em um único relatório.',
  },
]

// ─── HTML Report builders ─────────────────────────────────────────────────────

function headerHTML(title: string, subtitle: string, period: string) {
  return `
    <div class="rpt-logo-row">
      <div>
        <h1>Casa Linda Decorações</h1>
        <p>${title} — ${subtitle}</p>
      </div>
      <div class="rpt-logo-sub">
        <p><strong>Período:</strong> ${period}</p>
        <p>Emitido em: ${new Date().toLocaleString('pt-BR')}</p>
        <p>Gerado pelo ERP Casa Linda</p>
      </div>
    </div>`
}

function footerHTML() {
  return `
    <div class="rpt-footer">
      <span>Casa Linda Decorações Ltda. · CNPJ 00.000.000/0001-00</span>
      <span>ERP Casa Linda — Relatório Confidencial</span>
    </div>`
}

function badgeHTML(status: string) {
  const map: Record<string, string> = {
    'Concluído': 'ok', 'OK': 'ok', 'Pronto': 'ok', 'Despachado': 'ok', 'ATIVO': 'ok', 'NORMAL': 'normal', 'pago': 'ok',
    'Atrasado': 'atrasado', 'CRÍTICO': 'critico', 'atrasado': 'atrasado',
    'Pendente': 'pendente', 'pendente': 'pendente', 'ATENÇÃO': 'atencao',
    'MANUTENÇÃO': 'atrasado', 'INATIVO': 'atrasado',
  }
  return `<span class="badge-print badge-${map[status] ?? 'pendente'}">${status}</span>`
}

// ─── Report generators (return full HTML) ─────────────────────────────────────

function buildProducaoDiaria(orders: ReportOrder[], period: string): string {
  const total      = orders.length
  const concluidos = orders.filter(o => ['Concluído', 'Pronto', 'Despachado'].includes(o.status)).length
  const atrasados  = orders.filter(o => o.status === 'Atrasado').length
  const andamento  = orders.filter(o => ['OK', 'Pendente'].includes(o.status)).length
  const faturado   = orders.filter(o => ['Concluído', 'Pronto', 'Despachado'].includes(o.status))
                           .reduce((s, o) => s + o.valor, 0)

  const rows = orders.map(o => `
    <tr>
      <td><strong>#${o.id}</strong></td>
      <td>${o.cliente}</td>
      <td>${o.produto}</td>
      <td>${o.material}</td>
      <td>${o.etapa}</td>
      <td>${o.prazo}</td>
      <td>${badgeHTML(o.status)}</td>
      <td style="text-align:right">${fmtBRL(o.valor)}</td>
    </tr>`).join('')

  const byEtapa: Record<string, number> = {}
  orders.forEach(o => { byEtapa[o.etapa] = (byEtapa[o.etapa] ?? 0) + 1 })
  const etapaRows = Object.entries(byEtapa).map(([e, c]) =>
    `<tr><td>${e}</td><td style="text-align:center"><strong>${c}</strong></td></tr>`).join('')

  return `
    <div id="report-print-area">
      ${headerHTML('Produção Diária', 'Quadros e pedidos', period)}
      <p class="rpt-title">Relatório de Produção</p>
      <p class="rpt-period">Período: ${period}</p>

      <div class="rpt-kpi-grid">
        <div class="rpt-kpi">
          <p class="rpt-kpi-label">Total de Pedidos</p>
          <p class="rpt-kpi-value">${total}</p>
        </div>
        <div class="rpt-kpi">
          <p class="rpt-kpi-label">Concluídos / Prontos</p>
          <p class="rpt-kpi-value" style="color:#16a34a">${concluidos}</p>
        </div>
        <div class="rpt-kpi">
          <p class="rpt-kpi-label">Em Andamento</p>
          <p class="rpt-kpi-value" style="color:#2563eb">${andamento}</p>
        </div>
        <div class="rpt-kpi">
          <p class="rpt-kpi-label">Atrasados</p>
          <p class="rpt-kpi-value" style="color:#dc2626">${atrasados}</p>
          ${atrasados > 0 ? '<p class="rpt-kpi-sub">⚠ Atenção requerida</p>' : ''}
        </div>
      </div>

      <div class="rpt-two-col">
        <div class="rpt-box">
          <p class="rpt-box-title">Por Etapa de Produção</p>
          <table class="rpt-table">
            <thead><tr><th>Etapa</th><th style="text-align:center">Qtd.</th></tr></thead>
            <tbody>${etapaRows}</tbody>
          </table>
        </div>
        <div class="rpt-box">
          <p class="rpt-box-title">Resumo Financeiro da Produção</p>
          <table class="rpt-table">
            <tbody>
              <tr><td>Valor total em produção</td><td style="text-align:right"><strong>${fmtBRL(orders.reduce((s,o)=>s+o.valor,0))}</strong></td></tr>
              <tr><td>Já faturado (concluídos)</td><td style="text-align:right;color:#16a34a"><strong>${fmtBRL(faturado)}</strong></td></tr>
              <tr><td>Ticket médio</td><td style="text-align:right"><strong>${fmtBRL(faturado / Math.max(concluidos, 1))}</strong></td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <p class="rpt-section-title">Detalhamento de Pedidos</p>
      <table class="rpt-table">
        <thead>
          <tr>
            <th>Pedido</th><th>Cliente</th><th>Produto</th><th>Material</th>
            <th>Etapa</th><th>Prazo</th><th>Status</th><th style="text-align:right">Valor</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${footerHTML()}
    </div>`
}

function buildExpedicao(despachos: ReportDespacho[], period: string): string {
  const despachados = despachos.filter(d => d.dataDespacho !== '—')
  const prontos     = despachos.filter(d => d.dataDespacho === '—')

  const despRows = despachados.map(d => `
    <tr>
      <td><strong>#${d.id}</strong></td>
      <td>${d.cliente}</td>
      <td>${d.produto}</td>
      <td>${d.transportadora}</td>
      <td style="font-family:monospace">${d.rastreio}</td>
      <td>${d.prazoEntrega}</td>
      <td>${d.dataDespacho}</td>
    </tr>`).join('')

  const prontoRows = prontos.map(d => `
    <tr>
      <td><strong>#${d.id}</strong></td>
      <td>${d.cliente}</td>
      <td>${d.produto}</td>
      <td>${d.transportadora}</td>
      <td>${d.prazoEntrega}</td>
      <td style="word-break:break-all">${d.endereco}</td>
    </tr>`).join('')

  return `
    <div id="report-print-area">
      ${headerHTML('Expedição & Entregas', 'Despachos e rastreamento', period)}
      <p class="rpt-title">Relatório de Expedição</p>
      <p class="rpt-period">Período: ${period}</p>

      <div class="rpt-kpi-grid">
        <div class="rpt-kpi">
          <p class="rpt-kpi-label">Despachados</p>
          <p class="rpt-kpi-value" style="color:#059669">${despachados.length}</p>
        </div>
        <div class="rpt-kpi">
          <p class="rpt-kpi-label">Prontos para Envio</p>
          <p class="rpt-kpi-value" style="color:#d97706">${prontos.length}</p>
        </div>
        <div class="rpt-kpi">
          <p class="rpt-kpi-label">Total em Expedição</p>
          <p class="rpt-kpi-value">${despachos.length}</p>
        </div>
        <div class="rpt-kpi">
          <p class="rpt-kpi-label">Com Rastreio</p>
          <p class="rpt-kpi-value">${despachados.filter(d=>d.rastreio!=='—').length}</p>
        </div>
      </div>

      <p class="rpt-section-title">Pedidos Despachados</p>
      ${despachados.length > 0 ? `
        <table class="rpt-table">
          <thead>
            <tr><th>Pedido</th><th>Cliente</th><th>Produto</th><th>Transportadora</th><th>Rastreio</th><th>Prazo Entrega</th><th>Data Despacho</th></tr>
          </thead>
          <tbody>${despRows}</tbody>
        </table>
      ` : '<p style="color:#888;font-size:8.5pt">Nenhum pedido despachado neste período.</p>'}

      <p class="rpt-section-title">Prontos para Envio — Aguardando Coleta</p>
      ${prontos.length > 0 ? `
        <table class="rpt-table">
          <thead>
            <tr><th>Pedido</th><th>Cliente</th><th>Produto</th><th>Transportadora</th><th>Prazo</th><th>Endereço</th></tr>
          </thead>
          <tbody>${prontoRows}</tbody>
        </table>
      ` : '<p style="color:#888;font-size:8.5pt">Nenhum pedido aguardando envio.</p>'}
      ${footerHTML()}
    </div>`
}

function buildFinanceiro(txs: ReportTx[], period: string): string {
  const entradas    = txs.filter(t => t.tipo === 'entrada').reduce((s, t) => s + t.valor, 0)
  const saidas      = txs.filter(t => t.tipo === 'saida').reduce((s, t) => s + t.valor, 0)
  const saldo       = entradas - saidas
  const nPago       = txs.filter(t => t.status === 'pago').length
  const nPendente   = txs.filter(t => t.status === 'pendente').length

  const catMap: Record<string, number> = {}
  txs.filter(t => t.tipo === 'saida').forEach(t => {
    catMap[t.categoria] = (catMap[t.categoria] ?? 0) + t.valor
  })
  const catRows = Object.entries(catMap)
    .sort(([,a],[,b]) => b - a)
    .map(([c, v]) => `<tr><td>${c}</td><td style="text-align:right">${fmtBRL(v)}</td><td style="text-align:right">${((v/saidas)*100).toFixed(1)}%</td></tr>`).join('')

  const txRows = txs.map(t => `
    <tr>
      <td>${t.data}</td>
      <td>${t.descricao}</td>
      <td>${t.categoria}</td>
      <td style="text-align:right;font-weight:700;color:${t.tipo==='entrada'?'#16a34a':'#dc2626'}">
        ${t.tipo === 'entrada' ? '+' : '–'} ${fmtBRL(t.valor)}
      </td>
      <td>${badgeHTML(t.status)}</td>
    </tr>`).join('')

  return `
    <div id="report-print-area">
      ${headerHTML('Relatório Financeiro', 'Entradas, saídas e saldo', period)}
      <p class="rpt-title">DRE Simplificado</p>
      <p class="rpt-period">Período: ${period}</p>

      <div class="rpt-kpi-grid">
        <div class="rpt-kpi">
          <p class="rpt-kpi-label">Saldo Líquido</p>
          <p class="rpt-kpi-value" style="color:${saldo>=0?'#16a34a':'#dc2626'}">${fmtBRL(saldo)}</p>
        </div>
        <div class="rpt-kpi">
          <p class="rpt-kpi-label">Total Entradas</p>
          <p class="rpt-kpi-value" style="color:#2563eb">${fmtBRL(entradas)}</p>
        </div>
        <div class="rpt-kpi">
          <p class="rpt-kpi-label">Total Saídas</p>
          <p class="rpt-kpi-value" style="color:#dc2626">${fmtBRL(saidas)}</p>
        </div>
        <div class="rpt-kpi">
          <p class="rpt-kpi-label">Lançamentos</p>
          <p class="rpt-kpi-value">${txs.length}</p>
          <p class="rpt-kpi-sub">${nPago} pagos · ${nPendente} pendentes</p>
        </div>
      </div>

      <div class="rpt-two-col">
        <div class="rpt-box">
          <p class="rpt-box-title">Despesas por Categoria</p>
          <table class="rpt-table">
            <thead><tr><th>Categoria</th><th style="text-align:right">Valor</th><th style="text-align:right">%</th></tr></thead>
            <tbody>${catRows}</tbody>
          </table>
        </div>
        <div class="rpt-box">
          <p class="rpt-box-title">Análise</p>
          <table class="rpt-table">
            <tbody>
              <tr><td>Margem bruta</td><td style="text-align:right"><strong>${((saldo/Math.max(entradas,1))*100).toFixed(1)}%</strong></td></tr>
              <tr><td>Ticket médio entrada</td><td style="text-align:right">${fmtBRL(entradas / Math.max(txs.filter(t=>t.tipo==='entrada').length, 1))}</td></tr>
              <tr><td>Maior despesa</td><td style="text-align:right">${fmtBRL(Math.max(...txs.filter(t=>t.tipo==='saida').map(t=>t.valor), 0))}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <p class="rpt-section-title">Extrato Detalhado</p>
      <table class="rpt-table">
        <thead>
          <tr><th>Data</th><th>Descrição</th><th>Categoria</th><th style="text-align:right">Valor</th><th>Status</th></tr>
        </thead>
        <tbody>${txRows}</tbody>
        <tfoot>
          <tr style="background:#1e3a8a;color:#fff">
            <td colspan="3"><strong>SALDO DO PERÍODO</strong></td>
            <td style="text-align:right"><strong>${fmtBRL(saldo)}</strong></td>
            <td></td>
          </tr>
        </tfoot>
      </table>
      ${footerHTML()}
    </div>`
}

function buildEstoque(items: ReportItem[], period: string): string {
  const criticos = items.filter(i => i.status === 'CRÍTICO')
  const atencao  = items.filter(i => i.status === 'ATENÇÃO')
  const normais  = items.filter(i => i.status === 'NORMAL')

  const rows = items.map(i => `
    <tr>
      <td>${i.ref}</td>
      <td><strong>${i.nome}</strong></td>
      <td>${i.unidade}</td>
      <td style="text-align:right;font-weight:700;color:${i.status==='CRÍTICO'?'#dc2626':i.status==='ATENÇÃO'?'#d97706':'#111'}">${i.atual}</td>
      <td style="text-align:right">${i.minimo}</td>
      <td style="text-align:right">${i.atual >= i.minimo ? '—' : `<span style="color:#dc2626">COMPRAR ${(i.minimo - i.atual).toFixed(1)} ${i.unidade}</span>`}</td>
      <td>${badgeHTML(i.status)}</td>
    </tr>`).join('')

  const alertRows = criticos.concat(atencao).map(i =>
    `<tr><td><strong>${i.nome}</strong> (${i.ref})</td><td style="text-align:center">${i.atual}</td><td style="text-align:center">${i.minimo}</td><td style="text-align:center;color:#dc2626">${(i.minimo-i.atual).toFixed(1)} ${i.unidade}</td></tr>`
  ).join('')

  return `
    <div id="report-print-area">
      ${headerHTML('Almoxarifado', 'Inventário e alertas de estoque', period)}
      <p class="rpt-title">Relatório de Estoque</p>
      <p class="rpt-period">Emissão: ${period}</p>

      <div class="rpt-kpi-grid">
        <div class="rpt-kpi">
          <p class="rpt-kpi-label">Total de Itens</p>
          <p class="rpt-kpi-value">${items.length}</p>
        </div>
        <div class="rpt-kpi">
          <p class="rpt-kpi-label">Estoque Normal</p>
          <p class="rpt-kpi-value" style="color:#16a34a">${normais.length}</p>
        </div>
        <div class="rpt-kpi">
          <p class="rpt-kpi-label">Atenção</p>
          <p class="rpt-kpi-value" style="color:#d97706">${atencao.length}</p>
        </div>
        <div class="rpt-kpi">
          <p class="rpt-kpi-label">Crítico — Comprar</p>
          <p class="rpt-kpi-value" style="color:#dc2626">${criticos.length}</p>
        </div>
      </div>

      ${criticos.length > 0 ? `
        <div class="rpt-alert">
          ⚠ <strong>ITENS CRÍTICOS — REPOSIÇÃO URGENTE:</strong>
          ${criticos.map(i => i.nome).join(', ')}
        </div>
      ` : ''}

      ${(criticos.length + atencao.length) > 0 ? `
        <p class="rpt-section-title">Itens que Requerem Reposição</p>
        <table class="rpt-table">
          <thead><tr><th>Material</th><th style="text-align:center">Qtd. Atual</th><th style="text-align:center">Mínimo</th><th style="text-align:center">A Comprar</th></tr></thead>
          <tbody>${alertRows}</tbody>
        </table>
      ` : ''}

      <p class="rpt-section-title">Inventário Completo</p>
      <table class="rpt-table">
        <thead>
          <tr><th>Ref.</th><th>Material</th><th>Unidade</th><th style="text-align:right">Atual</th><th style="text-align:right">Mínimo</th><th>Ação</th><th>Status</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${footerHTML()}
    </div>`
}

function buildPatrimonio(assets: ReportAsset[], period: string): string {
  const total = assets.reduce((s, a) => s + a.valor, 0)
  const ativos = assets.filter(a => a.status === 'ATIVO')
  const emMaint = assets.filter(a => a.status === 'MANUTENÇÃO')

  const rows = assets.map(a => `
    <tr>
      <td><strong>${a.tag}</strong></td>
      <td>${a.nome}</td>
      <td>${a.categoria}</td>
      <td>${a.localizacao}</td>
      <td style="text-align:right">${fmtBRL(a.valor)}</td>
      <td>${a.dataAquisicao}</td>
      <td>${badgeHTML(a.status)}</td>
    </tr>`).join('')

  const catMap: Record<string, { count: number; valor: number }> = {}
  assets.forEach(a => {
    if (!catMap[a.categoria]) catMap[a.categoria] = { count: 0, valor: 0 }
    catMap[a.categoria].count++; catMap[a.categoria].valor += a.valor
  })

  const catRows = Object.entries(catMap).map(([c, v]) =>
    `<tr><td>${c}</td><td style="text-align:center">${v.count}</td><td style="text-align:right">${fmtBRL(v.valor)}</td><td style="text-align:right">${((v.valor/total)*100).toFixed(1)}%</td></tr>`).join('')

  return `
    <div id="report-print-area">
      ${headerHTML('Patrimônio', 'Ativos fixos e manutenções', period)}
      <p class="rpt-title">Relatório Patrimonial</p>
      <p class="rpt-period">Emissão: ${period}</p>

      <div class="rpt-kpi-grid">
        <div class="rpt-kpi">
          <p class="rpt-kpi-label">Valor Total Patrimônio</p>
          <p class="rpt-kpi-value" style="font-size:12pt">${fmtBRL(total)}</p>
        </div>
        <div class="rpt-kpi">
          <p class="rpt-kpi-label">Total de Ativos</p>
          <p class="rpt-kpi-value">${assets.length}</p>
        </div>
        <div class="rpt-kpi">
          <p class="rpt-kpi-label">Em Operação</p>
          <p class="rpt-kpi-value" style="color:#16a34a">${ativos.length}</p>
        </div>
        <div class="rpt-kpi">
          <p class="rpt-kpi-label">Em Manutenção</p>
          <p class="rpt-kpi-value" style="color:#d97706">${emMaint.length}</p>
        </div>
      </div>

      <div class="rpt-two-col">
        <div class="rpt-box">
          <p class="rpt-box-title">Por Categoria</p>
          <table class="rpt-table">
            <thead><tr><th>Categoria</th><th style="text-align:center">Qtd</th><th style="text-align:right">Valor</th><th style="text-align:right">%</th></tr></thead>
            <tbody>${catRows}</tbody>
          </table>
        </div>
        <div class="rpt-box">
          <p class="rpt-box-title">Distribuição por Localização</p>
          <table class="rpt-table">
            ${['Produção A','Produção B','Escritório','Externo'].map(loc => {
              const found = assets.filter(a => a.localizacao === loc)
              return found.length ? `<tr><td>${loc}</td><td style="text-align:center">${found.length}</td><td style="text-align:right">${fmtBRL(found.reduce((s,a)=>s+a.valor,0))}</td></tr>` : ''
            }).join('')}
          </table>
        </div>
      </div>

      <p class="rpt-section-title">Listagem Completa de Ativos</p>
      <table class="rpt-table">
        <thead>
          <tr><th>Tag</th><th>Nome</th><th>Categoria</th><th>Localização</th><th style="text-align:right">Valor</th><th>Aquisição</th><th>Status</th></tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr style="background:#1e3a8a;color:#fff">
            <td colspan="4"><strong>VALOR TOTAL DO PATRIMÔNIO</strong></td>
            <td style="text-align:right"><strong>${fmtBRL(total)}</strong></td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
      ${footerHTML()}
    </div>`
}

function buildExecutivo(orders: ReportOrder[], txs: ReportTx[], items: ReportItem[], period: string): string {
  const entradas    = txs.filter(t => t.tipo === 'entrada').reduce((s, t) => s + t.valor, 0)
  const saidas      = txs.filter(t => t.tipo === 'saida').reduce((s, t) => s + t.valor, 0)
  const concluidos  = orders.filter(o => ['Concluído', 'Pronto', 'Despachado'].includes(o.status)).length
  const atrasados   = orders.filter(o => o.status === 'Atrasado').length
  const criticos    = items.filter(i => i.status === 'CRÍTICO').length

  return `
    <div id="report-print-area">
      ${headerHTML('Resumo Executivo', 'Visão geral do negócio', period)}
      <p class="rpt-title">Dashboard Executivo</p>
      <p class="rpt-period">Período: ${period}</p>

      <p class="rpt-section-title">KPIs Financeiros</p>
      <div class="rpt-kpi-grid">
        <div class="rpt-kpi"><p class="rpt-kpi-label">Saldo Líquido</p><p class="rpt-kpi-value" style="color:${entradas-saidas>=0?'#16a34a':'#dc2626'}">${fmtBRL(entradas-saidas)}</p></div>
        <div class="rpt-kpi"><p class="rpt-kpi-label">Total Entradas</p><p class="rpt-kpi-value" style="color:#2563eb">${fmtBRL(entradas)}</p></div>
        <div class="rpt-kpi"><p class="rpt-kpi-label">Total Saídas</p><p class="rpt-kpi-value" style="color:#dc2626">${fmtBRL(saidas)}</p></div>
        <div class="rpt-kpi"><p class="rpt-kpi-label">Margem</p><p class="rpt-kpi-value">${((((entradas-saidas)/Math.max(entradas,1))*100)).toFixed(1)}%</p></div>
      </div>

      <p class="rpt-section-title">KPIs de Produção</p>
      <div class="rpt-kpi-grid">
        <div class="rpt-kpi"><p class="rpt-kpi-label">Total Pedidos</p><p class="rpt-kpi-value">${orders.length}</p></div>
        <div class="rpt-kpi"><p class="rpt-kpi-label">Concluídos</p><p class="rpt-kpi-value" style="color:#16a34a">${concluidos}</p></div>
        <div class="rpt-kpi"><p class="rpt-kpi-label">Atrasados</p><p class="rpt-kpi-value" style="color:#dc2626">${atrasados}</p></div>
        <div class="rpt-kpi"><p class="rpt-kpi-label">Ticket Médio</p><p class="rpt-kpi-value">${fmtBRL(orders.reduce((s,o)=>s+o.valor,0)/Math.max(orders.length,1))}</p></div>
      </div>

      <p class="rpt-section-title">Alertas Operacionais</p>
      <div class="rpt-two-col">
        <div class="rpt-box">
          <p class="rpt-box-title">⚠ Insumos Críticos (${criticos})</p>
          <table class="rpt-table">
            <thead><tr><th>Material</th><th style="text-align:right">Atual</th><th style="text-align:right">Mínimo</th></tr></thead>
            <tbody>
              ${items.filter(i=>i.status==='CRÍTICO').map(i=>`<tr><td>${i.nome}</td><td style="text-align:right;color:#dc2626">${i.atual}</td><td style="text-align:right">${i.minimo}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="rpt-box">
          <p class="rpt-box-title">🚚 Pedidos Prontos para Sair</p>
          <table class="rpt-table">
            <thead><tr><th>Pedido</th><th>Cliente</th><th>Prazo</th></tr></thead>
            <tbody>
              ${orders.filter(o=>o.status==='Pronto').map(o=>`<tr><td><strong>#${o.id}</strong></td><td>${o.cliente}</td><td>${o.prazo}</td></tr>`).join('')}
              ${orders.filter(o=>o.status==='Pronto').length===0?'<tr><td colspan="3" style="color:#888">Nenhum pedido aguardando envio.</td></tr>':''}
            </tbody>
          </table>
        </div>
      </div>

      <p class="rpt-section-title">Receita por Cliente (Top 10)</p>
      <table class="rpt-table">
        <thead><tr><th>Cliente</th><th style="text-align:right">Pedidos</th><th style="text-align:right">Faturado</th></tr></thead>
        <tbody>
          ${Object.entries(
            orders.reduce<Record<string,{count:number,valor:number}>>((acc,o)=>{
              if(!acc[o.cliente]) acc[o.cliente]={count:0,valor:0}
              acc[o.cliente].count++; acc[o.cliente].valor+=o.valor; return acc
            },{}))
            .sort(([,a],[,b])=>b.valor-a.valor).slice(0,10)
            .map(([c,v])=>`<tr><td>${c}</td><td style="text-align:right">${v.count}</td><td style="text-align:right"><strong>${fmtBRL(v.valor)}</strong></td></tr>`).join('')}
        </tbody>
      </table>
      ${footerHTML()}
    </div>`
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function Reports() {
  const todayStr = new Date().toISOString().slice(0, 10)
  const weekAgo  = new Date(Date.now() - 7*86400000).toISOString().slice(0, 10)

  const [dateFrom, setDateFrom] = useState(weekAgo)
  const [dateTo,   setDateTo]   = useState(todayStr)
  const [preview,  setPreview]  = useState<ReportId | null>(null)
  const [previewHTML, setPreviewHTML] = useState('')
  const [toast,    setToast]    = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const periodLabel = dateFrom === dateTo
    ? new Date(dateFrom + 'T12:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })
    : `${new Date(dateFrom + 'T12:00').toLocaleDateString('pt-BR')} a ${new Date(dateTo + 'T12:00').toLocaleDateString('pt-BR')}`

  const filteredTxs = filterByDate(TRANSACTIONS, dateFrom, dateTo)

  const buildHTML = useCallback((id: ReportId): string => {
    switch (id) {
      case 'producao-diaria': return buildProducaoDiaria(ORDERS, periodLabel)
      case 'expedicao':       return buildExpedicao(DESPACHOS, periodLabel)
      case 'financeiro':      return buildFinanceiro(filteredTxs, periodLabel)
      case 'estoque':         return buildEstoque(STOCK_ITEMS, periodLabel)
      case 'patrimonio':      return buildPatrimonio(ASSETS, periodLabel)
      case 'executivo':       return buildExecutivo(ORDERS, filteredTxs, STOCK_ITEMS, periodLabel)
    }
  }, [filteredTxs, periodLabel])

  const handlePrint = (id: ReportId) => {
    const html = buildHTML(id)
    // Inject into a hidden div then print
    let div = document.getElementById('report-print-area')
    if (!div) { div = document.createElement('div'); div.id = 'report-print-area'; document.body.appendChild(div) }
    div.outerHTML = html
    setTimeout(() => { window.print(); showToast('PDF gerado com sucesso!') }, 100)
  }

  const handlePreview = (id: ReportId) => {
    setPreviewHTML(buildHTML(id))
    setPreview(id)
  }

  const quickDatePresets = [
    { label: 'Hoje',         from: todayStr, to: todayStr },
    { label: 'Ontem',        from: new Date(Date.now()-86400000).toISOString().slice(0,10), to: new Date(Date.now()-86400000).toISOString().slice(0,10) },
    { label: 'Últimos 7d',   from: weekAgo,  to: todayStr },
    { label: 'Últimos 30d',  from: new Date(Date.now()-30*86400000).toISOString().slice(0,10), to: todayStr },
    { label: 'Este mês',     from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10), to: todayStr },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Central de Relatórios</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gere relatórios em PDF para cada área do sistema com filtros de data.</p>
      </div>

      {/* Date filter */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Calendar size={13} /> Filtro de Período
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">De:</label>
            <input
              type="date" value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="input text-sm py-1.5 w-38"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Até:</label>
            <input
              type="date" value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="input text-sm py-1.5 w-38"
            />
          </div>
          <div className="h-5 w-px bg-gray-200" />
          <div className="flex gap-1.5 flex-wrap">
            {quickDatePresets.map(p => (
              <button
                key={p.label}
                onClick={() => { setDateFrom(p.from); setDateTo(p.to) }}
                className={`px-3 py-1 text-xs rounded-lg border transition-colors font-medium ${
                  dateFrom === p.from && dateTo === p.to
                    ? 'bg-navy-900 text-white border-navy-900'
                    : 'border-gray-200 text-gray-600 hover:border-navy-900/30 hover:text-navy-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex-1 text-right">
            <span className="text-xs text-gray-400 italic">{periodLabel}</span>
          </div>
        </div>
      </div>

      {/* Stats quick view */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Lançamentos no período', value: filteredTxs.length, sub: `${filteredTxs.filter(t=>t.tipo==='entrada').length} entradas · ${filteredTxs.filter(t=>t.tipo==='saida').length} saídas`, icon: DollarSign, color: 'text-blue-600 bg-blue-50' },
          { label: 'Pedidos Ativos',         value: ORDERS.length,      sub: `${ORDERS.filter(o=>o.status==='Atrasado').length} atrasados`, icon: Factory, color: 'text-orange-600 bg-orange-50' },
          { label: 'Insumos Críticos',       value: STOCK_ITEMS.filter(i=>i.status==='CRÍTICO').length, sub: 'reposição urgente', icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
          { label: 'Itens Despachados',      value: DESPACHOS.filter(d=>d.dataDespacho!=='—').length, sub: 'em trânsito', icon: Truck, color: 'text-emerald-600 bg-emerald-50' },
        ].map(s => (
          <div key={s.label} className="stat">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color} mb-1`}>
              <s.icon size={15} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">{s.label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Report cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Relatórios Disponíveis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {REPORTS.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card p-5 hover:shadow-lg transition-shadow"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${r.bg} border mb-3`}>
                <r.icon size={20} className={r.color} />
              </div>
              <h3 className="font-bold text-gray-900">{r.title}</h3>
              <p className="text-xs text-gray-500 mb-1">{r.subtitle}</p>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">{r.description}</p>

              <div className="flex gap-2">
                <button
                  onClick={() => handlePreview(r.id)}
                  className="flex-1 btn-secondary justify-center text-xs py-2"
                >
                  <FileText size={13} /> Visualizar
                </button>
                <button
                  onClick={() => handlePrint(r.id)}
                  className="flex-1 btn-primary justify-center text-xs py-2"
                >
                  <Printer size={13} /> Gerar PDF
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* PDF tip */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <FileText size={16} className="text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Como salvar em PDF?</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Clique em <strong>Gerar PDF</strong>. O diálogo de impressão do navegador abrirá. Selecione <strong>"Salvar como PDF"</strong> como destino e clique em Salvar. Recomendamos papel A4, retrato, margens padrão.
          </p>
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {preview && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPreview(null)}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div>
                  <h3 className="font-bold text-gray-900">
                    {REPORTS.find(r => r.id === preview)?.title} — Prévia
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Período: {periodLabel}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { handlePrint(preview!); setPreview(null) }}
                    className="btn-primary text-xs py-1.5"
                  >
                    <Printer size={13} /> Gerar PDF
                  </button>
                  <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-700">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Preview iframe */}
              <div className="flex-1 overflow-hidden bg-gray-100 rounded-b-2xl">
                <iframe
                  srcDoc={`<!DOCTYPE html><html><head>
                    <meta charset="UTF-8"/>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
                    <style>
                      * { box-sizing: border-box; }
                      body { font-family: 'Inter', Arial, sans-serif; font-size: 10pt; color: #111; margin: 0; background: #f8fafc; padding: 20px; }
                      .rpt-logo-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:6mm; padding-bottom:4mm; border-bottom:2px solid #1e3a8a; }
                      .rpt-logo-row h1 { font-size:18pt; font-weight:800; color:#1e3a8a; margin:0; }
                      .rpt-logo-row p { font-size:9pt; color:#555; margin:0; }
                      .rpt-logo-sub { font-size:8pt; color:#888; text-align:right; }
                      .rpt-title { font-size:14pt; font-weight:700; color:#1e3a8a; margin:0 0 1mm; }
                      .rpt-period { font-size:9pt; color:#666; margin:0 0 5mm; }
                      .rpt-kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:4mm; margin-bottom:6mm; }
                      .rpt-kpi { border:1px solid #e5e7eb; border-radius:4pt; padding:3mm 4mm; background:#f9fafb; }
                      .rpt-kpi-label { font-size:7pt; text-transform:uppercase; letter-spacing:.05em; color:#888; margin:0 0 1mm; }
                      .rpt-kpi-value { font-size:15pt; font-weight:700; color:#1e3a8a; margin:0; }
                      .rpt-kpi-sub { font-size:7.5pt; color:#666; margin:2px 0 0; }
                      .rpt-section-title { font-size:10pt; font-weight:700; color:#1e3a8a; text-transform:uppercase; letter-spacing:.08em; border-bottom:1px solid #e5e7eb; padding-bottom:1.5mm; margin:5mm 0 3mm; }
                      table.rpt-table { width:100%; border-collapse:collapse; font-size:8.5pt; }
                      table.rpt-table th { background:#1e3a8a; color:#fff; padding:2mm 3mm; text-align:left; font-size:7.5pt; font-weight:600; }
                      table.rpt-table td { padding:1.8mm 3mm; border-bottom:1px solid #f3f4f6; vertical-align:top; }
                      table.rpt-table tr:nth-child(even) td { background:#f8faff; }
                      table.rpt-table tfoot td { background:#1e3a8a; color:#fff; font-weight:700; }
                      .badge-print { display:inline-block; padding:0.5mm 2mm; border-radius:20pt; font-size:7pt; font-weight:600; border:1px solid currentColor; }
                      .badge-ok { color:#16a34a; } .badge-atrasado { color:#dc2626; } .badge-pendente { color:#d97706; }
                      .badge-critico { color:#dc2626; } .badge-atencao { color:#d97706; } .badge-normal { color:#2563eb; }
                      .rpt-footer { margin-top:8mm; display:flex; justify-content:space-between; font-size:7.5pt; color:#aaa; border-top:1px solid #e5e7eb; padding-top:2mm; }
                      .rpt-two-col { display:grid; grid-template-columns:1fr 1fr; gap:5mm; margin-bottom:4mm; }
                      .rpt-box { border:1px solid #e5e7eb; border-radius:4pt; padding:3mm; background:#f9fafb; }
                      .rpt-box-title { font-size:8pt; font-weight:700; color:#374151; margin:0 0 2mm; }
                      .rpt-alert { background:#fef2f2; border:1px solid #fecaca; padding:3mm; border-radius:4pt; margin-bottom:4mm; font-size:8.5pt; color:#b91c1c; }
                    </style>
                  </head><body>${previewHTML}</body></html>`}
                  className="w-full h-full rounded-b-2xl"
                  style={{ minHeight: '600px' }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl text-sm"
          >
            <Check size={16} className="text-green-400 shrink-0" />
            {toast}
            <button onClick={() => setToast(null)} className="ml-2 text-gray-400 hover:text-white"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
