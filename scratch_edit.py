import sys

file_path = r'scratch\ProductionLV.tsx'
try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Add estoqueFilter state
    old_state = "const [view, setView]                 = useState<ViewMode>('kanban')"
    new_state = old_state + "\n  const [estoqueFilter, setEstoqueFilter] = useState<string>('Todos')"
    if old_state in content:
        content = content.replace(old_state, new_state)
    else:
        print('Could not find old_state')

    # 2. Add print function
    print_fn = """
  const handlePrintEstoque = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;
    let html = '<html><head><title>Relatório de Estoque</title><style>body { font-family: sans-serif; padding: 20px; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f2f2f2; } h2 { color: #333; margin-top: 30px; }</style></head><body>';
    html += '<h1>Relatório de Estoque (Lar e Vida)</h1>';
    html += '<p>Data: ' + new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR') + '</p>';
    
    const prateleira = board['Em Prateleira'];
    const transito = [...board['Pedido ao Fornecedor'], ...board['Aguardando Chegada'], ...board['Novos Pedidos'].filter(o => o.tipoPedido === 'estoque')];
    
    html += '<h2>Em Prateleira (' + prateleira.length + ')</h2>';
    if(prateleira.length === 0) html += '<p>Nenhum item em prateleira.</p>';
    else {
      html += '<table><tr><th>Produto</th><th>Categoria</th><th>Tamanho</th></tr>';
      prateleira.forEach(o => html += '<tr><td>' + o.produto + '</td><td>' + (o.categoria || '-') + '</td><td>' + (o.tamanho || '-') + '</td></tr>');
      html += '</table>';
    }

    html += '<h2>Em Trânsito (' + transito.length + ')</h2>';
    if(transito.length === 0) html += '<p>Nenhum item em trânsito.</p>';
    else {
      html += '<table><tr><th>Produto</th><th>Categoria</th><th>Tamanho</th><th>Etapa</th></tr>';
      transito.forEach(o => {
        let etapa = 'Novos Pedidos';
        if (board['Pedido ao Fornecedor'].some(x => x.id === o.id)) etapa = 'Pedido ao Fornecedor';
        if (board['Aguardando Chegada'].some(x => x.id === o.id)) etapa = 'Aguardando Chegada';
        html += '<tr><td>' + o.produto + '</td><td>' + (o.categoria || '-') + '</td><td>' + (o.tamanho || '-') + '</td><td>' + etapa + '</td></tr>'
      });
      html += '</table>';
    }
    
    html += '<h2>Sugestões de Reposição</h2><p>As sugestões são baseadas na análise entre estoque real e histórico de vendas.</p>';

    html += '</body></html>';
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  }

  const handleAutoProcess = async () => {
    if(!window.confirm('Iniciar processamento automático? Isso irá cruzar Novos Pedidos de clientes com o que está Em Prateleira.')) return;
    
    const nextBoard = { ...board }
    Object.keys(nextBoard).forEach(k => nextBoard[k as Stage] = [...board[k as Stage]])
    
    let processados = 0;
    let semEstoque = 0;
    
    const novosClientes = [...nextBoard['Novos Pedidos']].filter(o => o.tipoPedido !== 'estoque')
    
    for (const pedido of novosClientes) {
      // Find match in Em Prateleira
      const pNome = pedido.produto.toLowerCase()
      const pTam = pedido.tamanho || ''
      const matchIndex = nextBoard['Em Prateleira'].findIndex(o => {
          const mNome = o.produto.toLowerCase();
          const matchesName = mNome.includes(pNome) || pNome.includes(mNome);
          const matchesTam = pTam ? o.tamanho === pTam : true;
          return matchesName && matchesTam;
      })
      
      if (matchIndex >= 0) {
        // We have a match! Deduct from Prateleira
        const matchedItem = nextBoard['Em Prateleira'].splice(matchIndex, 1)[0]
        // Move customer order to Embalagem
        nextBoard['Novos Pedidos'] = nextBoard['Novos Pedidos'].filter(o => o.id !== pedido.id)
        nextBoard['Embalagem'] = [{...pedido, status: 'OK' as const, obs: (pedido.obs || '') + '\\n[AUTO] Estoque baixado: ' + matchedItem.id}, ...nextBoard['Embalagem']]
        
        if (matchedItem.id && !matchedItem.id.startsWith('mzlv-')) await deletePedidoLV(matchedItem.id)
        if (pedido.id && !pedido.id.startsWith('mzlv-')) await movePedidoLVEtapa(pedido.id, 'Embalagem')
        
        processados++
      } else {
        // No match! Move to Pedido ao Fornecedor
        nextBoard['Novos Pedidos'] = nextBoard['Novos Pedidos'].filter(o => o.id !== pedido.id)
        nextBoard['Pedido ao Fornecedor'] = [{...pedido, status: 'Pendente' as const, obs: (pedido.obs || '') + '\\n[AUTO] Falta Estoque, enviado ao Fornecedor'}, ...nextBoard['Pedido ao Fornecedor']]
        
        if (pedido.id && !pedido.id.startsWith('mzlv-')) await movePedidoLVEtapa(pedido.id, 'Pedido ao Fornecedor')
        
        semEstoque++
      }
    }
    
    setBoard(nextBoard)
    showToast(`✅ ${processados} pedidos tiveram baixa automática no estoque! ${semEstoque} sem estoque foram para fornecedor.`)
  }
"""
    if "const showToast = " in content:
        content = content.replace("const showToast = ", print_fn + "\n  const showToast = ")
    else:
        print('Could not find showToast')

    # 3. Add filters UI and print button to Estoque View
    summary_start = "          {/* Summary bar */}"
    filters_ui = """
          {/* Ações Estoque */}
          <div className="flex items-center justify-between px-4 pt-3">
            <div className="flex gap-2">
              {['Todos', 'Tapete', 'Cama', 'Cortina', 'Almofada', 'Quadro'].map(f => (
                <button key={f} onClick={() => setEstoqueFilter(f)} className={`px-3 py-1 rounded-full text-xs font-semibold border ${estoqueFilter === f ? 'bg-cyan-600 text-white border-cyan-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  {f}
                </button>
              ))}
            </div>
            <button onClick={handlePrintEstoque} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-white text-xs font-semibold hover:bg-gray-900 transition-colors">
              <Printer size={14} /> Imprimir Relatório
            </button>
          </div>
"""
    if summary_start in content:
        content = content.replace(summary_start, filters_ui + "\n" + summary_start)
    else:
        print('Could not find Summary bar')

    # 4. Filter Estoque board rendering
    old_orders = "const orders = board[stage].filter(o => o.tipoPedido === 'estoque')"
    new_orders = "const orders = board[stage].filter(o => o.tipoPedido === 'estoque' && (estoqueFilter === 'Todos' || o.categoria === estoqueFilter || (estoqueFilter === 'Tapete' && o.produto.toLowerCase().includes('tapete')) || (estoqueFilter === 'Cama' && (o.produto.toLowerCase().includes('cama') || o.produto.toLowerCase().includes('edredom')))))"
    if old_orders in content:
        content = content.replace(old_orders, new_orders)
    else:
        print('Could not find old_orders')

    # 5. Add Auto-process button in Novos Pedidos (Kanban view)
    old_magazord_badge = "{syncing && <RefreshCw size={10} className=\"text-violet-400 ml-auto animate-spin\" />}\n                  </div>\n                )}"
    auto_button = "\n                  <button onClick={handleAutoProcess} className=\"mx-2 mb-2 flex items-center justify-center gap-1.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[10px] font-bold uppercase transition-colors\"><RefreshCw size={12}/> Auto-Processar Fila</button>"
    
    if old_magazord_badge in content:
        content = content.replace(old_magazord_badge, old_magazord_badge + auto_button)
    else:
        print('Could not find old_magazord_badge')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print('Done.')
except Exception as e:
    print('Error:', e)
