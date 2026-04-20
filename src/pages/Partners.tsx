import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, Plus, Phone, Mail, MapPin, X, Filter, Check, Trash2, Edit2, ChevronDown } from 'lucide-react'

interface Partner {
  id: number
  nome: string
  tipo: string
  subtipo: string
  contato: string
  email: string
  telefone: string
  cidade: string
  ativo: boolean
}

const INITIAL_PARTNERS: Partner[] = [
  { id: 101, nome: '49.513.056 PATRICIA KUBAL CRISTOFOLINI', tipo: 'Transportadora', subtipo: 'CNPJ: 49.513.056/0001-39', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 102, nome: '5R - BLUMENAU', tipo: 'Transportadora', subtipo: 'CNPJ: 05.761.444/0001-63', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 103, nome: 'ACEVILLE TRANSPORTES LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 81.560.047/0001-01', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 104, nome: 'AGIL LOG TRANSPORTES LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 62.773.073/0001-73', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 105, nome: 'ALFA TRANSPORTES LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 82.110.818/0002-02', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 106, nome: 'ARLETE TRANSPORTES E LOGISTICA', tipo: 'Transportadora', subtipo: 'CNPJ: 72.090.442/0001-87', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 107, nome: 'ASAP LOG', tipo: 'Transportadora', subtipo: 'CNPJ: 04.221.023/0013-10', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 108, nome: 'ATUAL CARGAS TRANSPORTES LTDA (SP - OSASCO)', tipo: 'Transportadora', subtipo: 'CNPJ: 08.848.231/0002-42', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 109, nome: 'G2J CARGAS E TRANSPORTES LTDA (AZUL CARGO)', tipo: 'Transportadora', subtipo: 'CNPJ: 38.185.255/0001-49', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 110, nome: 'AZUL LINHAS AEREAS BRASILEIRAS S/A', tipo: 'Transportadora', subtipo: 'CNPJ: 09.296.295/0001-60', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 111, nome: 'B. TRANSPORTES LTDA (BAUER TRANSPORTES)', tipo: 'Transportadora', subtipo: 'CNPJ: 04.353.469/0001-65', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 112, nome: 'BELLA & CO. LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 72.344.591/0001-25', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 113, nome: 'BRASIL EMBALAGENS LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 00.107.079/0001-54', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 114, nome: 'BRASPRES TRANSPORTES URGENTES LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 48.740.351/0001-65', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 115, nome: 'METAR LOGISTICA LTDA (BUSLOG)', tipo: 'Transportadora', subtipo: 'CNPJ: 10.992.167/0001-30', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 116, nome: 'CASA LINDA COMERCIO LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 37.515.568/0001-55', contato: 'N/A', email: '', telefone: '(47) 9609-1848', cidade: '', ativo: true },
  { id: 117, nome: 'CONEXAO TRANSPORTES E LOGISTICA LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 50.160.966/0001-64', contato: 'N/A', email: '', telefone: '(11) 3578-0490', cidade: '', ativo: true },
  { id: 118, nome: 'DAYTONA EXPRESS SERVIÇOS', tipo: 'Transportadora', subtipo: 'CNPJ: 00.580.312/0005-45', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 119, nome: 'DESTAK LOGISTICA E TRANSPORTES LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 05.813.363/0001-60', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 120, nome: 'Disk e Tenha Ltda Me', tipo: 'Transportadora', subtipo: 'CNPJ: 02.255.335/0001-86', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 121, nome: 'DUAL GLASS VIDRACARIA LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 44.605.631/0001-00', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 122, nome: 'EBAZAR.COM.BR LTDA (39)', tipo: 'Transportadora', subtipo: 'CNPJ: 03.007.331/0122-39', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 123, nome: 'EBAZAR.COM.BR LTDA. (41)', tipo: 'Transportadora', subtipo: 'CNPJ: 03.007.331/0001-41', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 124, nome: 'ECT - EMPRESA BRASILEIRA DE CORREIOS (09)', tipo: 'Transportadora', subtipo: 'CNPJ: 34.028.316/0953-09', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 125, nome: 'EDSON LUIZZ SETT DE ARAUJO', tipo: 'Transportadora', subtipo: '', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 126, nome: 'ELEGANCE INDUSTRIA E COM DE MOLDURAS', tipo: 'Transportadora', subtipo: 'CNPJ: 11.372.192/0001-83', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 127, nome: 'EMPRESA BRASILEIRA DE CORREIOS (01)', tipo: 'Transportadora', subtipo: 'CNPJ: 34.028.316/2047-01', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 128, nome: 'ENTREGA CORREA FROTA PROPRIA CD', tipo: 'Transportadora', subtipo: 'CNPJ: 45.947.853/0001-73', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 129, nome: 'EXPRESSO MILLES LOGISTICA', tipo: 'Transportadora', subtipo: 'CNPJ: 45.830.855/0002-69', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 130, nome: 'EXPRESSO SAO MIGUEL S/A (89)', tipo: 'Transportadora', subtipo: 'CNPJ: 00.428.307/0010-89', contato: 'N/A', email: '', telefone: '(47) 3451-3800', cidade: '', ativo: true },
  { id: 131, nome: 'EXPRESSO SAO MIGUEL (11)', tipo: 'Transportadora', subtipo: 'CNPJ: 00.428.307/0005-11', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 132, nome: 'EXPRESSO SAO MIGUEL LTDA (79)', tipo: 'Transportadora', subtipo: 'CNPJ: 00.428.307/0002-79', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 133, nome: 'EXPRESSO SAOMIGUEL LTDA (93)', tipo: 'Transportadora', subtipo: 'CNPJ: 00.428.307/0015-93', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 134, nome: 'FEDEX BRASIL LOGISTICA', tipo: 'Transportadora', subtipo: 'CNPJ: 10.970.887/0052-44', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 135, nome: 'L F DE SOUZA LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 07.401.114/0005-16', contato: 'N/A', email: '', telefone: '(43) 3154-8943', cidade: '', ativo: true },
  { id: 136, nome: 'FB TECNOLOGIA LOGISTICA LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 54.958.729/0001-02', contato: 'N/A', email: '', telefone: '(47) 3521-7779', cidade: '', ativo: true },
  { id: 137, nome: 'GSM. ECOMM LOGISTICA', tipo: 'Transportadora', subtipo: 'CNPJ: 54.179.796/0001-10', contato: 'N/A', email: '', telefone: '(11) 4285-3084', cidade: '', ativo: true },
  { id: 138, nome: 'J&T EXPRESS BRAZIL LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 42.584.754/0001-86', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 139, nome: 'J.M.SOUSA TRANSPORTES EPP', tipo: 'Transportadora', subtipo: 'CNPJ: 06.199.249/0001-54', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 140, nome: 'JADLOG LOGISTICA S.A', tipo: 'Transportadora', subtipo: 'CNPJ: 04.884.082/0001-35', contato: 'N/A', email: '', telefone: '(11) 3105-4827', cidade: '', ativo: true },
  { id: 141, nome: 'JAMEF TRANSPORTES EIRELI', tipo: 'Transportadora', subtipo: 'CNPJ: 20.147.617/0001-41', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 142, nome: 'LIGEI REX TRANSPORTES LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 33.907.996/0001-72', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 143, nome: 'LOGDI', tipo: 'Transportadora', subtipo: 'CNPJ: 67.915.785/0001-01', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 144, nome: 'L4B Logistica LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 24.217.653/0001-95', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 145, nome: 'LUCIANO MANOEL CRISTOFOLINI', tipo: 'Transportadora', subtipo: 'CNPJ: 15.457.676/0001-86', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 146, nome: 'MAGALU LOG', tipo: 'Transportadora', subtipo: '', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 147, nome: 'MAGRI & LIMA LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 73.683.021/0001-22', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 148, nome: 'MELHOR ENVIO LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 02.351.877/0013-96', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 149, nome: 'MENGUE EXPRESS EIRELI EPP', tipo: 'Transportadora', subtipo: 'CNPJ: 10.700.543/0001-75', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 150, nome: 'MIR TRANSPORTES (89)', tipo: 'Transportadora', subtipo: 'CNPJ: 03.565.095/0001-89', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 151, nome: 'MIR TRANSPORTES (21)', tipo: 'Transportadora', subtipo: 'CNPJ: 03.565.095/0004-21', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 152, nome: 'MULTINOVA IND DE EMBALAGENS PLASTICAS LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 92.475.250/0005-20', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 153, nome: 'AML TECNOLOGIA EM TRANSPORTES EIRELI ME', tipo: 'Transportadora', subtipo: 'CNPJ: 13.819.724/0001-03', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 154, nome: 'O EMITENTE', tipo: 'Transportadora', subtipo: 'CNPJ: 78.515.624/0001-39', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 155, nome: 'O MESMO', tipo: 'Transportadora', subtipo: 'CNPJ: 07.367.641/0001-28', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 156, nome: 'T MOREIRA TRANSPORTES LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 40.848.141/0001-83', contato: 'N/A', email: '', telefone: '(47) 4104-0122', cidade: '', ativo: true },
  { id: 157, nome: 'PROPRIO', tipo: 'Transportadora', subtipo: '', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 158, nome: 'QUALITPLACAS MDF E ACESSORIOS PARA MOVEIS LTD', tipo: 'Transportadora', subtipo: '', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 159, nome: 'RAPIDO BOTASSARI LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 51.460.559/0002-16', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 160, nome: 'RDU PRODUTOS PARA COMUNICACAO VISUAL LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 15.502.632/0004-73', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 161, nome: 'RETIRA', tipo: 'Transportadora', subtipo: '', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 162, nome: 'RODONAVES TRANSPORTES E ENCOMENDAS LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 44.914.992/0001-38', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 163, nome: 'Rudolf Embalagens Ltda', tipo: 'Transportadora', subtipo: 'CNPJ: 03.028.422/0001-63', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 164, nome: 'S.E COMERCIO DE MADEIRAS LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 00.334.509/0001-70', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 165, nome: 'SCHREIBER LOGISTICA LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 10.349.430/0001-77', contato: 'N/A', email: '', telefone: '(47) 3521-1313', cidade: '', ativo: true },
  { id: 166, nome: 'Sem Frete', tipo: 'Transportadora', subtipo: '', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 167, nome: 'SERILON BRASIL LTDA SANTA CATAR', tipo: 'Transportadora', subtipo: 'CNPJ: 04.143.008/0040-74', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 168, nome: 'SHIPSMART TECNOLOGIA LTDA - ME', tipo: 'Transportadora', subtipo: 'CNPJ: 28.575.809/0001-60', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 169, nome: 'SMART2C TRANSPORTES E LOGISTICA LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 42.546.699/0001-30', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 170, nome: 'TEDE TRANSPORTES LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 02.484.555/0010-72', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 171, nome: 'TEM TRANSPORTES ESTRELA MARES LTDA EPP', tipo: 'Transportadora', subtipo: 'CNPJ: 08.435.561/0001-25', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 172, nome: 'TOTAL EXPRESS', tipo: 'Transportadora', subtipo: 'CNPJ: 73.939.449/0001-93', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 173, nome: 'TRANSBEN TRANSPORTES LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 03.523.549/0003-10', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 174, nome: 'TRANSPORTADORA SOUZA AMERICANA LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 50.773.191/0001-00', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 175, nome: 'TRANSPORTES BRUSVILLE LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 79.818.746/0001-67', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 176, nome: 'TRANSPORTES GMR LTDA EPP', tipo: 'Transportadora', subtipo: 'CNPJ: 10.821.041/0001-00', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 177, nome: 'TRANSPORTES OURO NEGRO LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 04.195.643/0001-99', contato: 'N/A', email: '', telefone: '(48) 3461-4466', cidade: '', ativo: true },
  { id: 178, nome: 'TRANSPORTES TRANSLOVATO LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 89.823.918/0006-59', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 179, nome: 'TW TRANSPORTES E LOGISTICA LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 89.317.697/0018-80', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 180, nome: 'TW TRANSPS E LOGISTICA LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 89.317.697/0050-10', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 181, nome: 'UPS DO BRASIL REMESSAS EXPRESSAS LTDA.', tipo: 'Transportadora', subtipo: 'CNPJ: 74.155.052/0002-54', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 182, nome: 'VALEPLAST EMBALAGENS LTDA', tipo: 'Transportadora', subtipo: 'CNPJ: 43.048.572/0001-53', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 183, nome: 'VP LOG TRANSPORTES E LOGISTICA', tipo: 'Transportadora', subtipo: 'CNPJ: 35.577.850/0002-12', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
  { id: 184, nome: 'VS SUPRIMENTOS PARA COMUNICACAO VISUAL S/A (SC)', tipo: 'Transportadora', subtipo: 'CNPJ: 04.187.580/0004-71', contato: 'N/A', email: '', telefone: '', cidade: '', ativo: true },
]

const TIPOS = ['TODOS', 'Fornecedor', 'Serviço', 'Transportadora']

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl text-sm"
    >
      <Check size={16} className="text-green-400 shrink-0" />
      {msg}
      <button onClick={onClose} className="ml-2 text-gray-400 hover:text-white"><X size={14} /></button>
    </motion.div>
  )
}

