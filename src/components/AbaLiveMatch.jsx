import React from 'react';

export default function AbaLiveMatch({
  isMatchActive, matchTitle, setMatchTitle, matchTeam, setMatchTeam, setMatchSquadIds,
  teams, matchSquadIds, toggleMatchSquad, players, iniciarPartida, currentPeriod,
  formatTime, matchTime, isTimerRunning, setIsTimerRunning, handleFinalizarTempo,
  opponentGoals, handleOpponentGoal, encerrarPartida, matchEventLog, ACOES_LINHA, ACOES_GOLEIRO,
  matchStats, handleSetLiveAction, handleLiveAction
}) {
  return (
    <div className="space-y-6">
      {!isMatchActive ? (
        <div className="bg-gray-900 p-8 rounded-xl border border-gray-800 shadow-xl max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-2">Preparar Partida</h2>
          <p className="text-gray-400 mb-6">Selecione o clube que vai analisar nesta partida e depois convoque os jogadores.</p>
          <input type="text" placeholder="Ex: Final do Campeonato vs Flamengo" required value={matchTitle} onChange={e => setMatchTitle(e.target.value)} className="w-full p-4 bg-gray-950 rounded-lg border border-gray-700 text-lg mb-4" />
          
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <select value={matchTeam} onChange={(e) => { setMatchTeam(e.target.value); setMatchSquadIds([]); }} className="flex-1 p-3 bg-gray-950 rounded-lg border border-gray-700 text-lg outline-none focus:border-blue-500">
              <option value="">1. Selecionar Clube...</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select disabled={!matchTeam} onChange={(e) => { if(e.target.value) toggleMatchSquad(e.target.value); e.target.value = ""; }} className="flex-1 p-3 bg-gray-950 rounded-lg border border-gray-700 text-lg outline-none focus:border-blue-500 disabled:opacity-50">
              <option value="">{matchTeam ? "2. Convocatória (Atletas)..." : "Selecione o clube primeiro"}</option>
              {players.filter(p => p.time_nome === matchTeam && !matchSquadIds.includes(p.id)).sort((a,b) => a.nome.localeCompare(b.nome)).map(p => <option key={p.id} value={p.id}>{p.nome} ({p.funcoes?.join(', ') || p.posicao})</option>)}
            </select>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-8 min-h-[50px] p-4 bg-gray-950 rounded-lg border border-gray-800">
            {matchSquadIds.length === 0 && <span className="text-gray-500">Nenhum jogador convocado.</span>}
            {matchSquadIds.map(id => {
              const p = players.find(player => player.id === id);
              if(!p) return null;
              return (
                <div key={id} className="flex items-center bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-full text-sm">
                  <span className="font-bold mr-2">{p.nome}</span>
                  <button onClick={() => toggleMatchSquad(id)} className="text-gray-500 hover:text-red-400 font-bold border-l border-gray-600 pl-2 ml-1">✕</button>
                </div>
              )
            })}
          </div>
          <button onClick={iniciarPartida} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl text-lg transition shadow-lg shadow-green-900/20">Iniciar Partida</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          <div className="xl:col-span-1 space-y-4">
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl sticky top-20 z-10 flex flex-col items-center">
              <h2 className="text-sm font-bold text-red-500 flex items-center gap-2 mb-2 uppercase tracking-widest text-center"><span className="animate-pulse">🔴</span> {matchTitle}</h2>
              <div className="text-gray-400 font-bold mb-1">{currentPeriod}º Tempo</div>
              <div className="text-6xl font-mono font-black text-white mb-6 tabular-nums">{formatTime(matchTime)}</div>
              
              <div className="flex gap-2 w-full mb-4">
                {!isTimerRunning ? (
                  <button onClick={() => setIsTimerRunning(true)} className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded-lg font-bold text-lg transition shadow-lg">▶ Iniciar</button>
                ) : (
                  <button onClick={() => setIsTimerRunning(false)} className="flex-1 bg-yellow-600 hover:bg-yellow-500 py-3 rounded-lg font-bold text-lg transition shadow-lg">⏸ Pausar</button>
                )}
              </div>
              <button onClick={handleFinalizarTempo} disabled={currentPeriod > 4} className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 py-2 rounded-lg font-bold mb-6 transition disabled:opacity-50">⏹ Finalizar {currentPeriod}º Tempo</button>

              <div className="w-full bg-gray-950 rounded-lg p-4 border border-red-900/50 mb-6">
                <h4 className="text-red-400 font-bold text-sm mb-3 flex items-center gap-2">🛡️ Ações do Adversário</h4>
                <div className="flex justify-between items-center bg-gray-900 px-3 py-2 rounded border border-gray-800">
                  <span className="text-sm text-gray-300">Golos (Sofridos)</span>
                  <div className="flex space-x-2 items-center">
                    <button onClick={() => handleOpponentGoal(-1)} className="bg-gray-800 text-gray-400 w-8 h-8 rounded flex items-center justify-center font-bold hover:bg-red-900/50">-</button>
                    <span className="font-mono w-6 text-center text-red-400 font-bold text-lg">{opponentGoals}</span>
                    <button onClick={() => handleOpponentGoal(1)} className="bg-gray-800 text-gray-400 w-8 h-8 rounded flex items-center justify-center font-bold hover:bg-green-900/50">+</button>
                  </div>
                </div>
              </div>

              <button onClick={encerrarPartida} className="w-full px-6 py-3 bg-red-700 hover:bg-red-600 rounded-lg font-bold transition shadow-lg shadow-red-900/20">Terminar e Gravar</button>
            </div>

            <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 shadow-xl h-96 flex flex-col">
              <h3 className="font-bold text-gray-300 mb-3 flex items-center gap-2">⏱️ Linha do Tempo</h3>
              <div className="flex-1 bg-gray-950 rounded-lg border border-gray-800 p-3 overflow-y-auto space-y-2">
                {matchEventLog.length === 0 ? <div className="text-gray-600 text-xs text-center mt-10">Os Golos, Cartões e Passes aparecerão aqui.</div> : matchEventLog.map((log, i) => <div key={i} className="text-xs text-gray-300 border-l-2 border-blue-500 pl-2 py-1 bg-gray-900/50 rounded-r">{log}</div>)}
              </div>
            </div>
          </div>

          <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
            {players.filter(p => matchSquadIds.includes(p.id)).map(player => {
              const playerAcoes = player.setor === 'GOLEIRO (GK)' ? ACOES_GOLEIRO : ACOES_LINHA;
              const funcoesExibicao = player.funcoes && player.funcoes.length > 0 ? player.funcoes.join(' • ') : player.posicao;

              return (
                <div key={player.id} className="bg-gray-900 p-4 rounded-xl border border-gray-800 shadow-lg relative overflow-hidden h-fit">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
                  <div className="mb-3 pb-3 border-b border-gray-800/50 pl-2">
                    <h4 className="text-base font-bold leading-tight">{player.nome}</h4>
                    <p className="text-xs text-blue-400 mt-1">{player.setor} | {funcoesExibicao}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 pl-2">
                    {playerAcoes.filter(a => a.id !== 'partidas').map(acao => (
                      <div key={acao.id} className={`flex justify-between items-center bg-gray-950 px-2 py-1.5 rounded border border-gray-800/50 ${['gols', 'cartoes_amarelos', 'cartoes_vermelhos', 'passes_chave', 'defesas_dificeis', 'gols_sofridos'].includes(acao.id) ? 'border-l-2 border-l-blue-500/30' : ''}`}>
                        <span className="text-xs text-gray-300 truncate pr-2">{acao.nome}</span>
                        {acao.id === 'minutos' ? (
                          <input type="number" min="0" placeholder="0" value={matchStats[player.id]?.[acao.id] === '' ? '' : (matchStats[player.id]?.[acao.id] || 0)} onChange={(e) => handleSetLiveAction(player.id, acao.id, e.target.value)} onBlur={(e) => { if (e.target.value === '') handleSetLiveAction(player.id, acao.id, '0'); }} className="w-16 p-1 text-center bg-gray-800 text-blue-400 font-bold text-sm rounded border border-gray-700 outline-none focus:ring-1 focus:ring-blue-500" />
                        ) : (
                          <div className="flex space-x-1 items-center">
                            <button onClick={() => handleLiveAction(player.id, acao.id, -1)} className="bg-gray-800 text-gray-400 w-7 h-7 rounded hover:bg-red-900/50 flex items-center justify-center font-bold">-</button>
                            <span className="font-mono w-6 text-center text-blue-400 font-bold text-sm">{matchStats[player.id]?.[acao.id] || 0}</span>
                            <button onClick={() => handleLiveAction(player.id, acao.id, 1)} className="bg-gray-800 text-gray-400 w-7 h-7 rounded hover:bg-green-900/50 flex items-center justify-center font-bold">+</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}