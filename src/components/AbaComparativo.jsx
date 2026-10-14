import React, { useState } from 'react';

export default function AbaComparativo({
  teams, uniqueCategories, SETORES, safePlayers, safeMatchHistory, TODAS_ACOES, getComputedStats, uniqueCompetitionsHistory, isMatchInDateRange
}) {
  const [modo, setModo] = useState('atletas'); // 'atletas' ou 'partidas'

  // Estados Comparação Atletas
  const [filterDatesA, setFilterDatesA] = useState({ start: '', end: '' });
  const [compareA, setCompareA] = useState('');
  
  const [filterDatesB, setFilterDatesB] = useState({ start: '', end: '' });
  const [compareB, setCompareB] = useState('');

  // Estados Comparação Partidas
  const [teamMatchA, setTeamMatchA] = useState('');
  const [matchSelectedA, setMatchSelectedA] = useState('');

  const [teamMatchB, setTeamMatchB] = useState('');
  const [matchSelectedB, setMatchSelectedB] = useState('');

  // Lógica de Extração de Dados da Partida Inteira (Coletivo)
  const getMatchTeamStats = (matchId, teamName) => {
    const match = safeMatchHistory.find(m => m.id === matchId);
    if (!match) return {};
    const computed = {};
    TODAS_ACOES.forEach(a => computed[a.id] = 0);
    
    Object.keys(match.dados).forEach(pId => {
      if (pId !== '_meta' && safePlayers.find(p => p.id === pId)?.time_nome === teamName) {
        const st = match.dados[pId];
        Object.keys(st).forEach(k => { computed[k] = (computed[k] || 0) + (parseInt(st[k]) || 0); });
      }
    });
    return computed;
  };

  return (
    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-gray-800 pb-4">
        <h2 className="text-2xl font-bold">Frente a Frente (Raio-X)</h2>
        <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800">
          <button onClick={() => setModo('atletas')} className={`px-4 py-2 rounded font-bold text-sm transition ${modo === 'atletas' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}>👤 Comparar Atletas</button>
          <button onClick={() => setModo('partidas')} className={`px-4 py-2 rounded font-bold text-sm transition ${modo === 'partidas' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}>🛡️ Comparar Partidas</button>
        </div>
      </div>
      
      {modo === 'atletas' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* SELEÇÃO ATLETA A */}
          <div className="space-y-3 bg-gray-950 p-5 rounded-xl border border-gray-800">
            <h3 className="font-bold text-blue-400 text-lg border-b border-gray-800 pb-2">Atleta A</h3>
            <div className="flex gap-2">
              <input type="date" value={filterDatesA.start} onChange={e => setFilterDatesA({...filterDatesA, start: e.target.value})} className="p-2 bg-gray-900 rounded border border-gray-700 text-xs text-gray-400 outline-none w-full" />
              <input type="date" value={filterDatesA.end} onChange={e => setFilterDatesA({...filterDatesA, end: e.target.value})} className="p-2 bg-gray-900 rounded border border-gray-700 text-xs text-gray-400 outline-none w-full" />
            </div>
            <select value={compareA} onChange={e => setCompareA(e.target.value)} className="w-full p-3 bg-blue-900/20 border border-blue-900/50 text-blue-300 font-bold text-lg rounded-lg outline-none">
              <option value="">Selecione o Atleta A...</option>
              {safePlayers.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.time_nome})</option>)}
            </select>
          </div>

          {/* SELEÇÃO ATLETA B */}
          <div className="space-y-3 bg-gray-950 p-5 rounded-xl border border-gray-800">
            <h3 className="font-bold text-orange-400 text-lg border-b border-gray-800 pb-2">Atleta B</h3>
            <div className="flex gap-2">
              <input type="date" value={filterDatesB.start} onChange={e => setFilterDatesB({...filterDatesB, start: e.target.value})} className="p-2 bg-gray-900 rounded border border-gray-700 text-xs text-gray-400 outline-none w-full" />
              <input type="date" value={filterDatesB.end} onChange={e => setFilterDatesB({...filterDatesB, end: e.target.value})} className="p-2 bg-gray-900 rounded border border-gray-700 text-xs text-gray-400 outline-none w-full" />
            </div>
            <select value={compareB} onChange={e => setCompareB(e.target.value)} className="w-full p-3 bg-orange-900/20 border border-orange-900/50 text-orange-300 font-bold text-lg rounded-lg outline-none">
              <option value="">Selecione o Atleta B...</option>
              {safePlayers.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.time_nome})</option>)}
            </select>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* SELEÇÃO PARTIDA A */}
          <div className="space-y-3 bg-gray-950 p-5 rounded-xl border border-gray-800">
            <h3 className="font-bold text-blue-400 text-lg border-b border-gray-800 pb-2">Clube e Partida A</h3>
            <select value={teamMatchA} onChange={e => {setTeamMatchA(e.target.value); setMatchSelectedA('');}} className="w-full p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none">
              <option value="">1. Escolha o Clube...</option>{teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={matchSelectedA} onChange={e => setMatchSelectedA(e.target.value)} disabled={!teamMatchA} className="w-full p-3 bg-blue-900/20 border border-blue-900/50 text-blue-300 font-bold text-lg rounded-lg outline-none disabled:opacity-50">
              <option value="">2. Escolha a Partida deste Clube...</option>
              {safeMatchHistory.filter(m => m.dados?._meta?.equipes?.includes(teamMatchA)).map(m => <option key={m.id} value={m.id}>{new Date(m.criado_em).toLocaleDateString()} - {m.titulo}</option>)}
            </select>
          </div>

          {/* SELEÇÃO PARTIDA B */}
          <div className="space-y-3 bg-gray-950 p-5 rounded-xl border border-gray-800">
            <h3 className="font-bold text-orange-400 text-lg border-b border-gray-800 pb-2">Clube e Partida B</h3>
            <select value={teamMatchB} onChange={e => {setTeamMatchB(e.target.value); setMatchSelectedB('');}} className="w-full p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none">
              <option value="">1. Escolha o Clube...</option>{teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={matchSelectedB} onChange={e => setMatchSelectedB(e.target.value)} disabled={!teamMatchB} className="w-full p-3 bg-orange-900/20 border border-orange-900/50 text-orange-300 font-bold text-lg rounded-lg outline-none disabled:opacity-50">
              <option value="">2. Escolha a Partida deste Clube...</option>
              {safeMatchHistory.filter(m => m.dados?._meta?.equipes?.includes(teamMatchB)).map(m => <option key={m.id} value={m.id}>{new Date(m.criado_em).toLocaleDateString()} - {m.titulo}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* RENDERIZAÇÃO DAS BARRAS DE COMPARAÇÃO */}
      <div className="space-y-6 mt-8">
        {TODAS_ACOES.map(acao => {
          let valA = 0, valB = 0;
          
          if (modo === 'atletas' && compareA && compareB) {
            const pA = safePlayers.find(p => p.id === compareA); const pB = safePlayers.find(p => p.id === compareB);
            valA = pA ? getComputedStats(pA, filterDatesA.start, filterDatesA.end)[acao.id] || 0 : 0;
            valB = pB ? getComputedStats(pB, filterDatesB.start, filterDatesB.end)[acao.id] || 0 : 0;
          } else if (modo === 'partidas' && matchSelectedA && matchSelectedB) {
            valA = getMatchTeamStats(matchSelectedA, teamMatchA)[acao.id] || 0;
            valB = getMatchTeamStats(matchSelectedB, teamMatchB)[acao.id] || 0;
          } else {
            return null; // Não mostra nada se não houver seleções
          }

          const max = Math.max(valA, valB, 1);
          if (valA === 0 && valB === 0) return null; 

          return (
            <div key={acao.id} className="relative">
              <div className="flex justify-between text-sm text-gray-400 mb-1 px-1">
                <span className="font-mono text-blue-400 font-bold text-lg">{valA}</span>
                <span className="uppercase tracking-widest text-[10px] font-bold text-gray-400 bg-gray-900 px-2 rounded-full border border-gray-800">{acao.nome}</span>
                <span className="font-mono text-orange-400 font-bold text-lg">{valB}</span>
              </div>
              <div className="flex h-4 bg-gray-950 rounded-full overflow-hidden shadow-inner border border-gray-800">
                <div className="w-1/2 flex justify-end bg-gray-950 pr-1"><div className="h-full bg-blue-500 rounded-l-full transition-all duration-500" style={{ width: `${(valA / max) * 100}%` }}></div></div>
                <div className="w-1/2 flex justify-start bg-gray-950 pl-1"><div className="h-full bg-orange-500 rounded-r-full transition-all duration-500" style={{ width: `${(valB / max) * 100}%` }}></div></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}