import React from 'react';

export default function AbaRanking({
  FilterComponent, rankMetric, setRankMetric, TODAS_ACOES, getRankedPlayers
}) {
  return (
    <div className="space-y-6">
      {FilterComponent}
      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Ranking de Atletas</h2>
          <select value={rankMetric} onChange={e => setRankMetric(e.target.value)} className="p-2 bg-gray-800 rounded border border-gray-700 font-bold text-blue-400 outline-none">
            {TODAS_ACOES.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr className="border-b border-gray-800 text-gray-400"><th className="p-3">#</th><th className="p-3">Atleta</th><th className="p-3 text-right">Métrica</th></tr></thead>
            <tbody>
              {getRankedPlayers().map((player, idx) => (
                <tr key={player.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                  <td className="p-3 font-mono text-gray-500">{idx + 1}</td>
                  <td className="p-3 font-bold">{player.nome} <span className="text-xs text-gray-500 block">{player.funcoes?.join(' • ') || player.posicao} | {player.time_nome}</span></td>
                  <td className="p-3 text-right font-mono text-xl text-green-400">{player.acoes_calc[rankMetric] || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}