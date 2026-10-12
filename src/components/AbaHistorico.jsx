import React from 'react';

export default function AbaHistorico({
  matchHistory, editingMatchId, editMatchData, setEditMatchData, saveMatchEdit, cancelMatchEdit,
  handleEditMatchClick, handleDeleteMatch, expandedMatch, setExpandedMatch, players, TODAS_ACOES, ACOES_GOLEIRO, ACOES_LINHA,
  handleSetMatchEditAction, handleUpdateMatchEditAction
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-6">Relatórios de Partidas Salvas</h2>
      {matchHistory.length === 0 ? <div className="text-center py-20 text-gray-500 bg-gray-900 rounded-xl border border-gray-800">Nenhum relatório de partida encontrado.</div> : (
        matchHistory.map(partida => (
          <div key={partida.id} className={`bg-gray-900 rounded-xl border transition ${editingMatchId === partida.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-800'}`}>
            <div className="p-4 bg-gray-800/50 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800/50 gap-4">
              {editingMatchId === partida.id ? (
                <div className="flex-1 w-full"><input type="text" value={editMatchData.titulo} onChange={e => setEditMatchData({...editMatchData, titulo: e.target.value})} className="w-full p-2 bg-gray-950 rounded border border-gray-700 text-blue-400 font-bold outline-none" /></div>
              ) : (
                <div><h3 className="font-bold text-lg text-blue-400">{partida.titulo}</h3><p className="text-sm text-gray-400">Criado em: {new Date(partida.criado_em).toLocaleDateString()} às {new Date(partida.criado_em).toLocaleTimeString()}</p></div>
              )}
              <div className="flex items-center gap-3">
                {editingMatchId === partida.id ? (
                  <><button onClick={() => saveMatchEdit(partida.id)} className="text-green-500 font-bold px-2 py-1 bg-green-900/20 rounded">Salvar</button><button onClick={cancelMatchEdit} className="text-gray-400 px-2 py-1">Cancelar</button></>
                ) : (
                  <><button onClick={() => handleEditMatchClick(partida)} className="text-blue-500 p-1 bg-blue-900/20 rounded">✏️</button><button onClick={() => handleDeleteMatch(partida.id, partida.titulo)} className="text-red-500 p-1 bg-red-900/20 rounded">🗑️</button><span className="text-gray-500 cursor-pointer text-sm font-bold ml-2" onClick={() => setExpandedMatch(expandedMatch === partida.id ? null : partida.id)}>{expandedMatch === partida.id ? 'Ocultar ▲' : 'Ver ▼'}</span></>
                )}
              </div>
            </div>
            
            {expandedMatch === partida.id && (
              <div className="p-4">
                {partida.dados._meta && (
                   <div className="mb-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* PAINEL DE DURAÇÃO */}
                        {partida.dados._meta.periodLogs?.length > 0 && (
                           <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                             <h4 className="text-gray-400 font-bold text-sm mb-2">Duração (Tempos):</h4>
                             {partida.dados._meta.periodLogs.map((l, i) => <div key={i} className="text-blue-400 font-mono text-sm">{l}</div>)}
                           </div>
                        )}

                        {/* NOVO: PAINEL AVANÇADO DO ADVERSÁRIO */}
                        <div className="bg-gray-950 p-3 rounded-lg border border-red-900/30">
                          <h4 className="text-red-400 font-bold text-sm mb-2">🛡️ Ações do Adversário:</h4>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <span className="text-gray-500 text-[10px] uppercase block mb-1">Golos</span>
                              {editingMatchId === partida.id ? (
                                <input type="number" min="0" value={editMatchData.dados._meta?.gols_sofridos ?? 0} onChange={e => setEditMatchData({...editMatchData, dados: {...editMatchData.dados, _meta: {...editMatchData.dados._meta, gols_sofridos: parseInt(e.target.value)||0}}})} className="w-full p-1 text-center bg-gray-900 text-red-400 font-bold text-sm rounded border border-gray-700 outline-none" />
                              ) : (
                                <div className="text-red-400 font-mono text-lg font-bold">{partida.dados._meta?.gols_sofridos ?? 0}</div>
                              )}
                            </div>
                            <div>
                              <span className="text-gray-500 text-[10px] uppercase block mb-1">Finaliz.</span>
                              {editingMatchId === partida.id ? (
                                <input type="number" min="0" value={editMatchData.dados._meta?.finalizacoes_adversario ?? 0} onChange={e => setEditMatchData({...editMatchData, dados: {...editMatchData.dados, _meta: {...editMatchData.dados._meta, finalizacoes_adversario: parseInt(e.target.value)||0}}})} className="w-full p-1 text-center bg-gray-900 text-red-400 font-bold text-sm rounded border border-gray-700 outline-none" />
                              ) : (
                                <div className="text-red-400 font-mono text-lg font-bold">{partida.dados._meta?.finalizacoes_adversario ?? 0}</div>
                              )}
                            </div>
                            <div>
                              <span className="text-gray-500 text-[10px] uppercase block mb-1">Últ. Terço</span>
                              {editingMatchId === partida.id ? (
                                <input type="number" min="0" value={editMatchData.dados._meta?.ultimo_terco_adversario ?? 0} onChange={e => setEditMatchData({...editMatchData, dados: {...editMatchData.dados, _meta: {...editMatchData.dados._meta, ultimo_terco_adversario: parseInt(e.target.value)||0}}})} className="w-full p-1 text-center bg-gray-900 text-red-400 font-bold text-sm rounded border border-gray-700 outline-none" />
                              ) : (
                                <div className="text-red-400 font-mono text-lg font-bold">{partida.dados._meta?.ultimo_terco_adversario ?? 0}</div>
                              )}
                            </div>
                          </div>
                        </div>

                      </div>
                      
                      {/* LINHA DO TEMPO (LOGS) */}
                      {partida.dados._meta.eventLog?.length > 0 && (
                         <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 max-h-48 overflow-y-auto">
                           <h4 className="text-gray-400 font-bold text-sm mb-2">⏱️ Linha do Tempo (Event Log):</h4>
                           {partida.dados._meta.eventLog.map((l, i) => <div key={i} className="text-gray-300 text-xs border-l-2 border-blue-500 pl-2 py-1 mb-1 bg-gray-900/50">{l}</div>)}
                         </div>
                      )}
                   </div>
                )}
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-max">
                    <thead><tr className="border-b border-gray-800 text-gray-400 text-sm"><th className="p-2 sticky left-0 bg-gray-900 shadow-[1px_0_0_#1f2937] z-10">Atleta</th>{TODAS_ACOES.map(a => <th key={a.id} className="p-2 text-center" title={a.nome}>{a.nome.substring(0,4)}.</th>)}</tr></thead>
                    <tbody>
                      {Object.keys(editingMatchId === partida.id ? editMatchData.dados : partida.dados).filter(id => id !== '_meta').map(playerId => {
                        const p = players.find(x => x.id === playerId) || { nome: 'Removido' };
                        const isGoleiro = p.setor === 'GOLEIRO (GK)';

                        if (editingMatchId === partida.id) {
                          return (
                            <tr key={playerId} className="border-b border-gray-800/50 hover:bg-gray-800/20 text-sm">
                              <td className="p-2 font-bold sticky left-0 bg-gray-900 shadow-[1px_0_0_#1f2937] z-10">{p.nome}</td>
                              {TODAS_ACOES.map(a => {
                                const isValid = isGoleiro ? ACOES_GOLEIRO.some(ag => ag.id === a.id) : ACOES_LINHA.some(al => al.id === a.id);
                                if (!isValid) return <td key={a.id} className="p-1 text-center bg-gray-900/20 text-gray-700">-</td>;
                                
                                return (
                                  <td key={a.id} className="p-1 text-center">
                                    {['minutos', 'partidas'].includes(a.id) ? (
                                      <input type="number" min="0" placeholder="0" value={editMatchData.dados[playerId]?.[a.id] === '' ? '' : (editMatchData.dados[playerId]?.[a.id] || 0)} onChange={(e) => handleSetMatchEditAction(playerId, a.id, e.target.value)} onBlur={(e) => { if (e.target.value === '') handleSetMatchEditAction(playerId, a.id, '0'); }} className="w-12 p-1 text-center bg-gray-950 text-blue-400 font-bold text-xs rounded border border-gray-700 outline-none" />
                                    ) : (
                                      <div className="flex space-x-1 items-center justify-center">
                                        <button onClick={() => handleUpdateMatchEditAction(playerId, a.id, -1)} className="bg-gray-800 text-gray-400 w-5 h-5 rounded hover:bg-red-900/50">-</button>
                                        <span className="font-mono w-4 text-center text-blue-400 font-bold text-xs">{editMatchData.dados[playerId]?.[a.id] || 0}</span>
                                        <button onClick={() => handleUpdateMatchEditAction(playerId, a.id, 1)} className="bg-gray-800 text-gray-400 w-5 h-5 rounded hover:bg-green-900/50">+</button>
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        }
                        return (
                          <tr key={playerId} className="border-b border-gray-800/50 hover:bg-gray-800/20 text-sm">
                            <td className="p-2 font-bold sticky left-0 bg-gray-900 shadow-[1px_0_0_#1f2937] z-10">{p.nome}</td>
                            {TODAS_ACOES.map(a => {
                                const isValid = isGoleiro ? ACOES_GOLEIRO.some(ag => ag.id === a.id) : (!p.setor || ACOES_LINHA.some(al => al.id === a.id));
                                if (!isValid) return <td key={a.id} className="p-2 text-center text-gray-700">-</td>;
                                return <td key={a.id} className="p-2 text-center font-mono text-gray-300">{partida.dados[playerId]?.[a.id] || 0}</td>
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}