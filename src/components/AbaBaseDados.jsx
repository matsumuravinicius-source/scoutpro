import React, { useState } from 'react';

export default function AbaBaseDados({
  novoJogador, setNovoJogador, teams, handleSavePlayer,
  FilterComponent, displayedPlayers, onSelectPlayer,
  SETORES, competitions, newCompetitionName, setNewCompetitionName,
  handleAddCompetition, handleDeleteCompetition 
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtra os atletas pelo nome digitado na barra de pesquisa rápida
  const finalPlayers = displayedPlayers.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* === LADO ESQUERDO: FORMULÁRIOS DE CADASTRO === */}
      <div className="lg:col-span-1 space-y-6">
        
        {/* Formulário de Novo Atleta */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            ➕ Cadastrar Novo Atleta
          </h2>
          
          <form onSubmit={handleSavePlayer} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
              <input type="text" required value={novoJogador.nome} onChange={e => setNovoJogador({...novoJogador, nome: e.target.value})} className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-700 outline-none text-sm text-blue-400 font-bold focus:border-blue-500" />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Clube Atual</label>
                <select required value={novoJogador.time_nome} onChange={e => setNovoJogador({...novoJogador, time_nome: e.target.value})} className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-700 outline-none text-sm focus:border-blue-500">
                  <option value="">Selecione...</option>
                  {teams.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label>
                <input type="text" list="categorias-list" required value={novoJogador.categoria} onChange={e => setNovoJogador({...novoJogador, categoria: e.target.value})} className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-700 outline-none text-sm focus:border-blue-500" placeholder="Ex: Sub-20" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Setor no Campo</label>
              <select required value={novoJogador.setor} onChange={e => {
                  const s = e.target.value;
                  setNovoJogador({...novoJogador, setor: s, funcoes: []});
              }} className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-700 outline-none text-sm focus:border-blue-500 text-green-400 font-bold">
                <option value="">Selecione...</option>
                {Object.keys(SETORES).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {novoJogador.setor && (
              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Funções / Papel (Pode escolher + de 1)</label>
                <div className="grid grid-cols-2 gap-2">
                  {SETORES[novoJogador.setor].map(f => (
                    <label key={f} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer hover:text-white">
                      <input type="checkbox" checked={novoJogador.funcoes.includes(f)} onChange={(e) => {
                        if(e.target.checked) setNovoJogador({...novoJogador, funcoes: [...novoJogador.funcoes, f]});
                        else setNovoJogador({...novoJogador, funcoes: novoJogador.funcoes.filter(x => x !== f)});
                      }} className="accent-blue-500 rounded" /> {f}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pé Dominante</label>
                <select value={novoJogador.pe_dominante} onChange={e => setNovoJogador({...novoJogador, pe_dominante: e.target.value})} className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-700 outline-none text-sm focus:border-blue-500">
                  <option value="Destro">Destro</option>
                  <option value="Canhoto">Canhoto</option>
                  <option value="Ambidestro">Ambidestro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ano Nascimento</label>
                <input type="number" placeholder="Ex: 2005" value={novoJogador.ano_nascimento} onChange={e => setNovoJogador({...novoJogador, ano_nascimento: e.target.value})} className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-700 outline-none text-sm focus:border-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Altura (m)</label>
                <input type="number" step="0.01" placeholder="1.80" value={novoJogador.altura} onChange={e => setNovoJogador({...novoJogador, altura: e.target.value})} className="w-full p-2 bg-gray-950 rounded-lg border border-gray-700 outline-none text-xs focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">% Gordura</label>
                <input type="number" step="0.1" placeholder="10.5" value={novoJogador.percentual_gordura} onChange={e => setNovoJogador({...novoJogador, percentual_gordura: e.target.value})} className="w-full p-2 bg-gray-950 rounded-lg border border-gray-700 outline-none text-xs focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vel. (km/h)</label>
                <input type="number" step="0.1" placeholder="32.4" value={novoJogador.velocidade_maxima} onChange={e => setNovoJogador({...novoJogador, velocidade_maxima: e.target.value})} className="w-full p-2 bg-gray-950 rounded-lg border border-gray-700 outline-none text-xs focus:border-blue-500" />
              </div>
            </div>

            <button type="submit" className="w-full py-3 mt-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-lg transition shadow-lg shadow-blue-900/20">
              Gravar Novo Atleta
            </button>
          </form>
        </div>

        {/* Gestão de Competições */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl">
          <h2 className="text-lg font-bold mb-4">🏆 Competições</h2>
          <form onSubmit={handleAddCompetition} className="space-y-3 mb-4">
            <div>
              <input type="text" placeholder="Nova Competição (Ex: Brasileirão)" required value={newCompetitionName} onChange={e => setNewCompetitionName(e.target.value)} className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-700 outline-none text-sm focus:border-blue-500" />
            </div>
            <button type="submit" className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-blue-400 font-bold rounded-lg transition border border-gray-700">
              Adicionar Competição
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-800">
             <h3 className="text-sm font-bold text-gray-400 mb-2">Competições Registadas:</h3>
             {competitions.length === 0 ? <p className="text-xs text-gray-600">Nenhuma competição.</p> : (
               <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                 {competitions.map(c => (
                   <div key={c} className="flex justify-between items-center bg-gray-950 p-2 rounded border border-gray-800">
                     <span className="text-sm font-bold text-blue-400">{c}</span>
                     <button type="button" onClick={() => handleDeleteCompetition(c)} className="text-red-500 bg-red-900/20 rounded p-1 text-xs hover:bg-red-500 hover:text-white transition" title="Excluir Competição e Partidas">🗑️</button>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>

      </div>

      {/* === LADO DIREITO: DIRETÓRIO DE ATLETAS (REDIRECIONAMENTO) === */}
      <div className="lg:col-span-2 space-y-4">
        {FilterComponent}

        {/* Barra de Pesquisa por Nome */}
        <div className="bg-gray-900 p-3 rounded-xl border border-gray-800 flex items-center gap-3">
          <span className="text-gray-400 pl-2">🔍</span>
          <input
            type="text"
            placeholder="Pesquisar atleta pelo nome..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-sm text-white outline-none font-bold placeholder:font-normal placeholder:text-gray-500"
          />
          <span className="text-xs font-mono text-gray-400 bg-gray-950 px-2.5 py-1 rounded border border-gray-800 whitespace-nowrap">
            {finalPlayers.length} {finalPlayers.length === 1 ? 'atleta' : 'atletas'}
          </span>
        </div>
        
        {/* Grelha de Cartões de Redirecionamento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {finalPlayers.map(player => (
            <div
              key={player.id}
              onClick={() => onSelectPlayer(player.id)}
              className="bg-gray-900 hover:bg-gray-800/80 p-5 rounded-xl border border-gray-800 hover:border-blue-500/60 transition-all cursor-pointer shadow-lg group flex justify-between items-center"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-900/30 border border-blue-800/50 flex items-center justify-center text-blue-400 font-black text-base group-hover:bg-blue-600 group-hover:text-white transition">
                  {player.nome.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-base font-bold text-white group-hover:text-blue-400 transition">
                    {player.nome}
                  </h4>
                  <p className="text-xs text-blue-400 font-bold mt-0.5">
                    {player.time_nome} • <span className="text-gray-400">{player.categoria}</span>
                  </p>
                  <p className="text-[11px] text-green-400 font-bold mt-1">
                    {player.setor} {player.funcoes?.length > 0 ? `(${player.funcoes.join(', ')})` : ''}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="text-xs font-bold text-blue-400 bg-blue-950/60 group-hover:bg-blue-600 group-hover:text-white px-3 py-1.5 rounded-lg border border-blue-800/50 transition whitespace-nowrap">
                  Ver Perfil ➔
                </span>
                <span className="text-[10px] font-mono text-gray-500">
                  {player.acoes?.partidas || 0} jogos
                </span>
              </div>
            </div>
          ))}
          
          {finalPlayers.length === 0 && (
            <div className="col-span-1 md:col-span-2 text-center py-20 text-gray-500 border border-gray-800 border-dashed rounded-xl">
              Nenhum atleta encontrado com os filtros selecionados.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}