function DetailModal({ partner, onClose, onToggle, onDelete }: {
  partner: Partner; onClose: () => void; onToggle: () => void; onDelete: () => void
}) {
  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h3 className="font-bold text-gray-900">{partner.nome}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{partner.tipo} · {partner.subtipo}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={partner.ativo ? 'badge badge-ativo' : 'badge badge-inativo'}>
              {partner.ativo ? 'ATIVO' : 'INATIVO'}
            </span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">CONTATO</p>
              <p className="text-sm font-semibold text-gray-800">{partner.contato}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">CIDADE</p>
              <p className="text-sm font-semibold text-gray-800">{partner.cidade}</p>
            </div>
          </div>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Mail size={16} className="text-gray-400 shrink-0" />
              <a href={`mailto:${partner.email}`} className="hover:text-navy-900 transition-colors">{partner.email}</a>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Phone size={16} className="text-gray-400 shrink-0" />
              <a href={`tel:${partner.telefone}`} className="hover:text-navy-900 transition-colors">{partner.telefone}</a>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <MapPin size={16} className="text-gray-400 shrink-0" />
              <span>{partner.cidade}</span>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => { onDelete(); onClose() }}
              className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors">
              <Trash2 size={14} /> Remover
            </button>
            <button onClick={() => { onToggle(); onClose() }} className="btn-secondary flex-1 justify-center">
              <Edit2 size={14} /> {partner.ativo ? 'Desativar' : 'Reativar'}
            </button>
            <button
              onClick={() => { window.open(`mailto:${partner.email}`); onClose() }}
              className="btn-primary flex-1 justify-center"
            >
              <Mail size={14} /> Enviar E-mail
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Partners() {
  const [partners, setPartners] = useState(INITIAL_PARTNERS)
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(false)
  const [detail, setDetail]     = useState<Partner | null>(null)
  const [toast, setToast]       = useState<string | null>(null)
  const [tipoFilter, setTipoFilter] = useState('TODOS')
  const [showFilter, setShowFilter] = useState(false)
  const [form, setForm] = useState({ nome: '', tipo: 'Fornecedor', subtipo: '', contato: '', email: '', telefone: '', cidade: '' })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const filtered = partners.filter(p =>
    (tipoFilter === 'TODOS' || p.tipo === tipoFilter) &&
    (p.nome.toLowerCase().includes(search.toLowerCase()) ||
     p.contato.toLowerCase().includes(search.toLowerCase()) ||
     p.tipo.toLowerCase().includes(search.toLowerCase()))
  )

  const handleSave = () => {
    if (!form.nome || !form.contato) return
    setPartners(prev => [...prev, { id: Date.now(), ...form, ativo: true }])
    setModal(false)
    setForm({ nome: '', tipo: 'Fornecedor', subtipo: '', contato: '', email: '', telefone: '', cidade: '' })
    showToast(`Parceiro "${form.nome}" cadastrado com sucesso!`)
  }

  const togglePartner = (id: number) => {
    const p = partners.find(x => x.id === id)
    setPartners(prev => prev.map(x => x.id === id ? { ...x, ativo: !x.ativo } : x))
    showToast(p?.ativo ? `"${p?.nome}" desativado.` : `"${p?.nome}" reativado!`)
  }

  const deletePartner = (id: number) => {
    const p = partners.find(x => x.id === id)
    setPartners(prev => prev.filter(x => x.id !== id))
    showToast(`"${p?.nome}" removido dos parceiros.`)
  }

  return (
    <div className="p-6 space-y-5" onClick={() => setShowFilter(false)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parceiros</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestão de fornecedores, prestadores de serviço e parceiros estratégicos da Casa Linda.</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary"><Plus size={14} /> Novo Parceiro</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total de Parceiros', value: partners.length,                        onClick: () => setTipoFilter('TODOS') },
          { label: 'Parceiros Ativos',   value: partners.filter(p => p.ativo).length,   onClick: () => setTipoFilter('TODOS') },
          { label: 'Inativos',           value: partners.filter(p => !p.ativo).length,  onClick: () => {} },
        ].map(s => (
          <div key={s.label} className="stat cursor-pointer hover:shadow-lg transition-shadow" onClick={s.onClick}>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-1 font-medium uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
        <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-full">
          <Search size={14} className="text-gray-400" />
          <input
            className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none flex-1"
            placeholder="Buscar por nome, categoria ou contato..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')}><X size={14} className="text-gray-400 hover:text-gray-700" /></button>}
        </div>
        <div className="relative w-full sm:w-auto">
          <button
            onClick={e => { e.stopPropagation(); setShowFilter(v => !v) }}
            className="btn-secondary text-xs py-2 w-full sm:w-auto justify-center"
          >
            <Filter size={12} /> {tipoFilter} <ChevronDown size={11} />
          </button>
          <AnimatePresence>
            {showFilter && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden min-w-max">
                {TIPOS.map(t => (
                  <button key={t} onClick={e => { e.stopPropagation(); setTipoFilter(t); setShowFilter(false) }}
                    className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 ${tipoFilter === t ? 'font-bold text-navy-900' : 'text-gray-700'}`}>
                    {t}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.04 }}
              className="card p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <span className={p.ativo ? 'badge badge-ativo' : 'badge badge-inativo'}>
                  {p.ativo ? 'ATIVO' : 'INATIVO'}
                </span>
              </div>

              <h3 className="font-bold text-gray-900">{p.nome}</h3>
              <p className="text-xs text-gray-500 mb-3">{p.tipo} · {p.subtipo}</p>

              <div className="space-y-1.5 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <Mail size={12} className="text-gray-400 shrink-0" />
                  <a href={`mailto:${p.email}`} className="hover:text-navy-900 transition-colors truncate">{p.email}</a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={12} className="text-gray-400 shrink-0" />
                  <span>{p.telefone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={12} className="text-gray-400 shrink-0" />
                  <span>{p.cidade}</span>
                </div>
              </div>

              <button
                onClick={() => setDetail(p)}
                className="mt-4 w-full py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-navy-900/20 hover:text-navy-900 transition-all"
              >
                VER DETALHES
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-12 text-gray-400">
            <p className="font-medium">Nenhum parceiro encontrado.</p>
            <p className="text-xs mt-1">Tente ajustar os filtros ou cadastre um novo.</p>
          </div>
        )}
      </div>

      {/* New partner modal */}
      <AnimatePresence>
        {modal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModal(false)}>
            <motion.div className="modal" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <div>
                  <h3 className="font-bold text-gray-900">Cadastrar Novo Parceiro</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Preencha os dados do fornecedor ou prestador de serviço.</p>
                </div>
                <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nome / Razão Social *</label>
                  <input className="input" placeholder="Ex: Decora Mais Ltda." value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                    <select className="input" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                      {['Fornecedor', 'Serviço', 'Transportadora'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Especialidade</label>
                    <input className="input" placeholder="Ex: Tecidos, Molduras" value={form.subtipo} onChange={e => setForm(f => ({ ...f, subtipo: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nome do Contato *</label>
                  <input className="input" placeholder="Nome do responsável" value={form.contato} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">E-mail</label>
                    <input className="input" type="email" placeholder="contato@empresa.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Telefone</label>
                    <input className="input" placeholder="(11) 9xxxx-xxxx" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Cidade / Estado</label>
                  <input className="input" placeholder="Ex: São Paulo, SP" value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                  <button onClick={handleSave} className="btn-primary flex-1 justify-center">Cadastrar</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {detail && (
          <DetailModal
            partner={detail}
            onClose={() => setDetail(null)}
            onToggle={() => togglePartner(detail.id)}
            onDelete={() => deletePartner(detail.id)}
          />
        )}

        {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}
