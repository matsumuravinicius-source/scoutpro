import React from 'react';

export default function AbaAnalise({
  FilterComponent, handleSaveCustomMetric, novaMetrica, setNovaMetrica, TODAS_ACOES,
  savedMetrics, selectedMetricId, setSelectedMetricId, handleDeleteCustomMetric,
  getAnalyzedPlayers, calculateCustomMetric
}) {
  return (
    <div className="space-y-6">
      {FilterComponent}
      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl">
        <h2 className="text-2xl font-bold mb-2">Criar Cruzamento de Dados</h2>
        <form onSubmit={handleSaveCustomMetric} className="flex flex-col md:flex-row gap-4 items-center">
          <input type="text" placeholder="Nome (Ex: Golos/Minuto)" required value={novaMetrica.nome} onChange={e => setNovaMetrica({...novaMetrica, nome: e.target.value})} className="flex-1 p-3 bg-gray-950 rounded-lg border border-gray-700 text-sm w-full" />
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select required value={novaMetrica.numerador} onChange={e => setNovaMetrica({...novaMetrica, numerador: e.target.value})} className="p-3 bg-gray-950 rounded-lg border border-gray-700 text-sm outline-none"><option value="">Numerador (X)...</option>{TODAS_ACOES.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}</select>
            <span className="font-black text-xl text-gray-600">÷</span>
            <select required value={novaMetrica.denominador} onChange={e => setNovaMetrica({...novaMetrica, denominador: e.target.value})} className="p-3 bg-gray-950 rounded-lg border border-gray-700 text-sm outline-none"><option value="">Denominador (Y)...</option>{TODAS_ACOES.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}</select>
          </div>
          <button type="submit" className="w-full md:w-auto px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg">Salvar</button>
        </form>
      </div>
      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
        <h3 className="text-lg font-bold mb-4 text-blue-400">⚡ Acesso Rápido</h3>
        <div className="flex flex-wrap gap-3">
          {savedMetrics.map(metric => (
            <div key={metric.id} className={`flex items-center rounded-lg border cursor-pointer ${selectedMetricId === metric.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-700 hover:border-gray-500'}`}>
              <div className={`px-4 py-2 text-sm font-bold ${selectedMetricId === metric.id ? 'bg-blue-900/40 text-blue-300' : 'bg-gray-800 text-gray-300'}`} onClick={() => setSelectedMetricId(metric.id)}>{metric.nome} <span className="font-mono text-xs opacity-50 ml-2">({metric.numerador}/{metric.denominador})</span></div>
              <button onClick={() => handleDeleteCustomMetric(metric.id)} className="bg-gray-950 px-3 py-2 text-red-500 hover:text-red-400">✕</button>
            </div>
          ))}
        </div>
      </div>
      {selectedMetricId && savedMetrics.length > 0 && (
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr className="border-b border-gray-800 text-gray-400 text-sm"><th className="p-3">#</th><th className="p-3">Atleta</th><th className="p-3 text-right">Fórmula</th><th className="p-3 text-right font-black text-blue-400">Resultado (Índice)</th></tr></thead>
            <tbody>
              {getAnalyzedPlayers().map((player, idx) => {
                const metricObj = savedMetrics.find(m => m.id === selectedMetricId);
                return (
                  <tr key={player.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                    <td className="p-3 font-mono text-gray-500">{idx + 1}</td>
                    <td className="p-3 font-bold">{player.nome} <span className="text-xs text-gray-500 block">{player.funcoes?.join(' • ') || player.posicao} | {player.time_nome}</span></td>
                    <td className="p-3 text-right text-xs font-mono text-gray-500">{(player.acoes_calc[metricObj.numerador] || 0)} / {(player.acoes_calc[metricObj.denominador] || 0)}</td>
                    <td className="p-3 text-right font-mono text-xl text-green-400 font-bold">{calculateCustomMetric(player, metricObj)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}