import React, { useState } from 'react';
import CampoFutebol from './CampoFutebol';

const extractYouTubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|live\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const timeToSeconds = (timeStr) => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
};

export default function AbaClubes({ teams, players, matchHistory, newTeamName, setNewTeamName, handleAddTeam, handleDeleteTeam, uniqueCompetitions, isDateInRange, TODAS_ACOES, onSelectPlayer }) {
  const [filterCompetition, setFilterCompetition] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [expandedTeam, setExpandedTeam] = useState(null);
  const [mapActionFilter, setMapActionFilter] = useState('');
  
  // Estado para controlar qual vídeo está a ser reproduzido no momento
  const [activeVideoParams, setActiveVideoParams] = useState(null);

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl">
        <h2 className="text-2xl font-bold mb-2">Gestão de Clubes</h2>
        <p className="text-sm text-gray-400 mb-6">Adicione ou exclua clubes do sistema e avalie o desempenho coletivo.</p>
        <form onSubmit={handleAddTeam} className="flex flex-col md:flex-row gap-4">
          <input type="text" placeholder="Nome do Novo Clube" required value={newTeamName} onChange={e => setNewTeamName(e.target.value)} className="flex-1 p-3 bg-gray-950 rounded-lg border border-gray-700 text-sm outline-none focus:border-blue-500" />
          <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition shadow-lg">Adicionar Clube</button>
        </form>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-4">
        
        <div className="flex flex-col lg:flex-row justify-between items-center bg-gray-950 p-3 rounded-lg border border-gray-800 gap-3">
           <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">🔎 Filtrar Desempenho:</span>
           <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
             <div className="flex items-center gap-2 bg-gray-900 p-1 rounded border border-gray-700">
               <span className="text-gray-500 text-xs font-bold px-2 uppercase">De:</span>
               <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent outline-none text-xs text-blue-400 font-bold" />
               <span className="text-gray-500 text-xs font-bold px-2 uppercase border-l border-gray-700">Até:</span>
               <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent outline-none text-xs text-blue-400 font-bold" />
             </div>
             <select value={filterCompetition} onChange={e => setFilterCompetition(e.target.value)} className="p-2 bg-gray-900 rounded border border-gray-700 text-xs outline-none text-blue-400 font-bold">
               <option value="">Todas as Competições</option>
               {uniqueCompetitions?.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-sm">
                <th className="p-3 sticky left-0 bg-gray-900 shadow-[1px_0_0_#1f2937]">Clube / Ações</th>
                <th className="p-3 text-center" title="Partidas">Partidas</th>
                <th className="p-3 text-center text-blue-400">Golos</th>
                <th className="p-3 text-center text-red-400">Golos Sofridos</th>
                <th className="p-3 text-center">Assistências</th>
                <th className="p-3 text-center text-green-400">Fin. Certas</th>
                <th className="p-3 text-center text-orange-400">Fin. Erradas</th>
                <th className="p-3 text-center">Desarmes</th>
                <th className="p-3 text-center text-yellow-400">C. Amarelos</th>
                <th className="p-3 text-center text-red-500">C. Vermelhos</th>
              </tr>
            </thead>
            <tbody>
              {teams.length === 0 ? (
                <tr><td colSpan="11" className="p-6 text-center text-gray-500">Nenhum clube registado.</td></tr>
              ) : (
                teams.map(team => {
                  const teamMatches = matchHistory.filter(m => {
                    if (filterCompetition && m.dados?._meta?.competicao !== filterCompetition) return false;
                    if (!isDateInRange(m.criado_em, startDate, endDate)) return false;
                    return m.dados?._meta?.equipes?.includes(team);
                  });

                  const teamPlayers = players.filter(p => p.time_nome === team);
                  const teamPlayerIds = teamPlayers.map(p => p.id);
                  let tGolos = 0, tAssist = 0, tFinCertas = 0, tFinErradas = 0, tDes = 0, tCA = 0, tCV = 0;
                  const allLances = [];
                  
                  teamMatches.forEach(m => {
                    // Soma de Estatísticas
                    Object.keys(m.dados).forEach(pId => {
                      if (pId !== '_meta' && teamPlayerIds.includes(pId)) {
                        const st = m.dados[pId];
                        tGolos += parseInt(st.gols || 0); 
                        tAssist += parseInt(st.assistencias || 0);
                        tFinCertas += parseInt(st.finalizacoes_certas || 0); 
                        tFinErradas += parseInt(st.finalizacoes_erradas || 0);
                        tDes += parseInt(st.desarmes || 0); 
                        tCA += parseInt(st.cartoes_amarelos || 0); 
                        tCV += parseInt(st.cartoes_vermelhos || 0);
                      }
                    });

                    // Extração de Lances para a Linha do Tempo e Vídeo
                    const ytId = extractYouTubeId(m.dados?._meta?.videoUrl);
                    const logs = m.dados?._meta?.eventLog || [];
                    const offsetT1 = timeToSeconds(m.dados?._meta?.offsetT1 || '00:00');
                    const offsetT2 = timeToSeconds(m.dados?._meta?.offsetT2 || '45:00');

                    logs.forEach(log => {
                      const matchTime = log.match(/\[T(\d+)\s*-\s*(\d{2}:\d{2})\]/);
                      if (!matchTime) return;

                      const actionText = log.split(']')[1]?.trim() || '';
                      const playerName = actionText.split('•')[0]?.trim();
                      
                      // Mostra na lista apenas lances de jogadores que pertencem a esta equipa
                      if (!teamPlayers.find(p => p.nome === playerName)) return;

                      const period = parseInt(matchTime[1]);
                      const eventSec = timeToSeconds(matchTime[2]);
                      const baseOffset = period === 1 ? offsetT1 : offsetT2;
                      const targetSecond = Math.max(0, baseOffset + eventSec - 3);

                      allLances.push({
                        logText: actionText,
                        playerName: playerName,
                        matchTitle: m.titulo,
                        date: new Date(m.criado_em).toLocaleDateString(),
                        timeStr: `T${period} ${matchTime[2]}`,
                        ytId,
                        targetSecond
                      });
                    });
                  });
                  
                  const tPartidas = teamMatches.length;
                  const tSofridos = teamMatches.reduce((sum, m) => sum + (m.dados?._meta?.gols_sofridos || 0), 0);
                  const isExpanded = expandedTeam === team;

                  return (
                    <React.Fragment key={team}>
                      <tr 
                        onClick={() => {
                          setExpandedTeam(isExpanded ? null : team);
                          setActiveVideoParams(null); // Fecha o vídeo ao mudar de clube
                        }}
                        className={`border-b border-gray-800/50 hover:bg-gray-800/40 text-sm cursor-pointer transition ${isExpanded ? 'bg-gray-800/40' : ''}`}
                      >
                        <td className="p-3 sticky left-0 bg-gray-900 shadow-[1px_0_0_#1f2937] z-10 flex items-center justify-between gap-2">
                           <span className="font-bold text-blue-400 group-hover:text-blue-300">
                             {isExpanded ? '▼' : '▶'} {team}
                           </span>
                           <button onClick={(e) => { e.stopPropagation(); handleDeleteTeam(team); }} className="text-red-500 bg-red-900/20 rounded p-1.5 text-xs hover:bg-red-500 hover:text-white transition shadow" title="Excluir Clube e Todos os Jogadores">🗑️</button>
                        </td>
                        <td className="p-3 text-center font-mono text-gray-300">{tPartidas}</td>
                        <td className="p-3 text-center font-mono text-blue-400 font-bold">{tGolos}</td>
                        <td className="p-3 text-center font-mono text-red-400 font-bold">{tSofridos}</td>
                        <td className="p-3 text-center font-mono text-gray-300">{tAssist}</td>
                        <td className="p-3 text-center font-mono text-green-400">{tFinCertas}</td>
                        <td className="p-3 text-center font-mono text-orange-400">{tFinErradas}</td>
                        <td className="p-3 text-center font-mono text-gray-300">{tDes}</td>
                        <td className="p-3 text-center font-mono text-yellow-400">{tCA}</td>
                        <td className="p-3 text-center font-mono text-red-500">{tCV}</td>
                      </tr>

                      {isExpanded && (
                         <tr>
                           <td colSpan="11" className="p-0 border-b border-gray-800 bg-[#0f172a]/50">
                              <div className="p-6 max-w-7xl mx-auto space-y-6">
                                 
                                 {/* SESSÃO 1: VÍDEO E LISTA DE LANCES ALINHADOS */}
                                 <div className="flex flex-col lg:flex-row items-stretch gap-4">
                                    <div className="w-full lg:w-2/3 aspect-video bg-gray-950 rounded-xl overflow-hidden border border-gray-800 flex-shrink-0 shadow-lg flex items-center justify-center relative">
                                        {activeVideoParams?.ytId ? (
                                            <iframe
                                              key={`${activeVideoParams.ytId}-${activeVideoParams.targetSecond}`}
                                              className="w-full h-full"
                                              src={`https://www.youtube.com/embed/${activeVideoParams.ytId}?start=${activeVideoParams.targetSecond}&autoplay=1&rel=0`}
                                              title="Reprodutor de Lances"
                                              frameBorder="0"
                                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                              allowFullScreen
                                            />
                                        ) : (
                                            <div className="text-center text-gray-500 flex flex-col items-center">
                                                <span className="text-4xl mb-3 text-blue-500 opacity-80">▶️</span>
                                                <h3 className="font-bold text-white mb-1">Selecione um lance na lista</h3>
                                                <p className="text-xs">O vídeo será reproduzido aqui.</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="w-full lg:w-1/3 bg-gray-950 rounded-xl border border-gray-800 flex flex-col min-h-0 shadow-inner">
                                        <div className="p-4 border-b border-gray-800 flex-shrink-0 flex justify-between items-center">
                                            <h3 className="font-bold text-white text-sm">Ações e Lances</h3>
                                            <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded font-mono font-bold">{allLances.length} lances</span>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                            {allLances.length === 0 ? (
                                                <p className="text-xs text-gray-500 text-center py-6">Nenhum lance registado.</p>
                                            ) : (
                                                allLances.map((lance, idx) => (
                                                    <div 
                                                      key={idx} 
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (lance.ytId) setActiveVideoParams(lance);
                                                        else alert("Esta partida não possui link de vídeo registado.");
                                                      }} 
                                                      className="cursor-pointer bg-gray-900 hover:bg-gray-800 p-3 rounded-lg border border-gray-800 transition group"
                                                    >
                                                        <div className="font-bold text-white text-sm flex justify-between">
                                                            {lance.logText}
                                                            {!lance.ytId && <span className="text-[10px] text-orange-400">Sem Vídeo</span>}
                                                        </div>
                                                        <div className="text-xs text-gray-400 mt-1">{lance.matchTitle}</div>
                                                        <div className="text-[10px] text-gray-500 mt-1">{lance.date} · {lance.timeStr}</div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                 </div>

                                 {/* SESSÃO 2: MAPA DE AÇÕES (ESQUERDA) E DESEMPENHO (DIREITA) */}
                                 <div className="flex flex-col lg:flex-row gap-6">
                                    <div className="w-full lg:w-1/2 bg-gray-950 p-5 rounded-xl border border-gray-800 flex flex-col shadow-inner">
                                        <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
                                            <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">🗺️ Mapa de Ações</h3>
                                            <select
                                              value={mapActionFilter}
                                              onChange={(e) => setMapActionFilter(e.target.value)}
                                              className="bg-gray-900 border border-gray-700 text-xs rounded-lg p-2 outline-none text-blue-400 font-bold cursor-pointer"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <option value="">Todas as Ações</option>
                                              {TODAS_ACOES?.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex-1 bg-gray-900 rounded-xl p-2 flex items-center justify-center min-h-[280px] border border-gray-800/60">
                                            <CampoFutebol 
                                              team={team} 
                                              matches={teamMatches} 
                                              filterAction={mapActionFilter} 
                                              equipe={team} 
                                              partidas={teamMatches} 
                                              filtro={mapActionFilter} 
                                            />
                                        </div>
                                    </div>

                                    <div className="w-full lg:w-1/2 bg-gray-950 p-5 rounded-xl border border-gray-800 shadow-inner">
                                        <h3 className="text-lg font-bold text-blue-400 border-b border-gray-800 pb-3 mb-4 flex items-center gap-2">
                                            📊 Desempenho Acumulado
                                            <span className="text-[10px] bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded border border-blue-900/50 font-mono">
                                                {tPartidas} partidas
                                            </span>
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-gray-900 p-3 rounded-lg border border-gray-800 flex justify-between items-center"><span className="text-gray-400 text-[10px] font-bold uppercase">Golos Pró</span><span className="text-blue-400 font-mono font-black text-lg">{tGolos}</span></div>
                                            <div className="bg-gray-900 p-3 rounded-lg border border-gray-800 flex justify-between items-center"><span className="text-gray-400 text-[10px] font-bold uppercase">Golos Sofridos</span><span className="text-red-400 font-mono font-black text-lg">{tSofridos}</span></div>
                                            <div className="bg-gray-900 p-3 rounded-lg border border-gray-800 flex justify-between items-center"><span className="text-gray-400 text-[10px] font-bold uppercase">Fin. Certas</span><span className="text-green-400 font-mono font-black text-lg">{tFinCertas}</span></div>
                                            <div className="bg-gray-900 p-3 rounded-lg border border-gray-800 flex justify-between items-center"><span className="text-gray-400 text-[10px] font-bold uppercase">Fin. Erradas</span><span className="text-orange-400 font-mono font-black text-lg">{tFinErradas}</span></div>
                                            <div className="bg-gray-900 p-3 rounded-lg border border-gray-800 flex justify-between items-center"><span className="text-gray-400 text-[10px] font-bold uppercase">Assistências</span><span className="text-gray-300 font-mono font-black text-lg">{tAssist}</span></div>
                                            <div className="bg-gray-900 p-3 rounded-lg border border-gray-800 flex justify-between items-center"><span className="text-gray-400 text-[10px] font-bold uppercase">Desarmes</span><span className="text-gray-300 font-mono font-black text-lg">{tDes}</span></div>
                                            <div className="bg-gray-900 p-3 rounded-lg border border-gray-800 flex justify-between items-center"><span className="text-gray-400 text-[10px] font-bold uppercase">C. Amarelos</span><span className="text-yellow-400 font-mono font-black text-lg">{tCA}</span></div>
                                            <div className="bg-gray-900 p-3 rounded-lg border border-gray-800 flex justify-between items-center"><span className="text-gray-400 text-[10px] font-bold uppercase">C. Vermelhos</span><span className="text-red-500 font-mono font-black text-lg">{tCV}</span></div>
                                        </div>
                                    </div>
                                 </div>

                                 {/* SESSÃO 3: ELENCO COM CARDS CLICÁVEIS */}
                                 <div className="bg-gray-950 p-5 rounded-xl border border-gray-800 shadow-inner">
                                    <h3 className="font-bold text-white mb-4 border-b border-gray-800 pb-2">
                                        Elenco <span className="text-gray-500 text-sm">({teamPlayers.length})</span>
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                        {teamPlayers.map(p => (
                                            <div 
                                              key={p.id} 
                                              onClick={(e) => { e.stopPropagation(); onSelectPlayer(p.id); }} 
                                              className="bg-gray-900 border border-gray-800 p-4 rounded-xl cursor-pointer hover:border-blue-500 transition-all flex flex-col gap-1 group shadow-sm"
                                            >
                                                <h4 className="font-bold text-white group-hover:text-blue-400">{p.nome}</h4>
                                                <p className="text-xs text-blue-400">{p.categoria}</p>
                                                <p className="text-[10px] text-gray-500 uppercase mt-1">{p.setor} {p.funcoes?.length > 0 ? `· ${p.funcoes.join(', ')}` : ''}</p>
                                            </div>
                                        ))}
                                    </div>
                                 </div>

                              </div>
                           </td>
                         </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}