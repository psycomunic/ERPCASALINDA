/**
 * Códigos de produto Tellaio (fornecedor) — extraídos de NFs reais (XMLs).
 *
 * Estrutura do código: `BASE.TAMANHO.DESENHO`
 *   - BASE   = identificador da coleção/modelo (6 dígitos, ex. 000218 = NAKURU)
 *   - TAMANHO = código do tamanho/dimensão (3 dígitos, ex. 006 = 3,00×4,00)
 *   - DESENHO = código do desenho/variante (3 dígitos, ex. 002 = desenho 02)
 *
 * Esta tabela contém apenas SKUs efetivamente vistos em NFs (não inferidos).
 * Ao receber uma NF nova com SKU desconhecido, adicione aqui.
 *
 * Os nomes de coleção/modelo/tamanho/desenho/variante seguem a forma canonical
 * usada em `precosTapetesLV.ts` e `camasLV.ts` (não a forma do XML), pra que o
 * lookup case com o catálogo direto.
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface CodigoTapeteTellaio {
  codigo: string          // ex: '000218.006.002'
  ean: string | null      // ex: '7898744535390' (null quando "SEM GTIN")
  colecao: string         // canonical (ex: 'NAKURU')
  tamanho: string         // canonical (ex: '3,00 × 4,00' | 'DIAM.150')
  desenho: string         // ex: '02' (zfill 2)
}

export interface CodigoCamaTellaio {
  codigo: string          // ex: '000302.003.023'
  ean: string | null
  modelo: string          // canonical (ex: 'COLCHA BAMBU')
  variante: string        // canonical (ex: 'Des. 1 - Branco' | 'Branco/Cinza')
  tamanho: string         // canonical (ex: 'Queen' | 'King' | 'Super King' | 'Casal')
}

// ─── TAPETES ─────────────────────────────────────────────────────────────────

export const CODIGOS_TAPETES: CodigoTapeteTellaio[] = [
  // TAMISA (RIOS) — 000184
  { codigo: '000184.003.003', ean: null,            colecao: 'TAMISA',        tamanho: '2,00 × 2,50', desenho: '03' },

  // TAAL (LAGOS) — 000190
  { codigo: '000190.005.023', ean: '7898744533143', colecao: 'TAAL',          tamanho: '2,50 × 3,50', desenho: '23' },
  { codigo: '000190.005.024', ean: '7898744533150', colecao: 'TAAL',          tamanho: '2,50 × 3,50', desenho: '24' },
  { codigo: '000190.005.025', ean: '7898744533167', colecao: 'TAAL',          tamanho: '2,50 × 3,50', desenho: '25' },

  // NAKURU (LAGOS) — 000218
  { codigo: '000218.006.002', ean: '7898744535390', colecao: 'NAKURU',        tamanho: '3,00 × 4,00', desenho: '02' },

  // AMUR (RIOS) — 000229
  { codigo: '000229.004.003', ean: '7898744532108', colecao: 'AMUR',          tamanho: '2,40 × 3,00', desenho: '03' },
  { codigo: '000229.006.002', ean: '7898744532061', colecao: 'AMUR',          tamanho: '3,00 × 4,00', desenho: '02' },

  // HILLIER (LAGOS) — 000247
  { codigo: '000247.002.002', ean: '7898744534157', colecao: 'HILLIER',       tamanho: '1,40 × 2,00', desenho: '02' },
  { codigo: '000247.002.005', ean: '7908966601534', colecao: 'HILLIER',       tamanho: '1,40 × 2,00', desenho: '05' },

  // XINGU (RIOS) — 000248
  { codigo: '000248.003.003', ean: '7898744533891', colecao: 'XINGU',         tamanho: '2,00 × 2,50', desenho: '03' },
  { codigo: '000248.004.003', ean: '7898744533921', colecao: 'XINGU',         tamanho: '2,40 × 3,00', desenho: '03' },
  { codigo: '000248.005.001', ean: '7898744533938', colecao: 'XINGU',         tamanho: '2,50 × 3,50', desenho: '01' },
  { codigo: '000248.005.003', ean: '7898744533952', colecao: 'XINGU',         tamanho: '2,50 × 3,50', desenho: '03' },

  // JURUA (RIOS) — 000253
  { codigo: '000253.002.001', ean: '7898744534744', colecao: 'JURUA',         tamanho: '1,40 × 2,00', desenho: '01' },
  { codigo: '000253.003.001', ean: '7898744534775', colecao: 'JURUA',         tamanho: '2,00 × 2,50', desenho: '01' },
  { codigo: '000253.003.004', ean: '7908966601244', colecao: 'JURUA',         tamanho: '2,00 × 2,50', desenho: '04' },
  { codigo: '000253.004.001', ean: '7898744534805', colecao: 'JURUA',         tamanho: '2,40 × 3,00', desenho: '01' },
  { codigo: '000253.005.001', ean: '7898744534836', colecao: 'JURUA',         tamanho: '2,50 × 3,50', desenho: '01' },

  // TIETE (RIOS) — 000254
  { codigo: '000254.002.004', ean: '7908966601299', colecao: 'TIETE',         tamanho: '1,40 × 2,00', desenho: '04' },
  { codigo: '000254.002.006', ean: '7908966601312', colecao: 'TIETE',         tamanho: '1,40 × 2,00', desenho: '06' },

  // SENA (RIOS) — 000258
  { codigo: '000258.002.003', ean: '7898744537165', colecao: 'SENA',          tamanho: '1,40 × 2,00', desenho: '03' },
  { codigo: '000258.002.006', ean: '7898744537196', colecao: 'SENA',          tamanho: '1,40 × 2,00', desenho: '06' },
  { codigo: '000258.003.002', ean: '7898744537219', colecao: 'SENA',          tamanho: '2,00 × 2,50', desenho: '02' },
  { codigo: '000258.003.003', ean: '7898744537226', colecao: 'SENA',          tamanho: '2,00 × 2,50', desenho: '03' },
  { codigo: '000258.003.006', ean: '7898744537257', colecao: 'SENA',          tamanho: '2,00 × 2,50', desenho: '06' },
  { codigo: '000258.004.001', ean: '7898744537264', colecao: 'SENA',          tamanho: '2,40 × 3,00', desenho: '01' },
  { codigo: '000258.004.003', ean: '7898744537288', colecao: 'SENA',          tamanho: '2,40 × 3,00', desenho: '03' },
  { codigo: '000258.004.006', ean: '7898744537318', colecao: 'SENA',          tamanho: '2,40 × 3,00', desenho: '06' },
  { codigo: '000258.005.001', ean: '7898744537325', colecao: 'SENA',          tamanho: '2,50 × 3,50', desenho: '01' },
  { codigo: '000258.005.003', ean: '7898744537349', colecao: 'SENA',          tamanho: '2,50 × 3,50', desenho: '03' },
  { codigo: '000258.005.006', ean: '7898744537370', colecao: 'SENA',          tamanho: '2,50 × 3,50', desenho: '06' },
  { codigo: '000258.012.005', ean: '7898744537547', colecao: 'SENA',          tamanho: '3,50 × 4,50', desenho: '05' },
  // SENA — tamanhos redondos
  { codigo: '000258.017.003', ean: '7898744537561', colecao: 'SENA',          tamanho: 'Ø 1,50',      desenho: '03' },
  { codigo: '000258.018.003', ean: '7898744537585', colecao: 'SENA',          tamanho: 'Ø 2,00',      desenho: '03' },

  // NILO (RIOS) — 000289
  { codigo: '000289.004.004', ean: null,            colecao: 'NILO',          tamanho: '2,40 × 3,00', desenho: '04' },
  { codigo: '000289.005.004', ean: null,            colecao: 'NILO',          tamanho: '2,50 × 3,50', desenho: '04' },
  { codigo: '000289.005.006', ean: '7898744533372', colecao: 'NILO',          tamanho: '2,50 × 3,50', desenho: '06' },

  // MADEIRA (RIOS) — 000295
  { codigo: '000295.002.001', ean: '7908966603194', colecao: 'MADEIRA',       tamanho: '1,40 × 2,00', desenho: '01' },
  { codigo: '000295.002.002', ean: '7908966603200', colecao: 'MADEIRA',       tamanho: '1,40 × 2,00', desenho: '02' },
  { codigo: '000295.003.001', ean: '7908966603224', colecao: 'MADEIRA',       tamanho: '2,00 × 2,50', desenho: '01' },
  { codigo: '000295.003.002', ean: '7908966603231', colecao: 'MADEIRA',       tamanho: '2,00 × 2,50', desenho: '02' },
  { codigo: '000295.004.001', ean: '7908966603255', colecao: 'MADEIRA',       tamanho: '2,40 × 3,00', desenho: '01' },
  { codigo: '000295.004.002', ean: '7908966603262', colecao: 'MADEIRA',       tamanho: '2,40 × 3,00', desenho: '02' },
  { codigo: '000295.005.001', ean: '7908966603286', colecao: 'MADEIRA',       tamanho: '2,50 × 3,50', desenho: '01' },
  { codigo: '000295.005.002', ean: '7908966603293', colecao: 'MADEIRA',       tamanho: '2,50 × 3,50', desenho: '02' },
  { codigo: '000295.006.001', ean: '7908966603316', colecao: 'MADEIRA',       tamanho: '3,00 × 4,00', desenho: '01' },
  { codigo: '000295.006.002', ean: '7908966603323', colecao: 'MADEIRA',       tamanho: '3,00 × 4,00', desenho: '02' },

  // PARANA (RIOS) — 000296
  { codigo: '000296.002.001', ean: '7908966600681', colecao: 'PARANA',        tamanho: '1,40 × 2,00', desenho: '01' },
  { codigo: '000296.002.002', ean: '7908966600698', colecao: 'PARANA',        tamanho: '1,40 × 2,00', desenho: '02' },
  { codigo: '000296.002.003', ean: '7908966600704', colecao: 'PARANA',        tamanho: '1,40 × 2,00', desenho: '03' },
  { codigo: '000296.003.001', ean: '7908966600711', colecao: 'PARANA',        tamanho: '2,00 × 2,50', desenho: '01' },
  { codigo: '000296.003.003', ean: '7908966600735', colecao: 'PARANA',        tamanho: '2,00 × 2,50', desenho: '03' },
  { codigo: '000296.004.001', ean: '7908966600742', colecao: 'PARANA',        tamanho: '2,40 × 3,00', desenho: '01' },
  { codigo: '000296.004.002', ean: '7908966600759', colecao: 'PARANA',        tamanho: '2,40 × 3,00', desenho: '02' },
  { codigo: '000296.004.003', ean: '7908966600766', colecao: 'PARANA',        tamanho: '2,40 × 3,00', desenho: '03' },
  { codigo: '000296.005.001', ean: '7908966600773', colecao: 'PARANA',        tamanho: '2,50 × 3,50', desenho: '01' },
  { codigo: '000296.005.002', ean: '7908966600780', colecao: 'PARANA',        tamanho: '2,50 × 3,50', desenho: '02' },
  { codigo: '000296.005.003', ean: '7908966600797', colecao: 'PARANA',        tamanho: '2,50 × 3,50', desenho: '03' },
  { codigo: '000296.006.001', ean: '7908966600803', colecao: 'PARANA',        tamanho: '3,00 × 4,00', desenho: '01' },
  { codigo: '000296.006.002', ean: '7908966600810', colecao: 'PARANA',        tamanho: '3,00 × 4,00', desenho: '02' },
  { codigo: '000296.006.003', ean: '7908966600827', colecao: 'PARANA',        tamanho: '3,00 × 4,00', desenho: '03' },

  // SAO FRANCISCO (RIOS) — 000298
  { codigo: '000298.002.003', ean: '7908966600209', colecao: 'SAO FRANCISCO', tamanho: '1,40 × 2,00', desenho: '03' },

  // GUAIBA (LAGOS) — 000299
  { codigo: '000299.002.001', ean: '7908966603507', colecao: 'GUAIBA',        tamanho: '1,40 × 2,00', desenho: '01' },
  { codigo: '000299.003.003', ean: '7908966603552', colecao: 'GUAIBA',        tamanho: '2,00 × 2,50', desenho: '03' },
  { codigo: '000299.004.001', ean: '7908966603569', colecao: 'GUAIBA',        tamanho: '2,40 × 3,00', desenho: '01' },

  // TEFE (RIOS) — 000300
  { codigo: '000300.002.002', ean: '7908966604030', colecao: 'TEFE',          tamanho: '1,40 × 2,00', desenho: '02' },
  { codigo: '000300.003.002', ean: '7908966604061', colecao: 'TEFE',          tamanho: '2,00 × 2,50', desenho: '02' },
  { codigo: '000300.004.002', ean: '7908966604092', colecao: 'TEFE',          tamanho: '2,40 × 3,00', desenho: '02' },
  { codigo: '000300.005.002', ean: '7908966604122', colecao: 'TEFE',          tamanho: '2,50 × 3,50', desenho: '02' },
  { codigo: '000300.006.002', ean: '7908966604153', colecao: 'TEFE',          tamanho: '3,00 × 4,00', desenho: '02' },

  // ONEGA (LAGOS) — 000301
  { codigo: '000301.002.003', ean: '7908966604245', colecao: 'ONEGA',         tamanho: '1,40 × 2,00', desenho: '03' },
  { codigo: '000301.005.003', ean: '7908966604368', colecao: 'ONEGA',         tamanho: '2,50 × 3,50', desenho: '03' },
  { codigo: '000301.006.002', ean: '7908966604399', colecao: 'ONEGA',         tamanho: '3,00 × 4,00', desenho: '02' },
  { codigo: '000301.006.003', ean: '7908966604405', colecao: 'ONEGA',         tamanho: '3,00 × 4,00', desenho: '03' },
]

// ─── CAMAS ───────────────────────────────────────────────────────────────────

export const CODIGOS_CAMAS: CodigoCamaTellaio[] = [
  // COLCHA BAMBU — 000302
  { codigo: '000302.003.023', ean: '7908966603798', modelo: 'COLCHA BAMBU', variante: 'Des. 1 - Branco', tamanho: 'Queen' },
  { codigo: '000302.003.025', ean: '7908966603811', modelo: 'COLCHA BAMBU', variante: 'Des. 1 - Fendi',  tamanho: 'Queen' },
  { codigo: '000302.003.026', ean: '7908966603828', modelo: 'COLCHA BAMBU', variante: 'Des. 1 - Cinza',  tamanho: 'Queen' },
  { codigo: '000302.003.027', ean: '7908966603835', modelo: 'COLCHA BAMBU', variante: 'Des. 2 - Branco', tamanho: 'Queen' },
  { codigo: '000302.003.029', ean: '7908966603859', modelo: 'COLCHA BAMBU', variante: 'Des. 2 - Fendi',  tamanho: 'Queen' },
  { codigo: '000302.003.030', ean: '7908966603866', modelo: 'COLCHA BAMBU', variante: 'Des. 2 - Cinza',  tamanho: 'Queen' },
  { codigo: '000302.004.023', ean: '7908966603873', modelo: 'COLCHA BAMBU', variante: 'Des. 1 - Branco', tamanho: 'King' },
  { codigo: '000302.004.025', ean: '7908966603897', modelo: 'COLCHA BAMBU', variante: 'Des. 1 - Fendi',  tamanho: 'King' },
  { codigo: '000302.004.026', ean: '7908966603903', modelo: 'COLCHA BAMBU', variante: 'Des. 1 - Cinza',  tamanho: 'King' },
  { codigo: '000302.004.027', ean: '7908966603910', modelo: 'COLCHA BAMBU', variante: 'Des. 2 - Branco', tamanho: 'King' },
  { codigo: '000302.004.029', ean: '7908966603934', modelo: 'COLCHA BAMBU', variante: 'Des. 2 - Fendi',  tamanho: 'King' },
  { codigo: '000302.004.030', ean: '7908966603941', modelo: 'COLCHA BAMBU', variante: 'Des. 2 - Cinza',  tamanho: 'King' },
  { codigo: '000302.010.023', ean: '7908966604467', modelo: 'COLCHA BAMBU', variante: 'Des. 1 - Branco', tamanho: 'Super King' },
  { codigo: '000302.010.025', ean: '7908966604481', modelo: 'COLCHA BAMBU', variante: 'Des. 1 - Fendi',  tamanho: 'Super King' },
  { codigo: '000302.010.026', ean: '7908966604498', modelo: 'COLCHA BAMBU', variante: 'Des. 1 - Cinza',  tamanho: 'Super King' },
  { codigo: '000302.010.027', ean: '7908966604504', modelo: 'COLCHA BAMBU', variante: 'Des. 2 - Branco', tamanho: 'Super King' },
  { codigo: '000302.010.029', ean: '7908966604528', modelo: 'COLCHA BAMBU', variante: 'Des. 2 - Fendi',  tamanho: 'Super King' },
  { codigo: '000302.010.030', ean: '7908966604535', modelo: 'COLCHA BAMBU', variante: 'Des. 2 - Cinza',  tamanho: 'Super King' },

  // LENÇOL BAMBU MOSSÔ — 000326
  { codigo: '000326.002.032', ean: '7908966605235', modelo: 'LENÇOL BAMBU MOSSÔ',  variante: 'Branco/Branco', tamanho: 'Casal' },
  { codigo: '000326.002.033', ean: '7908966605242', modelo: 'LENÇOL BAMBU MOSSÔ',  variante: 'Branco/Cinza',  tamanho: 'Casal' },
  { codigo: '000326.002.034', ean: '7908966605259', modelo: 'LENÇOL BAMBU MOSSÔ',  variante: 'Branco/Fendi',  tamanho: 'Casal' },
  { codigo: '000326.002.038', ean: '7908966605297', modelo: 'LENÇOL BAMBU MOSSÔ',  variante: 'Cinza/Branco',  tamanho: 'Casal' },
  { codigo: '000326.003.032', ean: '7908966605327', modelo: 'LENÇOL BAMBU MOSSÔ',  variante: 'Branco/Branco', tamanho: 'Queen' },
  { codigo: '000326.003.033', ean: '7908966605334', modelo: 'LENÇOL BAMBU MOSSÔ',  variante: 'Branco/Cinza',  tamanho: 'Queen' },
  { codigo: '000326.003.034', ean: '7908966605341', modelo: 'LENÇOL BAMBU MOSSÔ',  variante: 'Branco/Fendi',  tamanho: 'Queen' },
  { codigo: '000326.003.038', ean: '7908966605389', modelo: 'LENÇOL BAMBU MOSSÔ',  variante: 'Cinza/Branco',  tamanho: 'Queen' },
  { codigo: '000326.004.032', ean: '7908966605419', modelo: 'LENÇOL BAMBU MOSSÔ',  variante: 'Branco/Branco', tamanho: 'King' },
  { codigo: '000326.004.033', ean: '7908966605426', modelo: 'LENÇOL BAMBU MOSSÔ',  variante: 'Branco/Cinza',  tamanho: 'King' },
  { codigo: '000326.004.034', ean: '7908966605433', modelo: 'LENÇOL BAMBU MOSSÔ',  variante: 'Branco/Fendi',  tamanho: 'King' },
  { codigo: '000326.004.038', ean: '7908966605471', modelo: 'LENÇOL BAMBU MOSSÔ',  variante: 'Cinza/Branco',  tamanho: 'King' },

  // LENÇOL BAMBU GUADUA — 000327
  { codigo: '000327.002.032', ean: '7908966605594', modelo: 'LENÇOL BAMBU GUADUA', variante: 'Branco/Branco', tamanho: 'Casal' },
  { codigo: '000327.002.033', ean: '7908966605600', modelo: 'LENÇOL BAMBU GUADUA', variante: 'Branco/Cinza',  tamanho: 'Casal' },
  { codigo: '000327.002.034', ean: '7908966605617', modelo: 'LENÇOL BAMBU GUADUA', variante: 'Branco/Fendi',  tamanho: 'Casal' },
  { codigo: '000327.002.038', ean: '7908966605655', modelo: 'LENÇOL BAMBU GUADUA', variante: 'Cinza/Branco',  tamanho: 'Casal' },
  { codigo: '000327.003.032', ean: '7908966605686', modelo: 'LENÇOL BAMBU GUADUA', variante: 'Branco/Branco', tamanho: 'Queen' },
  { codigo: '000327.003.033', ean: '7908966605693', modelo: 'LENÇOL BAMBU GUADUA', variante: 'Branco/Cinza',  tamanho: 'Queen' },
  { codigo: '000327.003.034', ean: '7908966605709', modelo: 'LENÇOL BAMBU GUADUA', variante: 'Branco/Fendi',  tamanho: 'Queen' },
  { codigo: '000327.003.038', ean: '7908966605747', modelo: 'LENÇOL BAMBU GUADUA', variante: 'Cinza/Branco',  tamanho: 'Queen' },
  { codigo: '000327.004.032', ean: '7908966605778', modelo: 'LENÇOL BAMBU GUADUA', variante: 'Branco/Branco', tamanho: 'King' },
  { codigo: '000327.004.033', ean: '7908966605785', modelo: 'LENÇOL BAMBU GUADUA', variante: 'Branco/Cinza',  tamanho: 'King' },
  { codigo: '000327.004.034', ean: '7908966605792', modelo: 'LENÇOL BAMBU GUADUA', variante: 'Branco/Fendi',  tamanho: 'King' },
  { codigo: '000327.004.038', ean: '7908966605839', modelo: 'LENÇOL BAMBU GUADUA', variante: 'Cinza/Branco',  tamanho: 'King' },

  // LENÇOL CARVALHO — 000328
  { codigo: '000328.002.032', ean: '7908966605952', modelo: 'LENÇOL CARVALHO', variante: 'Branco/Branco', tamanho: 'Casal' },
  { codigo: '000328.002.033', ean: '7908966605969', modelo: 'LENÇOL CARVALHO', variante: 'Branco/Cinza',  tamanho: 'Casal' },
  { codigo: '000328.002.038', ean: '7908966606010', modelo: 'LENÇOL CARVALHO', variante: 'Cinza/Branco',  tamanho: 'Casal' },
  { codigo: '000328.002.042', ean: '7908966606003', modelo: 'LENÇOL CARVALHO', variante: 'Branco/Preto',  tamanho: 'Casal' },
  { codigo: '000328.003.032', ean: '7908966606041', modelo: 'LENÇOL CARVALHO', variante: 'Branco/Branco', tamanho: 'Queen' },
  { codigo: '000328.003.033', ean: '7908966606058', modelo: 'LENÇOL CARVALHO', variante: 'Branco/Cinza',  tamanho: 'Queen' },
  { codigo: '000328.003.038', ean: '7908966606102', modelo: 'LENÇOL CARVALHO', variante: 'Cinza/Branco',  tamanho: 'Queen' },
  { codigo: '000328.003.042', ean: '7908966606096', modelo: 'LENÇOL CARVALHO', variante: 'Branco/Preto',  tamanho: 'Queen' },
  { codigo: '000328.004.038', ean: '7908966606195', modelo: 'LENÇOL CARVALHO', variante: 'Cinza/Branco',  tamanho: 'King' },

  // COLCHA CARVALHO — 000329 — variantes BRANCO/BRANCO e CINZA/CINZA não estão no catálogo
  // (catálogo tem apenas Branco, Bege, Azul, Cinza); guardados aqui pra referência.
  { codigo: '000329.003.032', ean: '7908966606317', modelo: 'COLCHA CARVALHO', variante: 'Branco/Branco', tamanho: 'Queen' },
  { codigo: '000329.003.046', ean: '7908966606348', modelo: 'COLCHA CARVALHO', variante: 'Cinza/Cinza',   tamanho: 'Queen' },
  { codigo: '000329.004.032', ean: '7908966606355', modelo: 'COLCHA CARVALHO', variante: 'Branco/Branco', tamanho: 'King' },
  { codigo: '000329.004.046', ean: '7908966606386', modelo: 'COLCHA CARVALHO', variante: 'Cinza/Cinza',   tamanho: 'King' },
  { codigo: '000329.010.032', ean: '7908966606393', modelo: 'COLCHA CARVALHO', variante: 'Branco/Branco', tamanho: 'Super King' },
  { codigo: '000329.010.046', ean: '7908966606423', modelo: 'COLCHA CARVALHO', variante: 'Cinza/Cinza',   tamanho: 'Super King' },

  // LENÇOL BAMBU 300TC — 000280 (cadastrado na Magazord como JG-LENC-280)
  { codigo: '000280.002.001', ean: '7908966606638', modelo: 'LENÇOL BAMBU 300TC', variante: 'Branco', tamanho: 'Casal' },
  { codigo: '000280.002.003', ean: '7908966606669', modelo: 'LENÇOL BAMBU 300TC', variante: 'Cinza',  tamanho: 'Casal' },
  { codigo: '000280.003.001', ean: '7908966606676', modelo: 'LENÇOL BAMBU 300TC', variante: 'Branco', tamanho: 'Queen' },
  { codigo: '000280.003.003', ean: '7908966606706', modelo: 'LENÇOL BAMBU 300TC', variante: 'Cinza',  tamanho: 'Queen' },
  { codigo: '000280.004.001', ean: '7908966606713', modelo: 'LENÇOL BAMBU 300TC', variante: 'Branco', tamanho: 'King' },
  { codigo: '000280.004.003', ean: '7908966606744', modelo: 'LENÇOL BAMBU 300TC', variante: 'Cinza',  tamanho: 'King' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function norm(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toUpperCase()
}

/** Normaliza desenho pra "NN" (zfill 2). Aceita "1", "01", "1,2" → ignora aqui. */
function normDesenho(d: string): string {
  const m = (d || '').match(/\d+/)
  if (!m) return ''
  return m[0].padStart(2, '0')
}

