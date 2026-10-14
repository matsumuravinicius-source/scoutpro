import React from 'react';

export default function AbaAnalise({
  FilterComponent, handleSaveCustomMetric, novaMetrica, setNovaMetrica,
  TODAS_ACOES, savedMetrics, selectedMetricId, setSelectedMetricId,
  handleDeleteCustomMetric, getAnalyzedPlayers, calculateCustomMetric
}) {
  
  const analyzedPlayers = getAnalyzedPlayers() || [];
  const selectedMetricObj = savedMetrics?.find(m => m.id === selectedMetricId);

  return (
    <div className="space-y-6">
      {FilterComponent}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* === LADO ESQUERDO: SELEÇÃO E CRIAÇÃO DE MÉTRICAS === */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* SELEÇÃO RÁPIDA (Métricas Guardadas) */}
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-blue-400">⚡ Seleção Rápida</h3>
            {savedMetrics && savedMetrics.length > 0 ? (
              <div className="space-y-3">
                <select 
                  value={selectedMetricId || ''} 
                  onChange={(e) => setSelectedMetricId(e.target.value)}
                  className="w-full p-3 bg-gray-950 border border-gray-700 rounded-lg text-white outline-none focus:border-blue-500 font-bold"
                >
                  <option value="" disabled>Escolha uma métrica...</option>
                  {savedMetrics.map(m => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
                
                {selectedMetricId && (
                  <button 
                    onClick={() => handleDeleteCustomMetric(selectedMetricId)}
                    className="w-full py-2 bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white font-bold rounded-lg transition text-sm"
                  >
                    🗑️ Remover Métrica Atual
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nenhuma métrica salva ainda. Crie a primeira abaixo!</p>
            )}
          </div>

          {/* CRIAR NOVA MÉTRICA */}
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-green-400">🛠️ Cruzamento de Dados</h3>
            <form onSubmit={handleSaveCustomMetric} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Fórmula</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ex: Eficácia de Remate"
                  value={novaMetrica?.nome || ''} 
                  onChange={e => setNovaMetrica(prev => ({...prev, nome: e.target.value}))} 
                  className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-700 outline-none text-sm focus:border-green-500 text-white font-bold" 
                />
              </div>
              
              <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 flex flex-col gap-2">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Numerador (Dividir isto...)</label>
                  <select 
                    required 
                    value={novaMetrica?.numerador || ''} 
                    onChange={e => setNovaMetrica(prev => ({...prev, numerador: e.target.value}))} 
                    className="w-full p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none focus:border-green-500 text-blue-300"
                  >
                    <option value="">Selecione...</option>
                    {TODAS_ACOES?.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
                
                <div className="text-center text-gray-600 font-black text-xl my-1">÷</div>
                
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Denominador (...por isto)</label>
                  <select 
                    required 
                    value={novaMetrica?.denominador || ''} 
                    onChange={e => setNovaMetrica(prev => ({...prev, denominador: e.target.value}))} 
                    className="w-full p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none focus:border-green-500 text-orange-300"
                  >
                    <option value="">Selecione...</option>
                    {TODAS_ACOES?.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-black rounded-lg transition shadow-lg shadow-green-900/20">
                Salvar e Analisar
              </button>
            </form>
          </div>
        </div>

        {/* === LADO DIREITO: TABELA DE RESULTADOS === */}
        <div className="lg:col-span-2">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 shadow-xl h-full">
            <h3 className="text-xl font-bold mb-2">
              {selectedMetricObj ? `Tabela de Análise: ${selectedMetricObj.nome}` : 'Aguardando Seleção...'}
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              {selectedMetricObj ? (
                // O "?" de proteção (optional chaining) que evita a Tela Branca!
                <>Fórmula: <strong className="text-blue-400">{TODAS_ACOES?.find(a => a.id === selectedMetricObj.numerador)?.nome || selectedMetricObj.numerador}</strong> a dividir por <strong className="text-orange-400">{TODAS_ACOES?.find(a => a.id === selectedMetricObj.denominador)?.nome || selectedMetricObj.denominador}</strong></>
              ) : 'Selecione uma métrica na aba ao lado ou crie uma nova para visualizar os dados cruzados.'}
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-sm">
                    <th className="p-3">Pos.</th>
                    <th className="p-3">Atleta</th>
                    <th className="p-3">Clube</th>
                    <th className="p-3 text-right text-green-400 font-bold">Índice Alcançado</th>
                  </tr>
                </thead>
                <tbody>
                  {!selectedMetricObj ? (
                    <tr><td colSpan="4" className="p-8 text-center text-gray-600 font-bold border border-gray-800 border-dashed rounded-lg mt-4">Pronto para processar dados.</td></tr>
                  ) : analyzedPlayers.length === 0 ? (
                    <tr><td colSpan="4" className="p-8 text-center text-gray-500">Nenhum atleta encontrado com as estatísticas desta fórmula ou filtros aplicados.</td></tr>
                  ) : (
                    analyzedPlayers.map((player, index) => {
                      const result = calculateCustomMetric(player, selectedMetricObj);
                      // Se o resultado for 0, não poluimos a tabela (apenas mostramos quem tem estatística)
                      if (result === 0 || result === "0.000") return null; 
                      
                      return (
                        <tr key={player.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition">
                          <td className="p-3 text-gray-500 font-mono font-bold">#{index + 1}</td>
                          <td className="p-3 font-bold">
                            {player.nome} 
                            <span className="text-[10px] text-gray-500 block mt-1 uppercase tracking-wider">{player.setor}</span>
                          </td>
                          <td className="p-3 text-gray-400 text-sm">{player.time_nome}</td>
                          <td className="p-3 text-right font-mono text-green-400 font-bold text-lg">{result}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}