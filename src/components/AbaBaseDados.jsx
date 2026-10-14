import React, { useState } from 'react';

export default function AbaBaseDados({
  novoJogador, setNovoJogador, teams, handleSavePlayer, editingPlayerId,
  cancelarEdicao, FilterComponent, displayedPlayers, toggleExpandPlayer,
  handleEditClick, handleDeletePlayer, expandedPlayers,
  SETORES, ACOES_LINHA, ACOES_GOLEIRO, handleSetGlobalAction, handleUpdateGlobalActions,
  competitions, newCompetitionName, setNewCompetitionName, handleAddCompetition 
}) {

  // Função para agrupar ações por categoria
  const groupActionsByCategory = (acoesArray) => {
    return acoesArray.reduce((acc, acao) => {
      if (!acc[acao.categoria]) acc[acao.categoria] = [];
      acc[acao.categoria].push(acao);
      return acc;
    }, {});
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* FORMULÁRIO DE ATLETA E COMPETIÇÕES OMITIDO AQUI (MANTENHA O SEU CÓDIGO DA ESQUERDA) */}
      <div className="lg:col-span-3">
        {FilterComponent}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedPlayers.map(player => {
            const playerAcoes = player.setor === 'GOLEIRO (GK)' ? ACOES_GOLEIRO : ACOES_LINHA;
            const categoriasAgrupadas = groupActionsByCategory(playerAcoes);

            // Ações lidas agora vêm do acoes_calc (se o filtro de datas for usado)
            const valoresAcoes = player.acoes_calc || player.acoes;

            return (
              <div key={player.id} className="bg-gray-900 p-4 rounded-xl border border-gray-800 transition h-fit">
                <div className="flex justify-between items-start cursor-pointer hover:bg-gray-800/50 p-2 -m-2 rounded transition" onClick={() => toggleExpandPlayer(player.id)}>
                  <div>
                    <h4 className="text-lg font-bold flex items-center gap-2">
                      {player.nome} <button onClick={(e) => { e.stopPropagation(); handleEditClick(player); }} className="text-blue-500">✏️</button>
                    </h4>
                    <p className="text-xs text-blue-400">{player.time_nome} • {player.categoria}</p>
                    <p className="text-xs text-green-400 font-bold mt-1">{player.setor}</p>
                  </div>
                  <span className="text-blue-500 font-bold mt-2 text-xs">{expandedPlayers.includes(player.id) ? 'Ocultar ▲' : 'Estatísticas ▼'}</span>
                </div>
                
                {expandedPlayers.includes(player.id) && (
                  <div className="mt-4 space-y-4 pt-4 border-t border-gray-800">
                    {/* Renderização Inteligente de Sub-Menus Baseado nas Categorias */}
                    {Object.keys(categoriasAgrupadas).map(catName => (
                      <div key={catName} className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                        <h5 className="text-[10px] uppercase font-black text-blue-500 mb-2 tracking-widest border-b border-gray-800 pb-1">{catName}</h5>
                        <div className="grid grid-cols-1 gap-1">
                          {categoriasAgrupadas[catName].map(acao => (
                            <div key={acao.id} className="flex justify-between items-center px-1 py-1 rounded hover:bg-gray-900/50">
                              <span className="text-xs text-gray-300 truncate pr-2">{acao.nome}</span>
                              {editingPlayerId === player.id ? (
                                <input type="number" value={player.acoes[acao.id] || 0} onChange={(e) => handleSetGlobalAction(player.id, acao.id, e.target.value)} className="w-12 p-1 text-center bg-gray-800 text-blue-400 font-bold text-xs rounded border border-gray-700 outline-none" />
                              ) : (
                                <span className="font-mono text-blue-400 font-bold text-sm pr-1">{valoresAcoes[acao.id] || 0}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}