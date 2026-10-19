import React, { useState } from 'react';

export default function PerfilAtleta({
  player, onBack, teams, SETORES, ACOES_LINHA, ACOES_GOLEIRO,
  handleSetGlobalAction, handleUpdateGlobalActions, handleDeletePlayer,
  onUpdatePlayerBio, matchHistory, isDateInRange, globalStartDate, globalEndDate
}) {
  // Controla quais abas da "sanfona" estão abertas (inicia com 'Geral' aberto)
  const [expandedCategories, setExpandedCategories] = useState({ 'Geral': true });
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isEditingStats, setIsEditingStats] = useState(false);

  const [editForm, setEditForm] = useState({
    nome: player.nome || '',
    time_nome: player.time_nome || '',
    categoria: player.categoria || '',
    setor: player.setor || '',
    funcoes: player.funcoes?.length > 0 ? player.funcoes : [],
    altura: player.altura || '',
    pe_dominante: player.pe_dominante || 'Destro',
    percentual_gordura: player.percentual_gordura || '',
    velocidade_maxima: player.velocidade_maxima || '',
    ano_nascimento: player.ano_nascimento || ''
  });

  if (!player) return null;

  const playerAcoes = player.setor === 'GOLEIRO (GK)' ? ACOES_GOLEIRO : ACOES_LINHA;
  const valoresAcoes = player.acoes_calc || player.acoes || {};

  // Agrupa as ações por categoria para o menu sanfona
  const categoriasAgrupadas = playerAcoes.reduce((acc, acao) => {
    const catName = acao.categoria || 'Estatísticas Globais';
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(acao);
    return acc;
  }, {});

  const toggleCategory = (catName) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catName]: !prev[catName]
    }));
  };

  const expandirTodas = () => {
    const todasAbertas = Object.keys(categoriasAgrupadas).every(k => expandedCategories[k]);
    const novoEstado = {};
    Object.keys(categoriasAgrupadas).forEach(k => { novoEstado[k] = !todasAbertas; });
    setExpandedCategories(novoEstado);
  };

  const handleSaveBioSubmit = async (e) => {
    e.preventDefault();
    const sucesso = await onUpdatePlayerBio(player.id, editForm);
    if (sucesso) setIsEditingBio(false);
  };

  // Filtra as partidas em que este atleta esteve presente
  const partidasDoAtleta = (matchHistory || []).filter(m => {
    if (!isDateInRange(m.criado_em, globalStartDate, globalEndDate)) return false;
    return m.dados && m.dados[player.id];
  });

  const idade = player.ano_nascimento ? `${new Date().getFullYear() - player.ano_nascimento} anos` : 'N/I';

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* BARRA DE TOPO: VOLTAR E AÇÕES RÁPIDAS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900 p-4 rounded-xl border border-gray-800 shadow-lg">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-gray-300 hover:text-white bg-gray-950 hover:bg-gray-800 px-4 py-2.5 rounded-lg border border-gray-700 transition"
        >
          ⬅️ Voltar para Base de Dados
        </button>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setIsEditingStats(!isEditingStats)}
            className={`px-4 py-2 rounded-lg text-xs font-bold border transition ${
              isEditingStats 
                ? 'bg-green-600 text-white border-green-500 shadow-lg shadow-green-900/30' 
                : 'bg-gray-950 text-blue-400 border-gray-700 hover:bg-gray-800'
            }`}
          >
            {isEditingStats ? '✔️ Concluir Edição de Dados' : '📊 Ajustar Estatísticas'}
          </button>

          <button
            onClick={() => setIsEditingBio(!isEditingBio)}
            className="px-4 py-2 bg-blue-900/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs font-bold border border-blue-900/50 transition"
          >
            {isEditingBio ? 'Cancelar Edição' : '✏️ Editar Ficha'}
          </button>

          <button
            onClick={() => {
              handleDeletePlayer(player.id, player.nome);
              onBack();
            }}
            className="px-3 py-2 bg-red-900/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-xs font-bold border border-red-900/50 transition"
            title="Excluir Atleta"
          >
            🗑️ Excluir
          </button>
        </div>
      </div>

      {/* CABEÇALHO DO PERFIL OU FORMULÁRIO DE EDIÇÃO DA FICHA */}
      {isEditingBio ? (
        <div className="bg-gray-900 p-6 rounded-xl border border-blue-500 shadow-xl">
          <h3 className="text-lg font-bold text-blue-400 mb-4">✏️ Editar Informações do Atleta</h3>
          <form onSubmit={handleSaveBioSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
                <input type="text" required value={editForm.nome} onChange={e => setEditForm({...editForm, nome: e.target.value})} className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-700 text-sm font-bold text-white outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Clube Atual</label>
                <select required value={editForm.time_nome} onChange={e => setEditForm({...editForm, time_nome: e.target.value})} className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-700 text-sm outline-none focus:border-blue-500">
                  <option value="">Selecione...</option>
                  {teams.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label>
                <input type="text" list="categorias-list" required value={editForm.categoria} onChange={e => setEditForm({...editForm, categoria: e.target.value})} className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-700 text-sm outline-none focus:border-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Setor no Campo</label>
                <select required value={editForm.setor} onChange={e => setEditForm({...editForm, setor: e.target.value, funcoes: []})} className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-700 text-sm text-green-400 font-bold outline-none focus:border-blue-500">
                  <option value="">Selecione...</option>
                  {Object.keys(SETORES).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {editForm.setor && (
                <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Funções no Campo</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SETORES[editForm.setor]?.map(f => (
                      <label key={f} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.funcoes.includes(f)}
                          onChange={e => {
                            if (e.target.checked) setEditForm({...editForm, funcoes: [...editForm.funcoes, f]});
                            else setEditForm({...editForm, funcoes: editForm.funcoes.filter(x => x !== f)});
                          }}
                          className="accent-blue-500 rounded"
                        />
                        {f}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pé Dominante</label>
                <select value={editForm.pe_dominante} onChange={e => setEditForm({...editForm, pe_dominante: e.target.value})} className="w-full p-2 bg-gray-950 rounded-lg border border-gray-700 text-xs outline-none">
                  <option value="Destro">Destro</option>
                  <option value="Canhoto">Canhoto</option>
                  <option value="Ambidestro">Ambidestro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ano Nasc.</label>
                <input type="number" value={editForm.ano_nascimento} onChange={e => setEditForm({...editForm, ano_nascimento: e.target.value})} className="w-full p-2 bg-gray-950 rounded-lg border border-gray-700 text-xs outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Altura (m)</label>
                <input type="number" step="0.01" value={editForm.altura} onChange={e => setEditForm({...editForm, altura: e.target.value})} className="w-full p-2 bg-gray-950 rounded-lg border border-gray-700 text-xs outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">% Gordura</label>
                <input type="number" step="0.1" value={editForm.percentual_gordura} onChange={e => setEditForm({...editForm, percentual_gordura: e.target.value})} className="w-full p-2 bg-gray-950 rounded-lg border border-gray-700 text-xs outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vel. Máx (km/h)</label>
                <input type="number" step="0.1" value={editForm.velocidade_maxima} onChange={e => setEditForm({...editForm, velocidade_maxima: e.target.value})} className="w-full p-2 bg-gray-950 rounded-lg border border-gray-700 text-xs outline-none" />
              </div>
            </div>

            <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition shadow-lg">
              Salvar Alterações da Ficha
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center text-3xl font-black text-white shadow-lg border border-blue-400/30">
              {player.nome.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-black text-white">{player.nome}</h1>
                <span className="bg-blue-900/40 text-blue-300 text-xs font-bold px-3 py-1 rounded-full border border-blue-800/60">
                  {player.time_nome} • {player.categoria}
                </span>
              </div>
              <p className="text-sm text-green-400 font-bold mt-1.5">
                {player.setor} <span className="text-gray-500 mx-1">|</span> <span className="text-gray-300">{player.funcoes?.join(' • ') || 'Sem função específica'}</span>
              </p>
              {(globalStartDate || globalEndDate) && (
                <p className="text-xs text-orange-400 font-bold mt-1">
                  📅 Exibindo estatísticas filtradas por período selecionado
                </p>
              )}
            </div>
          </div>

          {/* CARTÕES BIOMÉTRICOS */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 w-full lg:w-auto bg-gray-950 p-4 rounded-xl border border-gray-800">
            <div className="text-center px-3">
              <span className="text-[10px] text-gray-500 font-bold uppercase block">Idade</span>
              <span className="text-sm font-mono font-bold text-white">{idade}</span>
              {player.ano_nascimento && <span className="block text-[10px] text-gray-500">({player.ano_nascimento})</span>}
            </div>
            <div className="text-center px-3 border-l border-gray-800">
              <span className="text-[10px] text-gray-500 font-bold uppercase block">Pé Dom.</span>
              <span className="text-sm font-bold text-blue-400">{player.pe_dominante || '-'}</span>
            </div>
            <div className="text-center px-3 border-l border-gray-800">
              <span className="text-[10px] text-gray-500 font-bold uppercase block">Altura</span>
              <span className="text-sm font-mono font-bold text-white">{player.altura ? `${player.altura}m` : '-'}</span>
            </div>
            <div className="text-center px-3 border-l border-gray-800">
              <span className="text-[10px] text-gray-500 font-bold uppercase block">% Gordura</span>
              <span className="text-sm font-mono font-bold text-white">{player.percentual_gordura ? `${player.percentual_gordura}%` : '-'}</span>
            </div>
            <div className="text-center px-3 border-l border-gray-800">
              <span className="text-[10px] text-gray-500 font-bold uppercase block">Vel. Máx</span>
              <span className="text-sm font-mono font-bold text-green-400">{player.velocidade_maxima ? `${player.velocidade_maxima} km/h` : '-'}</span>
            </div>
          </div>
        </div>
      )}

      {/* GRELHA PRINCIPAL: SUBMENUS SANFONA (ESQUERDA) + HISTÓRICO DE JOGOS (DIREITA) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA 1 E 2: ESTATÍSTICAS EM ESTILO SANFONA (ACORDEÃO) */}
        <div className="lg:col-span-2 bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl space-y-4 h-fit">
          <div className="flex justify-between items-center border-b border-gray-800 pb-3">
            <div>
              <h2 className="text-xl font-bold text-white">📊 Desempenho & Estatísticas</h2>
              <p className="text-xs text-gray-400">Clique nas categorias abaixo para expandir ou recolher os dados.</p>
            </div>
            <button
              type="button"
              onClick={expandirTodas}
              className="text-xs text-blue-400 hover:text-blue-300 font-bold bg-gray-950 px-3 py-1.5 rounded-lg border border-gray-800 transition"
            >
              Expandir / Recolher Tudo
            </button>
          </div>

          <div className="space-y-3">
            {Object.keys(categoriasAgrupadas).map(catName => {
              const isOpen = !!expandedCategories[catName];
              const totalCategoria = categoriasAgrupadas[catName].reduce((sum, acao) => {
                if (acao.id === 'minutos' || acao.id === 'partidas') return sum;
                return sum + (parseInt(valoresAcoes[acao.id]) || 0);
              }, 0);

              return (
                <div key={catName} className="bg-gray-950 rounded-xl border border-gray-800 overflow-hidden transition-all">
                  {/* CABEÇALHO DA SANFONA */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(catName)}
                    className="w-full p-4 flex justify-between items-center bg-gray-950 hover:bg-gray-900/80 transition text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs uppercase font-black text-blue-400 tracking-widest">{catName}</span>
                      {catName !== 'Geral' && (
                        <span className="bg-blue-900/30 text-blue-300 text-xs font-mono font-bold px-2 py-0.5 rounded-full border border-blue-800/40">
                          {totalCategoria} ações
                        </span>
                      )}
                    </div>
                    <span className="text-gray-400 text-xs font-bold bg-gray-900 px-2.5 py-1 rounded border border-gray-800">
                      {isOpen ? 'Recolher ▲' : 'Expandir ▼'}
                    </span>
                  </button>

                  {/* CONTEÚDO DA SANFONA */}
                  {isOpen && (
                    <div className="p-4 border-t border-gray-800 bg-gray-900/40 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {categoriasAgrupadas[catName].map(acao => (
                        <div key={acao.id} className="flex justify-between items-center bg-gray-950 px-3.5 py-2.5 rounded-lg border border-gray-800/80 hover:border-gray-700 transition">
                          <span className="text-sm text-gray-300 font-medium">{acao.nome}</span>
                          
                          {isEditingStats ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateGlobalActions(player.id, acao.id, -1)}
                                className="w-7 h-7 bg-gray-800 hover:bg-red-900/60 text-gray-300 rounded font-bold flex items-center justify-center transition"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={player.acoes[acao.id] ?? 0}
                                onChange={(e) => handleSetGlobalAction(player.id, acao.id, e.target.value)}
                                className="w-16 p-1 text-center bg-gray-900 text-blue-400 font-mono font-bold text-sm rounded border border-gray-700 outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateGlobalActions(player.id, acao.id, 1)}
                                className="w-7 h-7 bg-gray-800 hover:bg-green-900/60 text-gray-300 rounded font-bold flex items-center justify-center transition"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <span className="font-mono text-lg font-black text-blue-400">
                              {valoresAcoes[acao.id] || 0}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUNA 3: HISTÓRICO DE PARTIDAS DO ATLETA */}
        <div className="lg:col-span-1 bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl h-fit space-y-4">
          <div className="border-b border-gray-800 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center justify-between">
              <span>🏟️ Jogos Registados</span>
              <span className="text-xs font-mono bg-blue-900/30 text-blue-400 px-2.5 py-0.5 rounded-full">
                {partidasDoAtleta.length}
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Partidas em que este atleta teve ações computadas.</p>
          </div>

          {partidasDoAtleta.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-xs border border-gray-800 border-dashed rounded-lg">
              Nenhuma partida registada no histórico para este atleta.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {partidasDoAtleta.map(jogo => {
                const st = jogo.dados[player.id] || {};
                return (
                  <div key={jogo.id} className="bg-gray-950 p-3.5 rounded-lg border border-gray-800 hover:border-gray-700 transition">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-bold uppercase text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded">
                        {jogo.dados?._meta?.competicao || 'Amigável'}
                      </span>
                      <span className="text-[11px] font-mono text-gray-500">
                        {new Date(jogo.criado_em).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-white mb-2">{jogo.titulo}</h4>
                    <div className="flex gap-3 text-xs font-mono border-t border-gray-900 pt-2 text-gray-400">
                      <span>⏱️ <strong>{st.minutos || 0}'</strong></span>
                      {player.setor === 'GOLEIRO (GK)' ? (
                        <>
                          <span className="text-green-400">🧤 Def: <strong>{st.defesas || 0}</strong></span>
                          <span className="text-red-400">🥅 GS: <strong>{st.gols_sofridos || 0}</strong></span>
                        </>
                      ) : (
                        <>
                          <span className="text-blue-400">⚽ Golos: <strong>{st.gols || 0}</strong></span>
                          <span className="text-green-400">👟 Assist: <strong>{st.assistencias || 0}</strong></span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}