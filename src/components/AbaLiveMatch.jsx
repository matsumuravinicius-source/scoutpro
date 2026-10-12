import React, { useState } from 'react';

export default function AbaLiveMatch({
  isMatchActive, matchTitle, setMatchTitle, 
  matchCompetition, setMatchCompetition, uniqueCompetitions, // RECEBE NOVAS VARIÁVEIS
  matchTeam, setMatchTeam, 
  matchCategory, setMatchCategory,
  matchSquad, setMatchSquad,
  handleAddToSquad, handleRemoveFromSquad, handleUpdateSquadPlayer, handlePerformSubstitution,
  teams, players, iniciarPartida, currentPeriod, formatTime, matchTime, 
  isTimerRunning, setIsTimerRunning, handleFinalizarTempo, 
  opponentGoals, opponentShots, opponentFinalThird, handleOpponentAction, 
  encerrarPartida, matchEventLog, setMatchEventLog, 
  ACOES_LINHA, ACOES_GOLEIRO, matchStats, handleSetLiveAction, handleLiveAction
}) {
  
  const [expandedLivePlayers, setExpandedLivePlayers] = useState([]);
  const [subPlayerOut, setSubPlayerOut] = useState(null); 

  const isActionDisabled = matchTime === 0 || currentPeriod > 4;

  const teamCategories = matchTeam 
    ? [...new Set(players.filter(p => p.time_nome === matchTeam).map(p => p.categoria).filter(Boolean))]
    : [];

  const toggleLivePlayer = (id) => {
    setExpandedLivePlayers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    if(subPlayerOut === id) setSubPlayerOut(null); 
  };

  const handleSubstitution = (playerOutId, playerInId) => {
    if(!playerInId) return;
    const pOut = players.find(p => p.id === playerOutId);
    const pIn = players.find(p => p.id === playerInId);
    
    handlePerformSubstitution(playerOutId, playerInId);
    setMatchEventLog(prev => [`[T${currentPeriod} - ${formatTime(matchTime)}] 🔄 Substituição: SAIU ${pOut.nome} | ENTROU ${pIn.nome}`, ...prev]);
    setSubPlayerOut(null); 
  };

  const renderSquadListItem = (sq) => {
    const p = players.find(player => player.id === sq.id);
    if(!p) return null;
    return (
      <div key={sq.id} className="flex flex-col sm:flex-row items-center bg-gray-900 border border-gray-800 p-2 rounded-lg gap-3">
        <input 
          type="number" 
          placeholder="Nº" 
          value={sq.numero} 
          onChange={e => handleUpdateSquadPlayer(sq.id, 'numero', e.target.value)} 
          className="w-16 p-2 bg-gray-950 rounded border border-gray-700 text-center font-bold outline-none focus:border-blue-500" 
        />
        <div className="flex-1 font-bold w-full text-center sm:text-left">
          {p.nome} <span className="text-xs text-gray-500 font-normal">({p.setor})</span>
        </div>
        <select 
          value={sq.titular ? 'titular' : 'reserva'} 
          onChange={e => handleUpdateSquadPlayer(sq.id, 'titular', e.target.value === 'titular')} 
          className="w-full sm:w-auto p-2 bg-gray-950 rounded border border-gray-700 text-sm outline-none font-bold"
        >
          <option value="titular">TITULAR</option>
          <option value="reserva">RESERVA</option>
        </select>
        <button onClick={() => handleRemoveFromSquad(sq.id)} className="w-full sm:w-auto text-red-500 hover:text-red-400 font-bold p-2 bg-red-900/20 rounded transition">
          ✕ Remover
        </button>
      </div>
    );
  };

  const emCampo = matchSquad.filter(s => s.inPitch);
  const noBanco = matchSquad.filter(s => !s.inPitch);

  return (
    <div className="space-y-6">
      
      {!isMatchActive ? (
        <div className="bg-gray-900 p-8 rounded-xl border border-gray-800 shadow-xl max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-2">Preparar Partida</h2>
          <p className="text-gray-400 mb-6">Defina a competição, título do jogo e a lista de convocados.</p>
          
          {/* NOVO: CAMPO DE COMPETIÇÃO E TÍTULO LADO A LADO */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <input 
              type="text" 
              list="competicoes-list"
              placeholder="Competição (Ex: Liga Nacional)" 
              required 
              value={matchCompetition} 
              onChange={e => setMatchCompetition(e.target.value)} 
              className="flex-1 p-4 bg-gray-950 rounded-lg border border-gray-700 text-lg outline-none focus:border-blue-500" 
            />
            <datalist id="competicoes-list">
              {uniqueCompetitions.map(c => <option key={c} value={c} />)}
            </datalist>

            <input 
              type="text" 
              placeholder="Título do Jogo (Ex: Final vs Flamengo)" 
              required 
              value={matchTitle} 
              onChange={e => setMatchTitle(e.target.value)} 
              className="flex-[2] p-4 bg-gray-950 rounded-lg border border-gray-700 text-lg outline-none focus:border-blue-500" 
            />
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <select value={matchTeam} onChange={(e) => { setMatchTeam(e.target.value); setMatchCategory(''); setMatchSquad([]); }} className="flex-1 p-3 bg-gray-950 rounded-lg border border-gray-700 text-lg outline-none focus:border-blue-500">
              <option value="">1. Selecionar Clube...</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select disabled={!matchTeam} value={matchCategory} onChange={(e) => { setMatchCategory(e.target.value); setMatchSquad([]); }} className="flex-1 p-3 bg-gray-950 rounded-lg border border-gray-700 text-lg outline-none focus:border-blue-500 disabled:opacity-50">
              <option value="">{matchTeam ? "2. Selecionar Categoria..." : "Selecione o clube primeiro"}</option>
              {teamCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select disabled={!matchCategory} onChange={(e) => { if(e.target.value) handleAddToSquad(e.target.value); e.target.value = ""; }} className="flex-1 p-3 bg-blue-900/20 text-blue-400 font-bold rounded-lg border border-blue-900/50 text-lg outline-none focus:border-blue-500 disabled:opacity-50">
              <option value="">{matchCategory ? "+ Adicionar à Convocatória..." : "Selecione a categoria"}</option>
              {players
                .filter(p => p.time_nome === matchTeam && p.categoria === matchCategory && !matchSquad.find(s => s.id === p.id))
                .sort((a,b) => a.nome.localeCompare(b.nome))
                .map(p => <option key={p.id} value={p.id}>{p.nome} ({p.funcoes?.join(', ') || p.posicao})</option>)
              }
            </select>
          </div>
          
          <div className="flex flex-col gap-2 mb-8 p-4 bg-gray-950 rounded-lg border border-gray-800 max-h-[500px] overflow-y-auto">
            {matchSquad.length === 0 && <div className="text-center py-10 text-gray-500 font-bold">Nenhum jogador selecionado. Adicione no menu acima.</div>}
            
            {matchSquad.filter(s => s.titular).length > 0 && (
              <div className="text-sm font-black text-blue-400 mt-2 border-b border-gray-800 pb-2 uppercase tracking-widest">
                ⚽ Titulares ({matchSquad.filter(s => s.titular).length}/11)
              </div>
            )}
            {matchSquad.filter(s => s.titular).map(sq => renderSquadListItem(sq))}

            {matchSquad.filter(s => !s.titular).length > 0 && (
              <div className="text-sm font-black text-orange-400 mt-6 border-b border-gray-800 pb-2 uppercase tracking-widest">
                🪑 Reservas ({matchSquad.filter(s => !s.titular).length}/12)
              </div>
            )}
            {matchSquad.filter(s => !s.titular).map(sq => renderSquadListItem(sq))}
          </div>

          <button onClick={iniciarPartida} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl text-lg transition shadow-lg shadow-green-900/20">
            Iniciar Partida
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          <div className="xl:col-span-1 space-y-4">
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl sticky top-20 z-10 flex flex-col items-center">
              <h2 className="text-sm font-bold text-red-500 flex items-center justify-center gap-2 mb-2 uppercase tracking-widest text-center leading-tight">
                <span className="animate-pulse">🔴</span> 
                <div>
                  <div className="text-[10px] text-gray-400 tracking-normal">{matchCompetition}</div>
                  <div>{matchTitle}</div>
                </div>
              </h2>
              <div className="text-gray-400 font-bold mb-1">{currentPeriod > 4 ? 'Fim de Jogo' : `${currentPeriod}º Tempo`}</div>
              <div className="text-6xl font-mono font-black text-white mb-6 tabular-nums">{formatTime(matchTime)}</div>
              
              <div className="flex gap-2 w-full mb-4">
                {!isTimerRunning ? (
                  <button 
                    disabled={currentPeriod > 4} 
                    onClick={() => setIsTimerRunning(true)} 
                    className={`flex-1 py-3 rounded-lg font-bold text-lg transition shadow-lg ${currentPeriod > 4 ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50' : 'bg-green-600 hover:bg-green-500 text-white'}`}
                  >
                    ▶ Iniciar
                  </button>
                ) : (
                  <button onClick={() => setIsTimerRunning(false)} className="flex-1 bg-yellow-600 hover:bg-yellow-500 py-3 rounded-lg font-bold text-lg transition shadow-lg text-white">
                    ⏸ Pausar
                  </button>
                )}
              </div>

              <button 
                onClick={handleFinalizarTempo} 
                disabled={currentPeriod > 4} 
                className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 py-2 rounded-lg font-bold mb-6 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentPeriod > 4 ? '⏹ Partida Encerrada' : `⏹ Finalizar ${currentPeriod}º Tempo`}
              </button>

              <div className="w-full bg-gray-950 rounded-lg p-4 border border-red-900/50 mb-6 space-y-2">
                <h4 className="text-red-400 font-bold text-sm mb-3 flex items-center gap-2">🛡️ Ações do Adversário</h4>
                
                <div className="flex justify-between items-center bg-gray-900 px-3 py-2 rounded border border-gray-800">
                  <span className="text-sm text-gray-300">Golos</span>
                  <div className="flex space-x-2 items-center">
                    <button onClick={() => handleOpponentAction('golo', -1)} disabled={isActionDisabled} className={`bg-gray-800 text-gray-400 w-8 h-8 rounded flex items-center justify-center font-bold transition ${isActionDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-900/50'}`}>-</button>
                    <span className="font-mono w-6 text-center text-red-400 font-bold text-lg">{opponentGoals}</span>
                    <button onClick={() => handleOpponentAction('golo', 1)} disabled={isActionDisabled} className={`bg-gray-800 text-gray-400 w-8 h-8 rounded flex items-center justify-center font-bold transition ${isActionDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-900/50'}`}>+</button>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-gray-900 px-3 py-2 rounded border border-gray-800">
                  <span className="text-sm text-gray-300">Finalizações</span>
                  <div className="flex space-x-2 items-center">
                    <button onClick={() => handleOpponentAction('finalizacao', -1)} disabled={isActionDisabled} className={`bg-gray-800 text-gray-400 w-8 h-8 rounded flex items-center justify-center font-bold transition ${isActionDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-900/50'}`}>-</button>
                    <span className="font-mono w-6 text-center text-red-400 font-bold text-lg">{opponentShots}</span>
                    <button onClick={() => handleOpponentAction('finalizacao', 1)} disabled={isActionDisabled} className={`bg-gray-800 text-gray-400 w-8 h-8 rounded flex items-center justify-center font-bold transition ${isActionDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-900/50'}`}>+</button>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-gray-900 px-3 py-2 rounded border border-gray-800">
                  <span className="text-xs text-gray-300 truncate pr-1">Entrada no 1/3 Final</span>
                  <div className="flex space-x-2 items-center">
                    <button onClick={() => handleOpponentAction('ultimo_terco', -1)} disabled={isActionDisabled} className={`bg-gray-800 text-gray-400 w-8 h-8 rounded flex items-center justify-center font-bold transition ${isActionDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-900/50'}`}>-</button>
                    <span className="font-mono w-6 text-center text-red-400 font-bold text-lg">{opponentFinalThird}</span>
                    <button onClick={() => handleOpponentAction('ultimo_terco', 1)} disabled={isActionDisabled} className={`bg-gray-800 text-gray-400 w-8 h-8 rounded flex items-center justify-center font-bold transition ${isActionDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-900/50'}`}>+</button>
                  </div>
                </div>
              </div>

              <button onClick={encerrarPartida} className="w-full px-6 py-3 bg-red-700 hover:bg-red-600 rounded-lg font-bold transition shadow-lg shadow-red-900/20">Terminar e Gravar</button>
            </div>

            <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 shadow-xl h-96 flex flex-col">
              <h3 className="font-bold text-gray-300 mb-3 flex items-center gap-2">⏱️ Linha do Tempo</h3>
              <div className="flex-1 bg-gray-950 rounded-lg border border-gray-800 p-3 overflow-y-auto space-y-2">
                {matchEventLog.length === 0 ? <div className="text-gray-600 text-xs text-center mt-10">Eventos e Ações aparecerão aqui.</div> : matchEventLog.map((log, i) => <div key={i} className="text-xs text-gray-300 border-l-2 border-blue-500 pl-2 py-1 bg-gray-900/50 rounded-r">{log}</div>)}
              </div>
            </div>
          </div>

          <div className="xl:col-span-3 space-y-8 content-start">
            
            {/* GRUPO: EM CAMPO */}
            <div>
              <h3 className="text-xl font-black text-blue-400 mb-4 border-b border-gray-800 pb-2 flex justify-between">
                <span>⚽ Em Campo</span>
                <span className="text-sm bg-blue-900/30 text-blue-300 px-3 py-1 rounded-full">{emCampo.length} Atletas</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {emCampo.map(sq => {
                  const player = players.find(p => p.id === sq.id);
                  const isExpanded = expandedLivePlayers.includes(sq.id);
                  const playerAcoes = player.setor === 'GOLEIRO (GK)' ? ACOES_GOLEIRO : ACOES_LINHA;

                  return (
                    <div key={sq.id} className="bg-gray-900 rounded-xl border border-gray-800 shadow-lg relative overflow-hidden h-fit transition-all">
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
                      
                      <div className="p-3 cursor-pointer hover:bg-gray-800/50 flex justify-between items-center transition" onClick={() => toggleLivePlayer(sq.id)}>
                        <div className="pl-2">
                          <h4 className="text-base font-bold leading-tight flex items-center gap-2">
                            <span className="bg-gray-800 text-blue-400 px-1.5 py-0.5 rounded font-mono text-xs border border-gray-700">{sq.numero ? sq.numero : '?'}</span> 
                            {player.nome}
                          </h4>
                          <p className="text-xs text-blue-400 mt-1">{player.setor} | {player.funcoes?.join(' • ') || player.posicao}</p>
                        </div>
                        <div className="text-gray-500 text-xs font-bold bg-gray-950 px-2 py-1 rounded-full border border-gray-800">
                          {isExpanded ? 'Ocultar ▲' : 'Ações ▼'}
                        </div>
                      </div>

                      {/* Modal Interno de Substituição */}
                      {subPlayerOut === sq.id && (
                        <div className="p-3 bg-gray-950 border-t border-gray-800" onClick={(e) => e.stopPropagation()}>
                          <p className="text-xs text-orange-400 font-bold mb-2 uppercase tracking-wider">Quem entra no lugar de {player.nome}?</p>
                          <select 
                            onChange={(e) => handleSubstitution(sq.id, e.target.value)} 
                            className="w-full p-3 bg-gray-900 rounded border border-gray-700 text-sm font-bold outline-none mb-2 focus:border-orange-500"
                          >
                            <option value="">Escolha o reserva...</option>
                            {noBanco.map(s => {
                              const p = players.find(x => x.id === s.id);
                              return <option key={s.id} value={s.id}>Nº {s.numero} - {p.nome} ({p.setor})</option>
                            })}
                          </select>
                          <button onClick={() => setSubPlayerOut(null)} className="w-full py-2 text-xs text-gray-400 font-bold bg-gray-800 rounded hover:bg-gray-700 transition">Cancelar Substituição</button>
                        </div>
                      )}

                      {/* Área de Ações Táticas */}
                      {isExpanded && subPlayerOut !== sq.id && (
                        <div className="p-3 border-t border-gray-800/50 bg-gray-900/50">
                          {isActionDisabled && currentPeriod <= 4 && <p className="text-[10px] text-red-500 text-center font-bold mb-2 bg-red-950/30 p-1 rounded">⏱️ Inicie o cronómetro para ativar ações.</p>}
                          {isActionDisabled && currentPeriod > 4 && <p className="text-[10px] text-gray-400 text-center font-bold mb-2 bg-gray-900 p-1 rounded">🛑 Partida Finalizada.</p>}
                          
                          <button 
                            disabled={currentPeriod > 4} 
                            onClick={(e) => { e.stopPropagation(); setSubPlayerOut(sq.id); }} 
                            className={`w-full mb-3 py-2 rounded text-sm font-bold flex items-center justify-center gap-2 transition ${currentPeriod > 4 ? 'bg-gray-900 text-gray-600 cursor-not-allowed' : 'bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300'}`}
                          >
                            🔄 Substituir Atleta
                          </button>
                          
                          <div className="grid grid-cols-1 gap-1.5">
                            {playerAcoes.filter(a => a.id !== 'partidas').map(acao => (
                              <div key={acao.id} className={`flex justify-between items-center bg-gray-950 px-2 py-1.5 rounded border border-gray-800/50 ${['gols', 'cartoes_amarelos', 'cartoes_vermelhos', 'passes_chave', 'defesas_dificeis', 'gols_sofridos'].includes(acao.id) ? 'border-l-2 border-l-blue-500/30' : ''}`}>
                                <span className="text-xs text-gray-300 truncate pr-2">{acao.nome}</span>
                                {acao.id === 'minutos' ? (
                                  <input type="number" min="0" placeholder="0" disabled={isActionDisabled} value={matchStats[sq.id]?.[acao.id] === '' ? '' : (matchStats[sq.id]?.[acao.id] || 0)} onChange={(e) => handleSetLiveAction(sq.id, acao.id, e.target.value)} onBlur={(e) => { if (e.target.value === '') handleSetLiveAction(sq.id, acao.id, '0'); }} className={`w-16 p-1 text-center bg-gray-800 text-blue-400 font-bold text-sm rounded border border-gray-700 outline-none focus:ring-1 focus:ring-blue-500 ${isActionDisabled ? 'opacity-50 cursor-not-allowed' : ''}`} />
                                ) : (
                                  <div className="flex space-x-1 items-center">
                                    <button disabled={isActionDisabled} onClick={(e) => { e.stopPropagation(); handleLiveAction(sq.id, acao.id, -1); }} className={`bg-gray-800 text-gray-400 w-7 h-7 rounded flex items-center justify-center font-bold transition ${isActionDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-900/50'}`}>-</button>
                                    <span className="font-mono w-6 text-center text-blue-400 font-bold text-sm">{matchStats[sq.id]?.[acao.id] || 0}</span>
                                    <button disabled={isActionDisabled} onClick={(e) => { e.stopPropagation(); handleLiveAction(sq.id, acao.id, 1); }} className={`bg-gray-800 text-gray-400 w-7 h-7 rounded flex items-center justify-center font-bold transition ${isActionDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-900/50'}`}>+</button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* GRUPO: NO BANCO */}
            {noBanco.length > 0 && (
              <div>
                <h3 className="text-xl font-black text-orange-400 mb-4 border-b border-gray-800 pb-2 flex justify-between mt-8">
                  <span>🪑 No Banco (Reservas/Substituídos)</span>
                  <span className="text-sm bg-orange-900/30 text-orange-300 px-3 py-1 rounded-full">{noBanco.length} Atletas</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-80">
                  {noBanco.map(sq => {
                    const player = players.find(p => p.id === sq.id);
                    const isExpanded = expandedLivePlayers.includes(sq.id);
                    const playerAcoes = player.setor === 'GOLEIRO (GK)' ? ACOES_GOLEIRO : ACOES_LINHA;

                    return (
                      <div key={sq.id} className="bg-gray-900/80 rounded-xl border border-gray-800/50 shadow relative overflow-hidden h-fit transition-all">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gray-600"></div>
                        
                        <div className="p-3 cursor-pointer hover:bg-gray-800/50 flex justify-between items-center transition" onClick={() => toggleLivePlayer(sq.id)}>
                          <div className="pl-2">
                            <h4 className="text-base font-bold leading-tight flex items-center gap-2 text-gray-400">
                              <span className="bg-gray-900 text-gray-500 px-1.5 py-0.5 rounded font-mono text-xs border border-gray-800">{sq.numero ? sq.numero : '?'}</span> 
                              {player.nome}
                            </h4>
                            <p className="text-xs text-orange-500/70 mt-1">{player.setor}</p>
                          </div>
                          <div className="text-gray-600 text-xs font-bold">
                            {isExpanded ? 'Ocultar ▲' : 'Ações ▼'}
                          </div>
                        </div>

                        {/* Ações Bloqueadas */}
                        {isExpanded && (
                          <div className="p-3 border-t border-gray-800/50 bg-gray-900/30">
                            <p className="text-[10px] text-orange-500 font-bold mb-3 text-center bg-orange-950/20 p-1 rounded">🚫 Ações bloqueadas enquanto estiver no banco.</p>
                            <div className="grid grid-cols-1 gap-1.5 opacity-50">
                              {playerAcoes.filter(a => a.id !== 'partidas').map(acao => (
                                <div key={acao.id} className="flex justify-between items-center bg-gray-950 px-2 py-1.5 rounded border border-gray-800/50">
                                  <span className="text-xs text-gray-500 truncate pr-2">{acao.nome}</span>
                                  {acao.id === 'minutos' ? (
                                    <input type="number" min="0" placeholder="0" disabled={true} value={matchStats[sq.id]?.[acao.id] === '' ? '' : (matchStats[sq.id]?.[acao.id] || 0)} onChange={(e) => handleSetLiveAction(sq.id, acao.id, e.target.value)} onBlur={(e) => { if (e.target.value === '') handleSetLiveAction(sq.id, acao.id, '0'); }} className="w-16 p-1 text-center bg-gray-800 text-gray-500 font-bold text-sm rounded border border-gray-700 outline-none cursor-not-allowed" />
                                  ) : (
                                    <div className="flex space-x-1 items-center">
                                      <button disabled={true} onClick={(e) => { e.stopPropagation(); handleLiveAction(sq.id, acao.id, -1); }} className="bg-gray-900 text-gray-600 w-7 h-7 rounded flex items-center justify-center font-bold cursor-not-allowed">-</button>
                                      <span className="font-mono w-6 text-center text-gray-500 font-bold text-sm">{matchStats[sq.id]?.[acao.id] || 0}</span>
                                      <button disabled={true} onClick={(e) => { e.stopPropagation(); handleLiveAction(sq.id, acao.id, 1); }} className="bg-gray-900 text-gray-600 w-7 h-7 rounded flex items-center justify-center font-bold cursor-not-allowed">+</button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}