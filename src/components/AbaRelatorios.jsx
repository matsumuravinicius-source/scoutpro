import React, { useState } from 'react';
import { getPlayerActions, getPlayerSectorLabel } from '../utils/playerSectors';

export default function AbaRelatorios({
  teams, players, matchHistory, uniqueCompetitions, uniqueCategories,
  TODAS_ACOES, ACOES_LINHA, ACOES_GOLEIRO, savedMetrics, isDateInRange, getIdade
}) {
  // Estados de Configuração do Relatório
  const [tipoRelatorio, setTipoRelatorio] = useState('atleta'); // 'atleta' ou 'equipe'
  const [tituloRelatorio, setTituloRelatorio] = useState('Relatório Técnico de Desempenho');
  const [observacoes, setObservacoes] = useState('');

  // Filtros de Alvo e Tempo
  const [clubeSelecionado, setClubeSelecionado] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('');
  const [atletaSelecionadoId, setAtletaSelecionadoId] = useState('');
  const [competicaoFiltro, setCompeticaoFiltro] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Controlo do que exibir no relatório
  const [mostrarBio, setMostrarBio] = useState(true);
  const [mostrarHistoricoJogos, setMostrarHistoricoJogos] = useState(true);
  const [acoesSelecionadas, setAcoesSelecionadas] = useState(() => TODAS_ACOES.map(a => a.id));
  const [metricasAvancadasSel, setMetricasAvancadasSel] = useState(() => savedMetrics?.map(m => m.id) || []);

  // Filtragem de jogadores para o dropdown
  const jogadoresFiltrados = players.filter(p => {
    if (clubeSelecionado && p.time_nome !== clubeSelecionado) return false;
    if (categoriaSelecionada && p.categoria !== categoriaSelecionada) return false;
    return true;
  });

  const atletaObj = players.find(p => p.id === atletaSelecionadoId);

  // Funções para marcar/desmarcar caixas de seleção
  const toggleAcao = (id) => {
    setAcoesSelecionadas(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleMetricaAvancada = (id) => {
    setMetricasAvancadasSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selecionarTodasAcoes = () => {
    if (acoesSelecionadas.length === TODAS_ACOES.length) setAcoesSelecionadas([]);
    else setAcoesSelecionadas(TODAS_ACOES.map(a => a.id));
  };

  // ==========================================
  // CÁLCULO DE DADOS PARA O RELATÓRIO
  // ==========================================
  
  // 1. Dados do Atleta
  const getDadosAtleta = () => {
    if (!atletaObj) return { stats: {}, jogosParticipados: [] };
    
    const temFiltro = dataInicio || dataFim || competicaoFiltro;
    const jogosParticipados = matchHistory.filter(m => {
      if (!m.dados || !m.dados[atletaObj.id]) return false;
      if (competicaoFiltro && m.dados._meta?.competicao !== competicaoFiltro) return false;
      if (!isDateInRange(m.criado_em, dataInicio, dataFim)) return false;
      return true;
    });

    if (!temFiltro) {
      return { stats: atletaObj.acoes || {}, jogosParticipados };
    }

    const statsCalculados = {};
    TODAS_ACOES.forEach(a => statsCalculados[a.id] = 0);

    jogosParticipados.forEach(m => {
      const st = m.dados[atletaObj.id];
      Object.keys(st).forEach(k => {
        statsCalculados[k] = (statsCalculados[k] || 0) + (parseInt(st[k]) || 0);
      });
    });

    return { stats: statsCalculados, jogosParticipados };
  };

  // 2. Dados da Equipa
  const getDadosEquipe = () => {
    if (!clubeSelecionado) return { stats: {}, jogosEquipe: [], golsSofridos: 0, finAdversario: 0 };

    const jogadoresClube = players.filter(p => p.time_nome === clubeSelecionado && (!categoriaSelecionada || p.categoria === categoriaSelecionada));
    const idsJogadoresClube = jogadoresClube.map(p => p.id);

    const jogosEquipe = matchHistory.filter(m => {
      if (!m.dados?._meta?.equipes?.includes(clubeSelecionado)) return false;
      if (competicaoFiltro && m.dados._meta?.competicao !== competicaoFiltro) return false;
      if (!isDateInRange(m.criado_em, dataInicio, dataFim)) return false;
      // Se filtrou categoria, verifica se algum jogador dessa categoria atuou
      if (categoriaSelecionada) {
        const atuouCat = Object.keys(m.dados).some(k => k !== '_meta' && idsJogadoresClube.includes(k));
        if (!atuouCat) return false;
      }
      return true;
    });

    const statsEquipe = {};
    TODAS_ACOES.forEach(a => statsEquipe[a.id] = 0);

    const temFiltro = dataInicio || dataFim || competicaoFiltro;

    if (temFiltro) {
      jogosEquipe.forEach(m => {
        Object.keys(m.dados).forEach(pId => {
          if (pId !== '_meta' && idsJogadoresClube.includes(pId)) {
            const st = m.dados[pId];
            Object.keys(st).forEach(k => {
              statsEquipe[k] = (statsEquipe[k] || 0) + (parseInt(st[k]) || 0);
            });
          }
        });
      });
    } else {
      jogadoresClube.forEach(p => {
        Object.keys(p.acoes || {}).forEach(k => {
          statsEquipe[k] = (statsEquipe[k] || 0) + (parseInt(p.acoes[k]) || 0);
        });
      });
    }

    statsEquipe.partidas = jogosEquipe.length;
    const golsSofridos = jogosEquipe.reduce((acc, m) => acc + (parseInt(m.dados?._meta?.gols_sofridos) || 0), 0);
    const finAdversario = jogosEquipe.reduce((acc, m) => acc + (parseInt(m.dados?._meta?.finalizacoes_adversario) || 0), 0);

    return { stats: statsEquipe, jogosEquipe, golsSofridos, finAdversario, totalAtletas: jogadoresClube.length };
  };

  const dadosAtleta = tipoRelatorio === 'atleta' ? getDadosAtleta() : null;
  const dadosEquipe = tipoRelatorio === 'equipe' ? getDadosEquipe() : null;
  const statsAtuais = tipoRelatorio === 'atleta' ? dadosAtleta?.stats : dadosEquipe?.stats;

  // Agrupamento das ações selecionadas para exibição limpa
  const acoesParaExibir = TODAS_ACOES.filter(a => {
    if (!acoesSelecionadas.includes(a.id)) return false;
    if (tipoRelatorio === 'atleta' && atletaObj) {
      const listaValida = getPlayerActions(atletaObj, ACOES_LINHA, ACOES_GOLEIRO);
      return listaValida.some(x => x.id === a.id);
    }
    return true;
  });

  const categoriasExibicao = acoesParaExibir.reduce((acc, acao) => {
    const cat = acao.categoria || 'Geral';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(acao);
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      {/* ==========================================
          PAINEL ESQUERDO: CONSTRUTOR (Oculto na Impressão)
          ========================================== */}
      <div className="lg:col-span-4 space-y-6 print:hidden">
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl space-y-5">
          <div>
            <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2">📋 Construtor de Relatório</h2>
            <p className="text-xs text-gray-400 mt-1">Configure os filtros e marque os dados que deseja incluir na folha de visualização.</p>
          </div>

          {/* Alternador Atleta vs Equipa */}
          <div className="grid grid-cols-2 bg-gray-950 p-1 rounded-lg border border-gray-800">
            <button
              type="button"
              onClick={() => setTipoRelatorio('atleta')}
              className={`py-2 text-xs font-bold rounded-md transition ${tipoRelatorio === 'atleta' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
              👤 Relatório de Atleta
            </button>
            <button
              type="button"
              onClick={() => setTipoRelatorio('equipe')}
              className={`py-2 text-xs font-bold rounded-md transition ${tipoRelatorio === 'equipe' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
              🛡️ Relatório de Equipa
            </button>
          </div>

          {/* Título Personalizado */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título do Documento</label>
            <input
              type="text"
              value={tituloRelatorio}
              onChange={e => setTituloRelatorio(e.target.value)}
              className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-700 text-sm font-bold text-white outline-none focus:border-blue-500"
            />
          </div>

          {/* Seleção de Clube / Categoria / Atleta */}
          <div className="space-y-3 bg-gray-950 p-3 rounded-lg border border-gray-800">
            <h3 className="text-xs font-black text-blue-500 uppercase tracking-wider">1. Selecionar Alvo</h3>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Clube</label>
                <select
                  value={clubeSelecionado}
                  onChange={e => { setClubeSelecionado(e.target.value); setAtletaSelecionadoId(''); }}
                  className="w-full p-2 bg-gray-900 rounded border border-gray-700 text-xs outline-none focus:border-blue-500"
                >
                  <option value="">{tipoRelatorio === 'equipe' ? 'Selecione o Clube...' : 'Todos os Clubes'}</option>
                  {teams.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Categoria</label>
                <select
                  value={categoriaSelecionada}
                  onChange={e => { setCategoriaSelecionada(e.target.value); setAtletaSelecionadoId(''); }}
                  className="w-full p-2 bg-gray-900 rounded border border-gray-700 text-xs outline-none focus:border-blue-500"
                >
                  <option value="">Todas</option>
                  {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {tipoRelatorio === 'atleta' && (
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Atleta</label>
                <select
                  value={atletaSelecionadoId}
                  onChange={e => setAtletaSelecionadoId(e.target.value)}
                  className="w-full p-2.5 bg-blue-900/20 border border-blue-900/50 text-blue-300 font-bold text-sm rounded outline-none focus:border-blue-500"
                >
                  <option value="">Escolha o Atleta...</option>
                  {jogadoresFiltrados.map(p => (
                    <option key={p.id} value={p.id}>{p.nome} ({getPlayerSectorLabel(p)})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Filtros de Período e Competição */}
          <div className="space-y-3 bg-gray-950 p-3 rounded-lg border border-gray-800">
            <h3 className="text-xs font-black text-blue-500 uppercase tracking-wider">2. Período e Competição</h3>
            
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Competição</label>
              <select
                value={competicaoFiltro}
                onChange={e => setCompeticaoFiltro(e.target.value)}
                className="w-full p-2 bg-gray-900 rounded border border-gray-700 text-xs outline-none"
              >
                <option value="">Todas as Competições (Acumulado)</option>
                {uniqueCompetitions?.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">De:</label>
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full p-1.5 bg-gray-900 rounded border border-gray-700 text-xs text-blue-400 font-bold outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Até:</label>
                <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full p-1.5 bg-gray-900 rounded border border-gray-700 text-xs text-blue-400 font-bold outline-none" />
              </div>
            </div>
          </div>

          {/* Secções Visíveis e Métricas */}
          <div className="space-y-3 bg-gray-950 p-3 rounded-lg border border-gray-800">
            <h3 className="text-xs font-black text-blue-500 uppercase tracking-wider">3. O que exibir no Relatório?</h3>
            
            <div className="flex flex-col gap-2 pb-2 border-b border-gray-800">
              {tipoRelatorio === 'atleta' && (
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={mostrarBio} onChange={e => setMostrarBio(e.target.checked)} className="accent-blue-500" />
                  Mostrar Dados Biométricos e Perfil Físico
                </label>
              )}
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input type="checkbox" checked={mostrarHistoricoJogos} onChange={e => setMostrarHistoricoJogos(e.target.checked)} className="accent-blue-500" />
                Mostrar Lista de Partidas Disputadas no Período
              </label>
            </div>

            {/* Escolha de Ações */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Estatísticas / Ações</span>
                <button type="button" onClick={selecionarTodasAcoes} className="text-[10px] text-blue-400 hover:underline font-bold">
                  {acoesSelecionadas.length === TODAS_ACOES.length ? 'Desmarcar Todas' : 'Marcar Todas'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                {TODAS_ACOES.map(acao => (
                  <label key={acao.id} className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer hover:text-white truncate">
                    <input
                      type="checkbox"
                      checked={acoesSelecionadas.includes(acao.id)}
                      onChange={() => toggleAcao(acao.id)}
                      className="accent-blue-500"
                    />
                    <span className="truncate">{acao.nome}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Escolha de Índices Avançados */}
            {savedMetrics && savedMetrics.length > 0 && (
              <div className="pt-2 border-t border-gray-800">
                <span className="block text-[10px] font-bold text-green-400 uppercase mb-2">Índices da Análise Avançada</span>
                <div className="grid grid-cols-1 gap-1.5 max-h-32 overflow-y-auto">
                  {savedMetrics.map(m => (
                    <label key={m.id} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={metricasAvancadasSel.includes(m.id)}
                        onChange={() => toggleMetricaAvancada(m.id)}
                        className="accent-green-500"
                      />
                      <span>{m.nome}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Observações do Analista */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Parecer Técnico / Observações</label>
            <textarea
              rows="3"
              placeholder="Escreva aqui a análise tática, pontos fortes, pontos a melhorar..."
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-700 text-xs text-white outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-black rounded-lg transition shadow-lg flex items-center justify-center gap-2"
          >
            🖨️ Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {/* ==========================================
          PAINEL DIREITO: FOLHA DO RELATÓRIO (Preview)
          ========================================== */}
      <div className="lg:col-span-8 print:col-span-12">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 shadow-2xl min-h-[750px] flex flex-col justify-between">
          
          {(tipoRelatorio === 'atleta' && !atletaObj) || (tipoRelatorio === 'equipe' && !clubeSelecionado) ? (
            <div className="my-auto text-center py-24 text-gray-500 border-2 border-gray-800 border-dashed rounded-xl">
              <div className="text-5xl mb-4">📄</div>
              <h3 className="text-lg font-bold text-gray-300 mb-1">Folha de Relatório em Branco</h3>
              <p className="text-sm">Selecione um {tipoRelatorio === 'atleta' ? 'Atleta' : 'Clube'} no painel à esquerda para gerar a visualização dos dados.</p>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* CABEÇALHO DO DOCUMENTO */}
              <div className="border-b-2 border-blue-600 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-blue-400 block mb-1">
                    SCOUTPRO • {tipoRelatorio === 'atleta' ? 'FICHA INDIVIDUAL DE ATLETA' : 'DOSSIÊ COLETIVO DE EQUIPA'}
                  </span>
                  <h1 className="text-3xl font-black text-white">{tituloRelatorio}</h1>
                </div>
                <div className="text-left md:text-right text-xs text-gray-400 space-y-0.5 font-mono">
                  <div><strong>Emissão:</strong> {new Date().toLocaleDateString()}</div>
                  <div><strong>Competição:</strong> {competicaoFiltro || 'Todas (Global)'}</div>
                  {(dataInicio || dataFim) && (
                    <div>
                      <strong>Período:</strong> {dataInicio ? dataInicio.split('-').reverse().join('/') : 'Início'} até {dataFim ? dataFim.split('-').reverse().join('/') : 'Hoje'}
                    </div>
                  )}
                </div>
              </div>

              {/* IDENTIFICAÇÃO DO ALVO (ATLETA OU CLUBE) */}
              {tipoRelatorio === 'atleta' && atletaObj && (
                <div className="bg-gray-950 p-6 rounded-xl border border-gray-800 flex flex-col md:flex-row justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-black text-white">{atletaObj.nome}</h2>
                      <span className="bg-blue-900/40 text-blue-300 text-xs font-bold px-3 py-1 rounded-full border border-blue-800">
                        {atletaObj.time_nome} • {atletaObj.categoria}
                      </span>
                    </div>
                    <p className="text-sm text-green-400 font-bold mt-2">
                      Setores: {getPlayerSectorLabel(atletaObj)} | Funções: {atletaObj.funcoes?.join(' • ') || 'Não especificada'}
                    </p>
                  </div>

                  {mostrarBio && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center bg-gray-900 p-3 rounded-lg border border-gray-800">
                      <div className="px-2">
                        <span className="text-[10px] text-gray-500 uppercase block font-bold">Idade / Nasc.</span>
                        <span className="text-sm font-mono font-bold text-white">
                          {atletaObj.ano_nascimento ? `${new Date().getFullYear() - atletaObj.ano_nascimento} anos (${atletaObj.ano_nascimento})` : '-'}
                        </span>
                      </div>
                      <div className="px-2 border-l border-gray-800">
                        <span className="text-[10px] text-gray-500 uppercase block font-bold">Pé Dom.</span>
                        <span className="text-sm font-bold text-blue-400">{atletaObj.pe_dominante || '-'}</span>
                      </div>
                      <div className="px-2 border-l border-gray-800">
                        <span className="text-[10px] text-gray-500 uppercase block font-bold">Altura / %G</span>
                        <span className="text-sm font-mono font-bold text-white">{atletaObj.altura || 0}m | {atletaObj.percentual_gordura || 0}%</span>
                      </div>
                      <div className="px-2 border-l border-gray-800">
                        <span className="text-[10px] text-gray-500 uppercase block font-bold">Vel. Máx</span>
                        <span className="text-sm font-mono font-bold text-green-400">{atletaObj.velocidade_maxima || 0} km/h</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tipoRelatorio === 'equipe' && clubeSelecionado && (
                <div className="bg-gray-950 p-6 rounded-xl border border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                      🛡️ {clubeSelecionado}
                      {categoriaSelecionada && <span className="text-sm bg-blue-900/40 text-blue-300 px-3 py-1 rounded-full">{categoriaSelecionada}</span>}
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">Plantel contabilizado: <strong>{dadosEquipe.totalAtletas} atletas registados</strong></p>
                  </div>
                  <div className="flex gap-4 bg-gray-900 p-3 rounded-lg border border-gray-800 text-center">
                    <div className="px-2">
                      <span className="text-[10px] text-gray-500 uppercase block font-bold">Jogos no Filtro</span>
                      <span className="text-lg font-mono font-black text-white">{dadosEquipe.jogosEquipe.length}</span>
                    </div>
                    <div className="px-2 border-l border-gray-800">
                      <span className="text-[10px] text-red-400 uppercase block font-bold">Golos Sofridos</span>
                      <span className="text-lg font-mono font-black text-red-400">{dadosEquipe.golsSofridos}</span>
                    </div>
                    <div className="px-2 border-l border-gray-800">
                      <span className="text-[10px] text-orange-400 uppercase block font-bold">Fin. Adversário</span>
                      <span className="text-lg font-mono font-black text-orange-400">{dadosEquipe.finAdversario}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* GRELHA DE ESTATÍSTICAS SELECIONADAS */}
              {Object.keys(categoriasExibicao).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 border-b border-gray-800 pb-2">
                    📊 Indicadores Quantitativos
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(categoriasExibicao).map(catName => (
                      <div key={catName} className="bg-gray-950 p-4 rounded-xl border border-gray-800">
                        <h4 className="text-xs font-black uppercase text-blue-400 mb-3 tracking-wider border-b border-gray-800 pb-1">
                          {catName}
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {categoriasExibicao[catName].map(acao => (
                            <div key={acao.id} className="bg-gray-900 p-2.5 rounded-lg border border-gray-800/60 flex justify-between items-center">
                              <span className="text-xs text-gray-300 truncate pr-2">{acao.nome}</span>
                              <span className="font-mono text-base font-black text-blue-400">{statsAtuais?.[acao.id] || 0}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ÍNDICES AVANÇADOS (FÓRMULAS) */}
              {savedMetrics && metricasAvancadasSel.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-black uppercase tracking-widest text-green-400 border-b border-gray-800 pb-2">
                    ⚡ Índices de Eficiência (Análise Cruzada)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {savedMetrics.filter(m => metricasAvancadasSel.includes(m.id)).map(m => {
                      const num = parseFloat(statsAtuais?.[m.numerador]) || 0;
                      const den = parseFloat(statsAtuais?.[m.denominador]) || 0;
                      const res = den === 0 ? '0.000' : (num / den).toFixed(3);
                      const nomeNum = TODAS_ACOES.find(a => a.id === m.numerador)?.nome || m.numerador;
                      const nomeDen = TODAS_ACOES.find(a => a.id === m.denominador)?.nome || m.denominador;

                      return (
                        <div key={m.id} className="bg-gray-950 p-4 rounded-xl border border-gray-800 flex flex-col justify-between">
                          <div>
                            <span className="text-xs font-bold text-white block">{m.nome}</span>
                            <span className="text-[10px] text-gray-500 block mt-0.5">{nomeNum} ÷ {nomeDen}</span>
                          </div>
                          <div className="flex justify-between items-baseline mt-4 pt-2 border-t border-gray-900">
                            <span className="text-xs font-mono text-gray-400">({num} / {den})</span>
                            <span className="text-xl font-mono font-black text-green-400">{res}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* HISTÓRICO DE PARTIDAS NO PERÍODO */}
              {mostrarHistoricoJogos && (
                <div className="space-y-3">
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 border-b border-gray-800 pb-2">
                    🏟️ Registo de Partidas Contabilizadas
                  </h3>
                  {((tipoRelatorio === 'atleta' ? dadosAtleta.jogosParticipados : dadosEquipe.jogosEquipe) || []).length === 0 ? (
                    <p className="text-xs text-gray-500 italic">Nenhuma partida registada no histórico para os filtros selecionados.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-gray-800 text-gray-400 bg-gray-950">
                            <th className="p-2.5">Data</th>
                            <th className="p-2.5">Competição</th>
                            <th className="p-2.5">Jogo / Adversário</th>
                            {tipoRelatorio === 'atleta' ? (
                              <>
                                <th className="p-2.5 text-center">Min.</th>
                                <th className="p-2.5 text-center text-blue-400">Golos</th>
                                <th className="p-2.5 text-center text-green-400">Assist.</th>
                              </>
                            ) : (
                              <th className="p-2.5 text-center text-red-400">Golos Sofridos</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {(tipoRelatorio === 'atleta' ? dadosAtleta.jogosParticipados : dadosEquipe.jogosEquipe).map(jogo => {
                            const stAtleta = tipoRelatorio === 'atleta' ? (jogo.dados?.[atletaObj.id] || {}) : {};
                            return (
                              <tr key={jogo.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                                <td className="p-2.5 font-mono text-gray-400">{new Date(jogo.criado_em).toLocaleDateString()}</td>
                                <td className="p-2.5 font-bold text-blue-400">{jogo.dados?._meta?.competicao || '-'}</td>
                                <td className="p-2.5 font-bold text-white">{jogo.titulo}</td>
                                {tipoRelatorio === 'atleta' ? (
                                  <>
                                    <td className="p-2.5 text-center font-mono">{stAtleta.minutos || 0}'</td>
                                    <td className="p-2.5 text-center font-mono font-bold text-blue-400">{stAtleta.gols || 0}</td>
                                    <td className="p-2.5 text-center font-mono font-bold text-green-400">{stAtleta.assistencias || 0}</td>
                                  </>
                                ) : (
                                  <td className="p-2.5 text-center font-mono font-bold text-red-400">{jogo.dados?._meta?.gols_sofridos || 0}</td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* PARECER TÉCNICO / OBSERVAÇÕES */}
              {observacoes.trim() !== '' && (
                <div className="bg-gray-950 p-5 rounded-xl border border-l-4 border-gray-800 border-l-blue-500">
                  <h3 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-2">
                    📝 Parecer Técnico e Observações
                  </h3>
                  <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{observacoes}</p>
                </div>
              )}

            </div>
          )}

          {/* RODAPÉ DO DOCUMENTO */}
          <div className="mt-12 pt-4 border-t border-gray-800 flex justify-between items-center text-[10px] text-gray-500 uppercase tracking-widest">
            <span>Documento Confidencial • Departamento de Scouting e Análise</span>
            <span>Gerado via ScoutPro</span>
          </div>

        </div>
      </div>

    </div>
  );
}
