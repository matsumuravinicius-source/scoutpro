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

export default function PerfilAtleta({
  player, onBack, teams, SETORES, ACOES_LINHA, ACOES_GOLEIRO,
  handleSetGlobalAction, handleUpdateGlobalActions, handleDeletePlayer,
  onUpdatePlayerBio, matchHistory, isDateInRange, uniqueCompetitions
}) {
  const [expandedCategories, setExpandedCategories] = useState({ 'Geral': true });
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isEditingStats, setIsEditingStats] = useState(false);

  // NOVOS ESTADOS: Filtros locais de data e competição para o perfil do atleta
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroCompeticao, setFiltroCompeticao] = useState('');
  const [mapaJogoSelecionado, setMapaJogoSelecionado] = useState('');

  // Estados da Playlist de Vídeo
  const [selectedActionForVideo, setSelectedActionForVideo] = useState(null);
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [clipSeekCounter, setClipSeekCounter] = useState(0);
  const [preRollSeconds, setPreRollSeconds] = useState(3);

  const [editForm, setEditForm] = useState({
    nome: player?.nome || '',
    time_nome: player?.time_nome || '',
    categoria: player?.categoria || '',
    setor: player?.setor || '',
    funcoes: player?.funcoes?.length > 0 ? player.funcoes : [],
    altura: player?.altura || '',
    pe_dominante: player?.pe_dominante || 'Destro',
    percentual_gordura: player?.percentual_gordura || '',
    velocidade_maxima: player?.velocidade_maxima || '',
    ano_nascimento: player?.ano_nascimento || ''
  });

  if (!player) return null;

  const playerAcoes = player.setor === 'GOLEIRO (GK)' ? ACOES_GOLEIRO : ACOES_LINHA;

  // Filtragem de partidas do atleta considerando os filtros locais de data e competição
  const partidasDoAtleta = (matchHistory || []).filter(m => {
    if (!m.dados || !m.dados[player.id]) return false;
    if (filtroCompeticao && m.dados?._meta?.competicao !== filtroCompeticao) return false;
    if (!isDateInRange(m.criado_em, filtroDataInicio, filtroDataFim)) return false;
    return true;
  });
  const partidasComMapa = partidasDoAtleta.filter(match => match.dados?._meta?.fieldEvents?.some(event => event.playerId === player.id));
  const acoesNoMapa = partidasComMapa.flatMap(match => match.dados._meta.fieldEvents.filter(event => event.playerId === player.id));
  const acoesVisiveisNoMapa = mapaJogoSelecionado
    ? (partidasComMapa.find(match => match.id === mapaJogoSelecionado)?.dados?._meta?.fieldEvents || []).filter(event => event.playerId === player.id)
    : acoesNoMapa;

  // Cálculo dinâmico das estatísticas do atleta com base nos filtros aplicados na página de perfil
  const getStatsFiltrados = () => {
    if (!filtroDataInicio && !filtroDataFim && !filtroCompeticao) {
      return player.acoes || {};
    }
    const computed = {};
    playerAcoes.forEach(a => computed[a.id] = 0);

    partidasDoAtleta.forEach(m => {
      const st = m.dados[player.id];
      Object.keys(st).forEach(k => {
        computed[k] = (computed[k] || 0) + (parseInt(st[k]) || 0);
      });
    });
    return computed;
  };

  const valoresAcoes = getStatsFiltrados();

  const categoriasAgrupadas = playerAcoes.reduce((acc, acao) => {
    const catName = acao.categoria || 'Estatísticas Globais';
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(acao);
    return acc;
  }, {});

  const toggleCategory = (catName) => {
    setExpandedCategories(prev => ({ ...prev, [catName]: !prev[catName] }));
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

  const getClipsForAction = (acaoObj) => {
    if (!acaoObj) return [];
    const clips = [];

    partidasDoAtleta.forEach(partida => {
      const logs = partida.dados?._meta?.eventLog || [];
      const ytId = extractYouTubeId(partida.dados?._meta?.videoUrl);
      const offsetT1 = timeToSeconds(partida.dados?._meta?.offsetT1 || '00:00');
      const offsetT2 = timeToSeconds(partida.dados?._meta?.offsetT2 || '45:00');

      logs.forEach(log => {
        if (!log.includes('•')) return;
        const matchTime = log.match(/\[T(\d+)\s*-\s*(\d{2}:\d{2})\]/);
        if (!matchTime) return;

        const afterBracket = log.split(']')[1] || '';
        const [playerPart, actionPart] = afterBracket.split('•').map(s => s.trim());

        if (playerPart === player.nome && actionPart === acaoObj.nome) {
          const period = parseInt(matchTime[1]);
          const eventSec = timeToSeconds(matchTime[2]);
          const baseOffset = period === 1 ? offsetT1 : offsetT2;
          const targetSecond = Math.max(0, baseOffset + eventSec - preRollSeconds);

          clips.push({
            matchId: partida.id,
            matchTitle: partida.titulo,
            matchDate: new Date(partida.criado_em).toLocaleDateString(),
            competition: partida.dados?._meta?.competicao || 'Partida',
            period,
            timeStr: matchTime[2],
            logText: log,
            ytId,
            targetSecond
          });
        }
      });
    });

    return clips;
  };

  const actionClips = selectedActionForVideo ? getClipsForAction(selectedActionForVideo) : [];
  const currentClip = actionClips[activeClipIndex] || null;

  const handleSelectActionVideo = (acao) => {
    if (isEditingStats || ['partidas', 'minutos'].includes(acao.id)) return;
    if (selectedActionForVideo?.id === acao.id) {
      setSelectedActionForVideo(null);
    } else {
      setSelectedActionForVideo(acao);
      setActiveClipIndex(0);
      setClipSeekCounter(prev => prev + 1);
    }
  };

  const idade = player.ano_nascimento ? `${new Date().getFullYear() - player.ano_nascimento} anos` : 'N/I';

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* BARRA DE TOPO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900 p-4 rounded-xl border border-gray-800 shadow-lg">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-gray-300 hover:text-white bg-gray-950 hover:bg-gray-800 px-4 py-2.5 rounded-lg border border-gray-700 transition"
        >
          ⬅️ Voltar para Base de Dados
        </button>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => { setIsEditingStats(!isEditingStats); setSelectedActionForVideo(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold border transition ${
              isEditingStats ? 'bg-green-600 text-white border-green-500 shadow-lg' : 'bg-gray-950 text-blue-400 border-gray-700 hover:bg-gray-800'
            }`}
          >
            {isEditingStats ? '✔️ Concluir Edição' : '📊 Ajustar Estatísticas'}
          </button>
          <button
            onClick={() => setIsEditingBio(!isEditingBio)}
            className="px-4 py-2 bg-blue-900/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs font-bold border border-blue-900/50 transition"
          >
            {isEditingBio ? 'Cancelar' : '✏️ Editar Ficha'}
          </button>
          <button
            onClick={() => { handleDeletePlayer(player.id, player.nome); onBack(); }}
            className="px-3 py-2 bg-red-900/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-xs font-bold border border-red-900/50 transition"
          >
            🗑️ Excluir
          </button>
        </div>
      </div>

      {/* FILTROS LOCAIS DE PERFIL (DATA E COMPETIÇÃO) */}
      <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex flex-col md:flex-row items-center gap-4">
        <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
          🔍 Filtrar Perfil:
        </div>
        <div className="flex items-center gap-2 flex-1 w-full bg-gray-950 p-1 rounded border border-gray-700">
          <span className="text-gray-500 text-xs font-bold px-2 uppercase">De:</span>
          <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} className="bg-transparent outline-none text-xs w-full text-blue-400 font-bold" />
          <span className="text-gray-500 text-xs font-bold px-2 uppercase border-l border-gray-700">Até:</span>
          <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} className="bg-transparent outline-none text-xs w-full text-blue-400 font-bold" />
        </div>
        <select
          value={filtroCompeticao}
          onChange={e => setFiltroCompeticao(e.target.value)}
          className="p-2 bg-gray-950 border border-gray-700 rounded text-xs text-blue-400 font-bold outline-none w-full md:w-64"
        >
          <option value="">Todas as Competições</option>
          {uniqueCompetitions?.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* CABEÇALHO DO PERFIL */}
      {isEditingBio ? (
        <div className="bg-gray-900 p-6 rounded-xl border border-blue-500 shadow-xl">
          <h3 className="text-lg font-bold text-blue-400 mb-4">✏️ Editar Informações do Atleta</h3>
          <form onSubmit={handleSaveBioSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
                <input type="text" required value={editForm.nome} onChange={e => setEditForm({...editForm, nome: e.target.value})} className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-700 text-sm font-bold text-white outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Clube Atual</label>
                <select required value={editForm.time_nome} onChange={e => setEditForm({...editForm, time_nome: e.target.value})} className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-700 text-sm outline-none">
                  <option value="">Selecione...</option>
                  {teams.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label>
                <input type="text" list="categorias-list" required value={editForm.categoria} onChange={e => setEditForm({...editForm, categoria: e.target.value})} className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-700 text-sm outline-none" />
              </div>
            </div>
            <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition">Salvar Alterações</button>
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
                {player.setor} <span className="text-gray-500 mx-1">|</span> <span className="text-gray-300">{player.funcoes?.join(' • ') || 'Sem função'}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 w-full lg:w-auto bg-gray-950 p-4 rounded-xl border border-gray-800">
            <div className="text-center px-3"><span className="text-[10px] text-gray-500 font-bold uppercase block">Idade</span><span className="text-sm font-mono font-bold text-white">{idade}</span></div>
            <div className="text-center px-3 border-l border-gray-800"><span className="text-[10px] text-gray-500 font-bold uppercase block">Pé Dom.</span><span className="text-sm font-bold text-blue-400">{player.pe_dominante || '-'}</span></div>
            <div className="text-center px-3 border-l border-gray-800"><span className="text-[10px] text-gray-500 font-bold uppercase block">Altura</span><span className="text-sm font-mono font-bold text-white">{player.altura ? `${player.altura}m` : '-'}</span></div>
            <div className="text-center px-3 border-l border-gray-800"><span className="text-[10px] text-gray-500 font-bold uppercase block">% Gordura</span><span className="text-sm font-mono font-bold text-white">{player.percentual_gordura ? `${player.percentual_gordura}%` : '-'}</span></div>
            <div className="text-center px-3 border-l border-gray-800"><span className="text-[10px] text-gray-500 font-bold uppercase block">Vel. Máx</span><span className="text-sm font-mono font-bold text-green-400">{player.velocidade_maxima ? `${player.velocidade_maxima} km/h` : '-'}</span></div>
          </div>
        </div>
      )}

      {/* PLAYLIST DE LANCES EM VÍDEO */}
      {selectedActionForVideo && (
        <div className="bg-gray-900 p-6 rounded-xl border-2 border-blue-500 shadow-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-gray-800 pb-3">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              {selectedActionForVideo.nome} — {player.nome} ({actionClips.length} lances)
            </h3>
            <button onClick={() => setSelectedActionForVideo(null)} className="px-3 py-1.5 bg-red-900/30 text-red-400 text-xs font-bold rounded-lg border border-red-900/50">✕ Fechar</button>
          </div>
          {actionClips.length === 0 ? (
            <div className="text-center py-12 bg-gray-950 rounded-xl text-gray-400 text-sm">Nenhum momento registado para esta ação com os filtros atuais.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-2">
                {currentClip?.ytId ? (
                  <div className="aspect-video w-full bg-black rounded-xl overflow-hidden border border-gray-800 shadow-lg">
                    <iframe
                      key={`${currentClip.ytId}-${currentClip.targetSecond}-${clipSeekCounter}`}
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${currentClip.ytId}?start=${currentClip.targetSecond}&autoplay=1&rel=0`}
                      title="Reprodutor"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-gray-950 rounded-xl flex items-center justify-center p-6 text-center text-xs text-gray-500">Partida sem link do YouTube associado.</div>
                )}
              </div>
              <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 flex flex-col max-h-[350px] overflow-y-auto space-y-2">
                {actionClips.map((clip, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setActiveClipIndex(idx); setClipSeekCounter(prev => prev + 1); }}
                    className={`w-full text-left p-2.5 rounded border text-xs ${idx === activeClipIndex ? 'bg-blue-900/30 border-blue-500 text-white' : 'bg-gray-900/60 border-gray-800 text-gray-300'}`}
                  >
                    <div className="font-bold">{clip.matchTitle}</div>
                    <div className="text-green-400 font-mono text-[10px]">▶ {clip.period}ºT - {clip.timeStr}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <section className="bg-gray-900 p-5 rounded-xl border border-gray-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div><h2 className="text-lg font-bold text-white">🗺️ Mapa de ações</h2><p className="text-xs text-gray-500">Todas as ações deste atleta registradas no campo.</p></div>
          <select aria-label="Filtrar mapa por partida" value={mapaJogoSelecionado} onChange={event => setMapaJogoSelecionado(event.target.value)} className="p-2 bg-gray-950 border border-gray-700 rounded text-xs text-blue-300 font-bold w-full sm:w-72">
            <option value="">Todos os jogos</option>
            {partidasComMapa.map(match => <option key={match.id} value={match.id}>{match.titulo} · {new Date(match.criado_em).toLocaleDateString()}</option>)}
          </select>
        </div>
        {acoesVisiveisNoMapa.length ? <CampoFutebol events={acoesVisiveisNoMapa} title="" /> : <p className="text-sm text-gray-500 bg-gray-950 rounded-lg p-4">Nenhuma ação de campo registrada para este atleta{mapaJogoSelecionado ? ' nesta partida' : ''}.</p>}
      </section>

      {/* SANFONA DE ESTATÍSTICAS + JOGOS REGISTADOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl space-y-4 h-fit">
          <div className="flex justify-between items-center border-b border-gray-800 pb-3">
            <h2 className="text-xl font-bold text-white">📊 Desempenho & Estatísticas</h2>
            <button onClick={expandirTodas} className="text-xs text-blue-400 font-bold bg-gray-950 px-3 py-1.5 rounded-lg border border-gray-800">Expandir / Recolher</button>
          </div>
          <div className="space-y-3">
            {Object.keys(categoriasAgrupadas).map(catName => {
              const isOpen = !!expandedCategories[catName];
              return (
                <div key={catName} className="bg-gray-950 rounded-xl border border-gray-800 overflow-hidden">
                  <button onClick={() => toggleCategory(catName)} className="w-full p-4 flex justify-between items-center bg-gray-950 hover:bg-gray-900 text-left">
                    <span className="text-xs uppercase font-black text-blue-400 tracking-widest">{catName}</span>
                    <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
                  </button>
                  {isOpen && (
                    <div className="p-4 border-t border-gray-800 bg-gray-900/40 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {categoriasAgrupadas[catName].map(acao => {
                        const isVideoCallable = !isEditingStats && !['partidas', 'minutos'].includes(acao.id);
                        return (
                          <div
                            key={acao.id}
                            onClick={() => isVideoCallable && handleSelectActionVideo(acao)}
                            className={`flex justify-between items-center px-3.5 py-2.5 rounded-lg border transition ${selectedActionForVideo?.id === acao.id ? 'bg-blue-900/30 border-blue-500' : 'bg-gray-950 border-gray-800'} ${isVideoCallable ? 'cursor-pointer group' : ''}`}
                          >
                            <div>
                              <span className="text-sm text-gray-200 font-medium group-hover:text-blue-400">{acao.nome}</span>
                              {isVideoCallable && <span className="block text-[10px] text-green-400">🎥 Ver lances em vídeo</span>}
                            </div>
                            <span className="font-mono text-lg font-black text-blue-400">{valoresAcoes[acao.id] || 0}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-1 bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl h-fit space-y-4">
          <h2 className="text-lg font-bold text-white border-b border-gray-800 pb-3">🏟️ Jogos Registados ({partidasDoAtleta.length})</h2>
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
            {partidasDoAtleta.map(jogo => {
              const st = jogo.dados[player.id] || {};
              return (
                <div key={jogo.id} className="bg-gray-950 p-3.5 rounded-lg border border-gray-800">
                  <div className="flex justify-between text-[10px] text-blue-400 font-bold mb-1">
                    <span>{jogo.dados?._meta?.competicao || 'Amigável'}</span>
                    <span>{new Date(jogo.criado_em).toLocaleDateString()}</span>
                  </div>
                  <h4 className="font-bold text-sm text-white mb-2">{jogo.titulo}</h4>
                  <div className="flex gap-3 text-xs font-mono text-gray-400 border-t border-gray-900 pt-2">
                    <span>⏱️ {st.minutos || 0}'</span>
                    <span className="text-blue-400">⚽ {st.gols || 0}</span>
                    <span className="text-green-400">👟 {st.assistencias || 0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
