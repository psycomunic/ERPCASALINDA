export interface ContaFixa {
  id: string
  codigo: string
  descricao: string
  entidade: string
  planoContas: string
  formaPagamento: string
  gerarPagamento: string
  repetirPor: string
  qtdVezes: string
  vencimento: string
  dataCompetencia: string
  valor: number
  juros: number
  desconto: number
  situacao: string
  loja: string
  criadoPor: string
  criadoEm: string
  modificadoEm: string
}

export const mockContasFixas: ContaFixa[] = [
  {
    id: '1', codigo: '1', descricao: 'DIARISTA CASA JHONATHAN', entidade: 'JONATHAN MARQUES ANTUNES',
    planoContas: 'DESPESAS JONATHAN', formaPagamento: 'PIX', gerarPagamento: 'Uma semana antes do vencimento', repetirPor: '7 days', qtdVezes: '-',
    vencimento: '04/05/2026', dataCompetencia: '01/05/2026', valor: 600.00, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:44', modificadoEm: '-'
  },
  {
    id: '2', codigo: '2', descricao: 'LUZ CASA LINDA', entidade: 'CELESC',
    planoContas: 'Energia elétrica + água', formaPagamento: 'Boleto Bancário', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '04/06/2026', dataCompetencia: '01/05/2026', valor: 2197.20, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  },
  {
    id: '3', codigo: '3', descricao: 'CONTABILIDADE CASA LINDA', entidade: 'CONTEG CONTABILIDADE LTDA',
    planoContas: 'Contabilidade', formaPagamento: 'Boleto Bancário', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '10/06/2026', dataCompetencia: '01/05/2026', valor: 3530.00, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  },
  {
    id: '4', codigo: '4', descricao: 'TIM INTERNET CASA LINDA', entidade: 'TIM S.A.',
    planoContas: 'Telefonia e internet', formaPagamento: 'Boleto Bancário', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '20/06/2026', dataCompetencia: '01/05/2026', valor: 630.17, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  },
  {
    id: '5', codigo: '5', descricao: 'HOSPEDAGEM SITE CASA LINDA', entidade: '------',
    planoContas: 'SISTEMA', formaPagamento: 'PIX', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '20/06/2026', dataCompetencia: '01/05/2026', valor: 349.00, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  },
  {
    id: '6', codigo: '6', descricao: 'ÁGUA CASA LINDA-101779', entidade: 'SAMAE',
    planoContas: 'Energia elétrica + água', formaPagamento: 'Boleto Bancário', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '07/06/2026', dataCompetencia: '01/05/2026', valor: 208.30, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  },
  {
    id: '7', codigo: '7', descricao: 'LUZ DA CASA DA VÓ', entidade: 'MARIO MARQUES ANTUNES',
    planoContas: 'DESPESAS MARIO', formaPagamento: 'Boleto Bancário', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '10/06/2026', dataCompetencia: '01/05/2026', valor: 633.55, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  },
  {
    id: '8', codigo: '8', descricao: 'Agua casa da vó-matricula -6714', entidade: 'MARIO MARQUES ANTUNES',
    planoContas: 'DESPESAS MARIO', formaPagamento: 'Boleto Bancário', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '16/06/2026', dataCompetencia: '01/05/2026', valor: 500.00, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  },
  {
    id: '9', codigo: '9', descricao: 'ALUGUEL CASA LINDA', entidade: 'ESIO',
    planoContas: 'Aluguel', formaPagamento: 'Boleto Bancário', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '20/06/2026', dataCompetencia: '01/05/2026', valor: 12000.00, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  },
  {
    id: '10', codigo: '10', descricao: 'ALUGUEL MARIO', entidade: 'MARIO MARQUES ANTUNES',
    planoContas: 'DESPESAS MARIO', formaPagamento: 'Boleto Bancário', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '08/06/2026', dataCompetencia: '01/05/2026', valor: 3226.20, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  },
  {
    id: '11', codigo: '11', descricao: 'ÁGUA JONATHAN 11244', entidade: 'JONATHAN MARQUES ANTUNES',
    planoContas: 'DESPESAS JONATHAN', formaPagamento: 'Boleto Bancário', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '09/06/2026', dataCompetencia: '01/05/2026', valor: 934.22, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  },
  {
    id: '12', codigo: '12', descricao: 'INTERNET JONATHAN', entidade: 'JONATHAN MARQUES ANTUNES',
    planoContas: 'DESPESAS JONATHAN', formaPagamento: 'Boleto Bancário', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '09/06/2026', dataCompetencia: '01/05/2026', valor: 159.90, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  },
  {
    id: '13', codigo: '13', descricao: 'PIX PARA FERNANDA PAGA ACORDO NO BANCO DELA', entidade: 'JONATHAN MARQUES ANTUNES',
    planoContas: 'DESPESAS JONATHAN', formaPagamento: 'PIX', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '09/06/2026', dataCompetencia: '01/05/2026', valor: 270.00, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  },
  {
    id: '14', codigo: '14', descricao: 'CONDOMINIO MARIO', entidade: 'MARIO MARQUES ANTUNES',
    planoContas: 'DESPESAS MARIO', formaPagamento: 'Boleto Bancário', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '10/06/2026', dataCompetencia: '01/05/2026', valor: 568.03, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  },
  {
    id: '15', codigo: '15', descricao: 'ALUGUEL JONATHAN', entidade: 'JONATHAN MARQUES ANTUNES',
    planoContas: 'DESPESAS JONATHAN', formaPagamento: 'Boleto Bancário', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '10/06/2026', dataCompetencia: '01/05/2026', valor: 5800.00, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  },
  {
    id: '16', codigo: '16', descricao: 'GARAGEM MARIO NUMERO 541', entidade: 'MARIO MARQUES ANTUNES',
    planoContas: 'DESPESAS MARIO', formaPagamento: 'Boleto Bancário', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '10/06/2026', dataCompetencia: '01/05/2026', valor: 380.00, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  },
  {
    id: '17', codigo: '17', descricao: 'CONDOMINIO JONATHAN', entidade: 'JONATHAN MARQUES ANTUNES',
    planoContas: 'DESPESAS JONATHAN', formaPagamento: 'Boleto Bancário', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '10/06/2026', dataCompetencia: '01/05/2026', valor: 420.00, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  },
  {
    id: '18', codigo: '18', descricao: 'ESCOLA BERNARDO', entidade: 'JONATHAN MARQUES ANTUNES',
    planoContas: 'DESPESAS JONATHAN', formaPagamento: 'Boleto Bancário', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '10/06/2026', dataCompetencia: '01/05/2026', valor: 1106.93, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  },
  {
    id: '19', codigo: '19', descricao: 'INTERNET FERNANDA', entidade: 'JONATHAN MARQUES ANTUNES',
    planoContas: 'JONATHAN', formaPagamento: 'Boleto Bancário', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '10/06/2026', dataCompetencia: '01/05/2026', valor: 90.00, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  },
  {
    id: '20', codigo: '20', descricao: 'MENSALIDADE CRECHE JHONY', entidade: 'JONATHAN MARQUES ANTUNES',
    planoContas: 'DESPESAS JONATHAN', formaPagamento: 'Boleto Bancário', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '10/06/2026', dataCompetencia: '01/05/2026', valor: 1386.00, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  },
  {
    id: '21', codigo: '21', descricao: 'LUZ MARIO', entidade: 'MARIO MARQUES ANTUNES',
    planoContas: 'DESPESAS MARIO', formaPagamento: 'Boleto Bancário', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '11/06/2026', dataCompetencia: '01/05/2026', valor: 462.08, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  },
  {
    id: '22', codigo: '22', descricao: 'LUZ JONATHAN', entidade: 'JONATHAN MARQUES ANTUNES',
    planoContas: 'DESPESAS JONATHAN', formaPagamento: 'Boleto Bancário', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '11/06/2026', dataCompetencia: '01/05/2026', valor: 496.85, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  },
  {
    id: '23', codigo: '23', descricao: 'MENSALIDADE ESCOLA THAYLA', entidade: 'MARIO MARQUES ANTUNES',
    planoContas: 'DESPESAS MARIO', formaPagamento: 'Boleto Bancário', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '12/06/2026', dataCompetencia: '01/05/2026', valor: 1409.41, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  },
  {
    id: '24', codigo: '24', descricao: 'INTERNET MARIO', entidade: 'MARIO MARQUES ANTUNES',
    planoContas: 'DESPESAS MARIO', formaPagamento: 'Boleto Bancário', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '14/06/2026', dataCompetencia: '01/05/2026', valor: 137.65, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  },
  {
    id: '25', codigo: '25', descricao: 'GARAGEM MARIO NUMERO 256', entidade: 'MARIO MARQUES ANTUNES',
    planoContas: 'DESPESAS MARIO', formaPagamento: 'Boleto Bancário', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '14/06/2026', dataCompetencia: '01/05/2026', valor: 350.00, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  },
  {
    id: '26', codigo: '26', descricao: 'TUPIQUE BERNARDO', entidade: 'JONATHAN MARQUES ANTUNES',
    planoContas: 'DESPESAS JONATHAN', formaPagamento: 'PIX', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '20/06/2026', dataCompetencia: '01/05/2026', valor: 560.00, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  },
  {
    id: '27', codigo: '27', descricao: 'ALUGUEL CASA LINDA-PIX 47999410583', entidade: 'ESIO',
    planoContas: 'Aluguel', formaPagamento: 'Boleto Bancário', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '20/06/2026', dataCompetencia: '01/05/2026', valor: 6875.71, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  },
  {
    id: '28', codigo: '28', descricao: 'PISCOLOGA BERNARDO-CNPJ -05911777979', entidade: 'JONATHAN MARQUES ANTUNES',
    planoContas: 'DESPESAS JONATHAN', formaPagamento: 'PIX', gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '30/06/2026', dataCompetencia: '01/05/2026', valor: 640.00, juros: 0, desconto: 0, situacao: 'Em aberto', loja: 'CASA LINDA', criadoPor: 'ALESSANDRA', criadoEm: '01/05/2026 10:00', modificadoEm: '-'
  }
]
