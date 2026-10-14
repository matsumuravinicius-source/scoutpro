import React, { useState } from 'react';

export default function AbaAnalise({ FilterComponent, TODAS_ACOES, playersWithCalculatedStats, safeMatchHistory, teams, startD, endD, isMatchInDateRange }) {
  const [modoAnalise, setModoAnalise] = useState('individual'); // 'individual' ou 'coletivo'
  const [metricConfig, setMetricConfig] = useState({ nome: '', numerador: '', denominador: '' });
  
  // Função que soma os totais de uma equipa nas partidas do período filtrado
  const getTeamStats = (teamName) => {
    const teamMatches = safeMatchHistory.filter(m => isMatchInDateRange(m.criado_em, startD, endD) && m.dados?._meta?.equipes?.includes(teamName));
    const computed = {};
    TODAS_ACOES.forEach(a => computed[a.id] = 0);
    
    teamMatches.forEach(m => {
      Object.keys(m.dados).forEach(pId => {
        if (pId !== '_meta' && playersWithCalculatedStats.find(p => p.id === pId)?.time_nome === teamName) {
          const st = m.dados[pId];
          Object.keys(st).forEach(k => { computed[k] = (computed[k] || 0) + (parseInt(st[k]) || 0); });
        }
      });
    });
    return computed;
  };

  const calculateMetric = (acoesObj) => {
    if (!metricConfig.numerador || !metricConfig.denominador) return 0;
    const num = parseFloat(acoesObj[metricConfig.numerador]) || 0;
    const den = parseFloat(acoesObj[metricConfig.denominador]) || 0;
    return den === 0 ? 0 : (num / den).toFixed(3);
  };

  return (
    <div className="space-y-6">
      {FilterComponent}
      
      {/* SELETORES DE MODO DE ANÁLISE */}
      <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-800 w-fit">
        <button onClick={() => setModoAnalise('individual')} className={`px-6 py-2 rounded-md font-bold text-sm transition ${modoAnalise === 'individual' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>👤 Estatística Individual</button>
        <button onClick={() => setModoAnalise('coletivo')} className={`px-6 py-2 rounded-md font-bold text-sm transition ${modoAnalise === 'coletivo' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>🛡️ Estatística Coletiva (Clubes)</button>
      </div>

      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl">
        <h2 className="text-xl font-bold mb-4">Montar Fórmula de Análise</h2>
        <div className="flex items-center gap-2 w-full">
          <select value={metricConfig.numerador} onChange={e => setMetricConfig({...metricConfig, numerador: e.target.value})} className="p-3 bg-gray-950 rounded-lg border border-gray-700 text-sm outline-none flex-1"><option value="">Numerador (X)...</option>{TODAS_ACOES.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}</select>
          <span className="font-black text-xl text-gray-600">÷</span>
          <select value={metricConfig.denominador} onChange={e => setMetricConfig({...metricConfig, denominador: e.target.value})} className="p-3 bg-gray-950 rounded-lg border border-gray-700 text-sm outline-none flex-1"><option value="">Denominador (Y)...</option>{TODAS_ACOES.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}</select>
        </div>
      </div>

      {metricConfig.numerador && metricConfig.denominador && (
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr className="border-b border-gray-800 text-gray-400 text-sm"><th className="p-3">Pos.</th><th className="p-3">{modoAnalise === 'individual' ? 'Atleta' : 'Clube'}</th><th className="p-3 text-right">Fórmula ({metricConfig.numerador}/{metricConfig.denominador})</th><th className="p-3 text-right font-black text-blue-400">Índice</th></tr></thead>
            <tbody>
              {modoAnalise === 'individual' ? (
                playersWithCalculatedStats.sort((a, b) => calculateMetric(b.acoes_calc) - calculateMetric(a.acoes_calc)).map((player, idx) => (
                  <tr key={player.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                    <td className="p-3 font-mono text-gray-500">{idx + 1}</td>
                    <td className="p-3 font-bold">{player.nome} <span className="text-xs text-gray-500 block">{player.time_nome}</span></td>
                    <td className="p-3 text-right text-xs font-mono text-gray-500">{(player.acoes_calc[metricConfig.numerador] || 0)} / {(player.acoes_calc[metricConfig.denominador] || 0)}</td>
                    <td className="p-3 text-right font-mono text-xl text-green-400 font-bold">{calculateMetric(player.acoes_calc)}</td>
                  </tr>
                ))
              ) : (
                teams.map(teamName => {
                  const stats = getTeamStats(teamName);
                  return { name: teamName, stats: stats, score: calculateMetric(stats) };
                }).sort((a, b) => b.score - a.score).map((team, idx) => (
                  <tr key={team.name} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                    <td className="p-3 font-mono text-gray-500">{idx + 1}</td>
                    <td className="p-3 font-bold">{team.name}</td>
                    <td className="p-3 text-right text-xs font-mono text-gray-500">{(team.stats[metricConfig.numerador] || 0)} / {(team.stats[metricConfig.denominador] || 0)}</td>
                    <td className="p-3 text-right font-mono text-xl text-blue-400 font-bold">{team.score}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}