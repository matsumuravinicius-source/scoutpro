import React, { useState } from 'react';
import { getPlayerSectorLabel } from '../utils/playerSectors';

export default function AbaComparativo({
  startDateA, setStartDateA, endDateA, setEndDateA, filterTeamA, setFilterTeamA, teams, filterCategoryA, setFilterCategoryA, uniqueCategories, filterSectorA, setFilterSectorA, SETORES, compareA, setCompareA, filteredPlayersA,
  startDateB, setStartDateB, endDateB, setEndDateB, filterTeamB, setFilterTeamB, filterCategoryB, setFilterCategoryB, filterSectorB, setFilterSectorB, compareB, setCompareB, filteredPlayersB,
  TODAS_ACOES, players, getComputedStats,
  matchHistory, uniqueCompetitions, isDateInRange 
}) {
  const [modoComparacao, setModoComparacao] = useState('atletas'); // 'atletas' ou 'equipes'

  // ==========================================
  // ESTADOS PARA COMPARAÇÃO DE PARTIDAS (EQUIPA)
  // ==========================================
  const [equipeAlvo, setEquipeAlvo] = useState('');

  const [compFiltroA, setCompFiltroA] = useState('');
  const [catFiltroA, setCatFiltroA] = useState('');
  const [dataInicioA, setDataInicioA] = useState('');
  const [dataFimA, setDataFimA] = useState('');
  const [partidaIdA, setPartidaIdA] = useState('');

  const [compFiltroB, setCompFiltroB] = useState('');
  const [catFiltroB, setCatFiltroB] = useState('');
  const [dataInicioB, setDataInicioB] = useState('');
  const [dataFimB, setDataFimB] = useState('');
  const [partidaIdB, setPartidaIdB] = useState('');

  // Função para procurar jogos de uma equipa com os filtros aplicados
  const getTeamMatches = (compFilter, dInicio, dFim) => {
     if (!matchHistory || !equipeAlvo) return [];
     return matchHistory.filter(m => {
        if (!m.dados?._meta?.equipes?.includes(equipeAlvo)) return false;
        if (compFilter && m.dados._meta.competicao !== compFilter) return false;
        if (!isDateInRange(m.criado_em, dInicio, dFim)) return false;
        return true;
     });
  };

  const partidasA = getTeamMatches(compFiltroA, dataInicioA, dataFimA);
  const partidasB = getTeamMatches(compFiltroB, dataInicioB, dataFimB);

  // Função para somar as ações de todos os atletas dessa equipa e categoria numa partida específica
  const calcTeamMatchStats = (matchId, catFilter) => {
     const stats = {};
     TODAS_ACOES.forEach(a => stats[a.id] = 0);
     if (!matchId || !matchHistory) return stats;
     
     const match = matchHistory.find(m => m.id === matchId);
     if (!match) return stats;

     // Filtra os IDs dos jogadores que pertencem à equipa (e categoria, se selecionada)
     const teamPlayerIds = players.filter(p => p.time_nome === equipeAlvo && (!catFilter || p.categoria === catFilter)).map(p => p.id);
     
     Object.keys(match.dados).forEach(pId => {
        if (pId !== '_meta' && teamPlayerIds.includes(pId)) {
           TODAS_ACOES.forEach(a => {
             stats[a.id] += parseInt(match.dados[pId][a.id] || 0);
           });
        }
     });
     return stats;
  };

  return (
    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-gray-800 pb-4 gap-4">
        <h2 className="text-2xl font-bold">Frente a Frente Global</h2>
        
        {/* BOTÕES DE ALTERNÂNCIA DE MODO */}
        <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800">
          <button 
            onClick={() => setModoComparacao('atletas')} 
            className={`px-4 py-2 text-sm font-bold rounded-md transition ${modoComparacao === 'atletas' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
          >
            Comparar Atletas
          </button>
          <button 
            onClick={() => setModoComparacao('equipes')} 
            className={`px-4 py-2 text-sm font-bold rounded-md transition ${modoComparacao === 'equipes' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
          >
            Comparar Partidas da Equipa
          </button>
        </div>
      </div>
      
      {/* ========================================================
          MODO 1: COMPARAÇÃO DE ATLETAS (O código que já existia)
          ======================================================== */}
      {modoComparacao === 'atletas' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-3 bg-gray-950 p-5 rounded-xl border border-gray-800 shadow-inner">
              <h3 className="font-bold text-blue-400 text-lg border-b border-gray-800 pb-2">Seleção do Atleta A</h3>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2 bg-gray-900 p-1 rounded border border-gray-700">
                  <span className="text-gray-500 text-xs font-bold px-2 uppercase">De:</span>
                  <input type="date" value={startDateA} onChange={e => setStartDateA(e.target.value)} className="bg-transparent outline-none text-sm w-full text-blue-400 font-bold" />
                  <span className="text-gray-500 text-xs font-bold px-2 uppercase border-l border-gray-700">Até:</span>
                  <input type="date" value={endDateA} onChange={e => setEndDateA(e.target.value)} className="bg-transparent outline-none text-sm w-full text-blue-400 font-bold" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select value={filterTeamA} onChange={e => setFilterTeamA(e.target.value)} className="p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none"><option value="">Todos os Clubes</option>{teams.map(t => <option key={t} value={t}>{t}</option>)}</select>
                  <select value={filterCategoryA} onChange={e => setFilterCategoryA(e.target.value)} className="p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none"><option value="">Todas as Categorias</option>{uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                  <select value={filterSectorA} onChange={e => setFilterSectorA(e.target.value)} className="p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none"><option value="">Todos os Setores</option>{Object.keys(SETORES).map(s => <option key={s} value={s}>{s}</option>)}</select>
                </div>
              </div>
              <select value={compareA} onChange={e => setCompareA(e.target.value)} className="w-full p-3 bg-blue-900/20 border border-blue-900/50 text-blue-300 font-bold text-lg rounded-lg outline-none focus:ring-1 focus:ring-blue-500"><option value="">Selecione o Atleta A...</option>{filteredPlayersA.map(p => <option key={p.id} value={p.id}>{p.nome} ({getPlayerSectorLabel(p)})</option>)}</select>
            </div>

            <div className="space-y-3 bg-gray-950 p-5 rounded-xl border border-gray-800 shadow-inner">
              <h3 className="font-bold text-orange-400 text-lg border-b border-gray-800 pb-2">Seleção do Atleta B</h3>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2 bg-gray-900 p-1 rounded border border-gray-700">
                  <span className="text-gray-500 text-xs font-bold px-2 uppercase">De:</span>
                  <input type="date" value={startDateB} onChange={e => setStartDateB(e.target.value)} className="bg-transparent outline-none text-sm w-full text-orange-400 font-bold" />
                  <span className="text-gray-500 text-xs font-bold px-2 uppercase border-l border-gray-700">Até:</span>
                  <input type="date" value={endDateB} onChange={e => setEndDateB(e.target.value)} className="bg-transparent outline-none text-sm w-full text-orange-400 font-bold" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select value={filterTeamB} onChange={e => setFilterTeamB(e.target.value)} className="p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none"><option value="">Todos os Clubes</option>{teams.map(t => <option key={t} value={t}>{t}</option>)}</select>
                  <select value={filterCategoryB} onChange={e => setFilterCategoryB(e.target.value)} className="p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none"><option value="">Todas as Categorias</option>{uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                  <select value={filterSectorB} onChange={e => setFilterSectorB(e.target.value)} className="p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none"><option value="">Todos os Setores</option>{Object.keys(SETORES).map(s => <option key={s} value={s}>{s}</option>)}</select>
                </div>
              </div>
              <select value={compareB} onChange={e => setCompareB(e.target.value)} className="w-full p-3 bg-orange-900/20 border border-orange-900/50 text-orange-300 font-bold text-lg rounded-lg outline-none focus:ring-1 focus:ring-orange-500"><option value="">Selecione o Atleta B...</option>{filteredPlayersB.map(p => <option key={p.id} value={p.id}>{p.nome} ({getPlayerSectorLabel(p)})</option>)}</select>
            </div>
          </div>

          {compareA && compareB && (
            <div className="space-y-6 mt-8">
              {TODAS_ACOES.map(acao => {
                const pA = players.find(p => p.id === compareA); const pB = players.find(p => p.id === compareB);
                const statsA = pA ? getComputedStats(pA, startDateA, endDateA) : {};
                const statsB = pB ? getComputedStats(pB, startDateB, endDateB) : {};
                
                const valA = statsA[acao.id] || 0; 
                const valB = statsB[acao.id] || 0; 
                const max = Math.max(valA, valB, 1);
                if (valA === 0 && valB === 0) return null; 

                return (
                  <div key={acao.id} className="relative">
                    <div className="flex justify-between text-sm text-gray-400 mb-1 px-1">
                      <span className="font-mono text-blue-400 font-bold text-lg">{valA}</span>
                      <span className="uppercase tracking-widest text-xs font-bold text-gray-300">{acao.nome}</span>
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
          )}
        </>
      )}

      {/* ========================================================
          MODO 2: COMPARAÇÃO DE PARTIDAS (NOVO)
          ======================================================== */}
      {modoComparacao === 'equipes' && (
        <>
          <div className="mb-6 bg-gray-950 p-5 rounded-xl border border-gray-800 max-w-md mx-auto">
             <label className="block text-sm text-gray-400 font-bold mb-2 uppercase tracking-wider text-center">Clube a Analisar</label>
             <select value={equipeAlvo} onChange={e => { setEquipeAlvo(e.target.value); setPartidaIdA(''); setPartidaIdB(''); }} className="w-full p-3 bg-gray-900 border border-gray-700 text-white font-bold text-lg rounded-lg outline-none focus:border-blue-500 text-center">
                <option value="">Selecione o Clube...</option>
                {teams.map(t => <option key={t} value={t}>{t}</option>)}
             </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className={`space-y-3 p-5 rounded-xl border shadow-inner ${equipeAlvo ? 'bg-gray-950 border-gray-800' : 'bg-gray-900 border-gray-800 opacity-50 pointer-events-none'}`}>
              <h3 className="font-bold text-blue-400 text-lg border-b border-gray-800 pb-2">Partida A</h3>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2 bg-gray-900 p-1 rounded border border-gray-700">
                  <span className="text-gray-500 text-xs font-bold px-2 uppercase">De:</span>
                  <input type="date" value={dataInicioA} onChange={e => setDataInicioA(e.target.value)} className="bg-transparent outline-none text-sm w-full text-blue-400 font-bold" />
                  <span className="text-gray-500 text-xs font-bold px-2 uppercase border-l border-gray-700">Até:</span>
                  <input type="date" value={dataFimA} onChange={e => setDataFimA(e.target.value)} className="bg-transparent outline-none text-sm w-full text-blue-400 font-bold" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select value={compFiltroA} onChange={e => setCompFiltroA(e.target.value)} className="p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none">
                    <option value="">Todas as Competições</option>
                    {uniqueCompetitions?.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={catFiltroA} onChange={e => setCatFiltroA(e.target.value)} className="p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none">
                    <option value="">Todas as Categorias</option>
                    {uniqueCategories?.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <select value={partidaIdA} onChange={e => setPartidaIdA(e.target.value)} className="w-full p-3 bg-blue-900/20 border border-blue-900/50 text-blue-300 font-bold text-sm rounded-lg outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Selecione o Relatório da Partida A...</option>
                {partidasA.map(m => <option key={m.id} value={m.id}>{m.titulo} ({new Date(m.criado_em).toLocaleDateString()})</option>)}
              </select>
            </div>

            <div className={`space-y-3 p-5 rounded-xl border shadow-inner ${equipeAlvo ? 'bg-gray-950 border-gray-800' : 'bg-gray-900 border-gray-800 opacity-50 pointer-events-none'}`}>
              <h3 className="font-bold text-orange-400 text-lg border-b border-gray-800 pb-2">Partida B</h3>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2 bg-gray-900 p-1 rounded border border-gray-700">
                  <span className="text-gray-500 text-xs font-bold px-2 uppercase">De:</span>
                  <input type="date" value={dataInicioB} onChange={e => setDataInicioB(e.target.value)} className="bg-transparent outline-none text-sm w-full text-orange-400 font-bold" />
                  <span className="text-gray-500 text-xs font-bold px-2 uppercase border-l border-gray-700">Até:</span>
                  <input type="date" value={dataFimB} onChange={e => setDataFimB(e.target.value)} className="bg-transparent outline-none text-sm w-full text-orange-400 font-bold" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select value={compFiltroB} onChange={e => setCompFiltroB(e.target.value)} className="p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none">
                    <option value="">Todas as Competições</option>
                    {uniqueCompetitions?.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={catFiltroB} onChange={e => setCatFiltroB(e.target.value)} className="p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none">
                    <option value="">Todas as Categorias</option>
                    {uniqueCategories?.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <select value={partidaIdB} onChange={e => setPartidaIdB(e.target.value)} className="w-full p-3 bg-orange-900/20 border border-orange-900/50 text-orange-300 font-bold text-sm rounded-lg outline-none focus:ring-1 focus:ring-orange-500">
                <option value="">Selecione o Relatório da Partida B...</option>
                {partidasB.map(m => <option key={m.id} value={m.id}>{m.titulo} ({new Date(m.criado_em).toLocaleDateString()})</option>)}
              </select>
            </div>
          </div>

          {partidaIdA && partidaIdB && (
            <div className="space-y-6 mt-8">
              <div className="text-center mb-6">
                <h4 className="text-gray-400 text-sm font-bold uppercase tracking-widest">Estatísticas Coletivas Somadas</h4>
                <p className="text-xs text-gray-500">Comparativo das ações de todos os atletas do(a) <strong className="text-white">{equipeAlvo}</strong> nas duas partidas.</p>
              </div>
              
              {TODAS_ACOES.map(acao => {
                const statsA = calcTeamMatchStats(partidaIdA, catFiltroA);
                const statsB = calcTeamMatchStats(partidaIdB, catFiltroB);
                
                // Exceção: "partidas" não faz sentido somar quando estamos a analisar a própria partida
                if (acao.id === 'partidas') return null;

                const valA = statsA[acao.id] || 0; 
                const valB = statsB[acao.id] || 0; 
                const max = Math.max(valA, valB, 1);
                
                // Se ninguém fez essa ação em nenhum dos jogos, não polui o ecrã
                if (valA === 0 && valB === 0) return null; 

                return (
                  <div key={acao.id} className="relative">
                    <div className="flex justify-between text-sm text-gray-400 mb-1 px-1">
                      <span className="font-mono text-blue-400 font-bold text-lg">{valA}</span>
                      <span className="uppercase tracking-widest text-xs font-bold text-gray-300">{acao.nome}</span>
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
          )}
        </>
      )}

    </div>
  );
}