/**
 * Busca o código Tellaio de um tapete por (coleção, tamanho, desenho).
 * Retorna o objeto completo com EAN ou null se não encontrar.
 */
export function findCodigoTapete(
  colecao: string, tamanho: string, desenho: string,
): CodigoTapeteTellaio | null {
  const c = norm(colecao)
  const t = norm(tamanho)
  const d = normDesenho(desenho)
  return CODIGOS_TAPETES.find(
    x => norm(x.colecao) === c && norm(x.tamanho) === t && normDesenho(x.desenho) === d,
  ) ?? null
}

/**
 * Busca o código Tellaio de uma cama por (modelo, variante, tamanho).
 * Retorna o objeto completo com EAN ou null se não encontrar.
 */
export function findCodigoCama(
  modelo: string, variante: string, tamanho: string,
): CodigoCamaTellaio | null {
  const m = norm(modelo)
  const v = norm(variante)
  const t = norm(tamanho)
  return CODIGOS_CAMAS.find(
    x => norm(x.modelo) === m && norm(x.variante) === v && norm(x.tamanho) === t,
  ) ?? null
}

/** Busca o código Tellaio pelo EAN/GTIN (útil pra cruzar com NF). */
export function findByEAN(ean: string): CodigoTapeteTellaio | CodigoCamaTellaio | null {
  if (!ean) return null
  return (
    CODIGOS_TAPETES.find(x => x.ean === ean) ??
    CODIGOS_CAMAS.find(x => x.ean === ean) ??
    null
  )
}

/** Busca pelo código bruto Tellaio (ex: '000218.006.002'). */
export function findByCodigo(codigo: string): CodigoTapeteTellaio | CodigoCamaTellaio | null {
  if (!codigo) return null
  return (
    CODIGOS_TAPETES.find(x => x.codigo === codigo) ??
    CODIGOS_CAMAS.find(x => x.codigo === codigo) ??
    null
  )
}
