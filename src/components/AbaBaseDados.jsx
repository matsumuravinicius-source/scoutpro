import React from 'react';

export default function AbaBaseDados({
  novoJogador, setNovoJogador, teams, handleSavePlayer, editingPlayerId,
  cancelarEdicao, FilterComponent, displayedPlayers, toggleExpandPlayer,
  handleEditClick, handleDeletePlayer, getIdade, expandedPlayers,
  SETORES, ACOES_LINHA, ACOES_GOLEIRO, handleSetGlobalAction, handleUpdateGlobalActions
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <form onSubmit={handleSavePlayer} className="bg-gray-900 p-6 rounded-xl border border-gray-800 h-fit sticky top-24">
        <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-blue-400">{editingPlayerId ? 'Editar Atleta' : 'Adicionar Atleta'}</h3></div>
        <div className="space-y-3">
          <input type="text" placeholder="Nome Completo" required value={novoJogador.nome} onChange={e => setNovoJogador({...novoJogador, nome: e.target.value})} className="w-full p-2 bg-gray-950 rounded border border-gray-700" />
          
          <div className="grid grid-cols-2 gap-2">
            <select required value={novoJogador.time_nome} onChange={e => setNovoJogador({...novoJogador, time_nome: e.target.value})} className="p-2 bg-gray-950 rounded border border-gray-700">
              <option value="">Equipa/Clube...</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="text" list="categorias-list" placeholder="Categoria (Ex: Sub-17)" required value={novoJogador.categoria} onChange={e => setNovoJogador({...novoJogador, categoria: e.target.value})} className="p-2 bg-gray-950 rounded border border-gray-700" />
          </div>

          {/* NOVO: SELECT DE SETOR */}
          <select required value={novoJogador.setor} onChange={e => setNovoJogador({...novoJogador, setor: e.target.value, funcoes: ['']})} className="w-full p-2 bg-gray-950 rounded border border-gray-700 text-blue-400 font-bold">
            <option value="">Selecione o Setor do Campo...</option>
            {Object.keys(SETORES).map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* NOVO: LISTA DINÂMICA DE FUNÇÕES (Até 3) */}
          {novoJogador.setor && (
            <div className="space-y-2 bg-gray-950 p-3 rounded border border-gray-800">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Funções Específicas (Máx 3):</label>
              {novoJogador.funcoes.map((func, index) => (
                <div key={index} className="flex gap-2">
                  <select required value={func} onChange={(e) => {
                    const novasFuncoes = [...novoJogador.funcoes];
                    novasFuncoes[index] = e.target.value;
                    setNovoJogador({...novoJogador, funcoes: novasFuncoes});
                  }} className="flex-1 p-2 bg-gray-900 rounded border border-gray-700">
                    <option value="">Escolha a Função...</option>
                    {SETORES[novoJogador.setor].map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  {index > 0 && (
                    <button type="button" onClick={() => {
                      const novasFuncoes = novoJogador.funcoes.filter((_, i) => i !== index);
                      setNovoJogador({...novoJogador, funcoes: novasFuncoes});
                    }} className="p-2 bg-red-900/30 text-red-500 rounded font-bold hover:bg-red-900/60">X</button>
                  )}
                </div>
              ))}
              {novoJogador.funcoes.length < 3 && (
                <button type="button" onClick={() => setNovoJogador({...novoJogador, funcoes: [...novoJogador.funcoes, '']})} className="text-sm font-bold text-blue-400 hover:text-blue-300 mt-2 block">+ Adicionar Função</button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <select required value={novoJogador.pe_dominante} onChange={e => setNovoJogador({...novoJogador, pe_dominante: e.target.value})} className="p-2 bg-gray-950 rounded border border-gray-700">
              <option value="Destro">Destro</option><option value="Canhoto">Canhoto</option><option value="Ambidestro">Ambidestro</option>
            </select>
            <input type="number" placeholder="Ano Nasc." value={novoJogador.ano_nascimento} onChange={e => setNovoJogador({...novoJogador, ano_nascimento: e.target.value})} className="p-2 bg-gray-950 rounded border border-gray-700 text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" step="0.01" placeholder="Alt (m)" value={novoJogador.altura} onChange={e => setNovoJogador({...novoJogador, altura: e.target.value})} className="p-2 bg-gray-950 rounded border border-gray-700 text-sm" />
            <input type="number" step="0.1" placeholder="Gord (%)" value={novoJogador.percentual_gordura} onChange={e => setNovoJogador({...novoJogador, percentual_gordura: e.target.value})} className="p-2 bg-gray-950 rounded border border-gray-700 text-sm" />
            <input type="number" step="0.1" placeholder="Vel (km/h)" value={novoJogador.velocidade_maxima} onChange={e => setNovoJogador({...novoJogador, velocidade_maxima: e.target.value})} className="p-2 bg-gray-950 rounded border border-gray-700 text-sm" />
          </div>
          <div className="flex space-x-2 mt-4">
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded font-bold transition">{editingPlayerId ? 'Salvar Edição' : 'Gravar Atleta'}</button>
            {editingPlayerId && <button type="button" onClick={cancelarEdicao} className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded font-bold transition">Cancelar</button>}
          </div>
        </div>
      </form>
      
      <div className="lg:col-span-2">
        {FilterComponent}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedPlayers.length === 0 ? (
            <div className="col-span-2 text-center text-gray-500 py-10 bg-gray-900 rounded-xl">Nenhum jogador encontrado.</div>
          ) : (
            displayedPlayers.map(player => {
              const playerAcoes = player.setor === 'GOLEIRO (GK)' ? ACOES_GOLEIRO : ACOES_LINHA;
              const funcoesExibicao = player.funcoes && player.funcoes.length > 0 ? player.funcoes.join(' • ') : player.posicao;

              return (
                <div key={player.id} className={`bg-gray-900 p-4 rounded-xl border transition h-fit ${editingPlayerId === player.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-800'}`}>
                  <div className="flex justify-between items-start cursor-pointer hover:bg-gray-800/50 p-2 -m-2 rounded transition" onClick={() => toggleExpandPlayer(player.id)}>
                    <div>
                      <h4 className="text-lg font-bold flex items-center gap-2">
                        {player.nome}
                        <button onClick={(e) => { e.stopPropagation(); handleEditClick(player); }} className="text-blue-500 hover:text-blue-400 p-1">✏️</button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeletePlayer(player.id, player.nome); }} className="text-red-500 hover:text-red-400 p-1">🗑️</button>
                      </h4>
                      <p className="text-xs text-blue-400">{player.time_nome} • {player.categoria}</p>
                      <p className="text-xs text-green-400 font-bold mt-1">{player.setor} | {funcoesExibicao}</p>
                    </div>
                    <div className="text-right text-xs text-gray-400 flex flex-col items-end">
                      <p>{getIdade(player.ano_nascimento)}{player.altura}m | {player.pe_dominante}</p>
                      <p>Fat: {player.percentual_gordura}% | Max: {player.velocidade_maxima}km/h</p>
                      <span className="text-blue-500 font-bold mt-2 text-xs">{expandedPlayers.includes(player.id) || editingPlayerId === player.id ? 'Ocultar ▲' : 'Ver Ações ▼'}</span>
                    </div>
                  </div>
                  
                  {(expandedPlayers.includes(player.id) || editingPlayerId === player.id) && (
                    <div className="grid grid-cols-1 gap-1 mt-3 pt-3 border-t border-gray-800/50">
                      {playerAcoes.map(acao => (
                        <div key={acao.id} className="flex justify-between items-center bg-gray-950 px-2 py-1.5 rounded border border-gray-800/50">
                          <span className="text-xs text-gray-300 truncate pr-2">{acao.nome}</span>
                          
                          {editingPlayerId === player.id ? (
                            ['minutos', 'partidas'].includes(acao.id) ? (
                              <input type="number" min="0" placeholder="0" value={player.acoes[acao.id] === '' ? '' : (player.acoes[acao.id] || 0)} onChange={(e) => handleSetGlobalAction(player.id, acao.id, e.target.value)} onBlur={(e) => { if (e.target.value === '') handleSetGlobalAction(player.id, acao.id, '0'); }} className="w-16 p-1 text-center bg-gray-800 text-blue-400 font-bold text-sm rounded border border-gray-700 outline-none focus:border-blue-500" />
                            ) : (
                              <div className="flex space-x-1 items-center">
                                <button type="button" onClick={() => handleUpdateGlobalActions(player.id, acao.id, -1)} className="bg-gray-800 text-gray-400 w-7 h-7 rounded hover:bg-red-900/50 flex items-center justify-center font-bold">-</button>
                                <span className="font-mono w-6 text-center text-blue-400 font-bold text-sm">{player.acoes[acao.id] || 0}</span>
                                <button type="button" onClick={() => handleUpdateGlobalActions(player.id, acao.id, 1)} className="bg-gray-800 text-gray-400 w-7 h-7 rounded hover:bg-green-900/50 flex items-center justify-center font-bold">+</button>
                              </div>
                            )
                          ) : (
                            <span className="font-mono text-blue-400 font-bold text-sm pr-1">{player.acoes[acao.id] || 0}</span>
                          )}

                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}