import React, { useState } from 'react';

// Funções auxiliares para extrair ID do YouTube e calcular os segundos do lance
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
  onUpdatePlayerBio, matchHistory, isDateInRange, globalStartDate, globalEndDate
}) {
  const [expandedCategories, setExpandedCategories] = useState({ 'Geral': true });
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isEditingStats, setIsEditingStats] = useState(false);

  // NOVOS ESTADOS: Controlam a Playlist de Vídeo da Ação clicada
  const [selectedActionForVideo, setSelectedActionForVideo] = useState(null);
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [clipSeekCounter, setClipSeekCounter] = useState(0);
  const [preRollSeconds, setPreRollSeconds] = useState(3); // Recua 3s antes do lance por defeito

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
  const valoresAcoes = player.acoes_calc || player.acoes || {};

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

  // Filtra as partidas em que este atleta esteve presente (respeitando filtro de data global)
  const partidasDoAtleta = (matchHistory || []).filter(m => {
    if (!isDateInRange(m.criado_em, globalStartDate, globalEndDate)) return false;
    return m.dados && m.dados[player.id];
  });

  // ==========================================
  // MOTOR DE BUSCA DE CLIPES POR AÇÃO DO ATLETA
  // ==========================================
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

        // Verifica se o evento na linha do tempo pertence a este jogador e a esta ação
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
            onClick={() => {
              setIsEditingStats(!isEditingStats);
              setSelectedActionForVideo(null);
            }}
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

      {/* ========================================================
          NOVO: CENTRAL DE VÍDEO / PLAYLIST DE LANCES POR AÇÃO
          ======================================================== */}
      {selectedActionForVideo && (
        <div className="bg-gray-900 p-6 rounded-xl border-2 border-blue-500 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-800 pb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 block">
                🎥 Playlist de Scouting por Ação
              </span>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                {selectedActionForVideo.nome} — {player.nome}
                <span className="text-xs font-mono bg-blue-900/40 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-800">
                  {actionClips.length} {actionClips.length === 1 ? 'momento gravado' : 'momentos gravados'}
                </span>
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={preRollSeconds}
                onChange={e => {
                  setPreRollSeconds(Number(e.target.value));
                  setClipSeekCounter(prev => prev + 1);
                }}
                className="bg-gray-950 text-xs text-blue-400 font-bold p-2 rounded-lg border border-gray-800 outline-none"
                title="Tempo de antecedência antes da ação"
              >
                <option value={0}>Momento Exato (0s)</option>
                <option value={3}>Recuar -3s</option>
                <option value={5}>Recuar -5s</option>
                <option value={10}>Recuar -10s</option>
              </select>

              <button
                type="button"
                onClick={() => setSelectedActionForVideo(null)}
                className="px-3 py-1.5 bg-red-900/30 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold rounded-lg border border-red-900/50 transition"
              >
                ✕ Fechar Vídeo
              </button>
            </div>
          </div>

          {actionClips.length === 0 ? (
            <div className="text-center py-12 bg-gray-950 rounded-xl border border-gray-800 border-dashed text-gray-400 text-sm">
              Nenhum momento registado na Linha do Tempo para <strong>{selectedActionForVideo.nome}</strong> nas partidas salvas.
              <p className="text-xs text-gray-500 mt-1">Os novos registos feitos durante o Live Match aparecerão automaticamente aqui com o minuto exato!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Leitor de Vídeo */}
              <div className="lg:col-span-2 space-y-2">
                {currentClip?.ytId ? (
                  <div className="aspect-video w-full bg-black rounded-xl overflow-hidden border border-gray-800 shadow-lg">
                    <iframe
                      key={`${currentClip.ytId}-${currentClip.targetSecond}-${clipSeekCounter}`}
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${currentClip.ytId}?start=${currentClip.targetSecond}&autoplay=1&rel=0`}
                      title="Reprodutor de Lances"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-gray-950 rounded-xl border border-gray-800 flex flex-col items-center justify-center p-6 text-center">
                    <span className="text-3xl mb-2">⚠️</span>
                    <p className="text-sm font-bold text-gray-300">Esta partida não possui um link do YouTube associado.</p>
                    <p className="text-xs text-gray-500 mt-1">Vá até a aba Histórico, clique em Editar (✏️) na partida "{currentClip?.matchTitle}" e adicione o link do vídeo.</p>
                  </div>
                )}

                {currentClip && (
                  <div className="flex justify-between items-center bg-gray-950 px-4 py-2.5 rounded-lg border border-gray-800 text-xs">
                    <div>
                      <span className="font-bold text-blue-400">{currentClip.competition}</span> • <strong className="text-white">{currentClip.matchTitle}</strong> ({currentClip.matchDate})
                    </div>
                    <div className="font-mono font-bold text-green-400">
                      Lance: {currentClip.period}ºT aos {currentClip.timeStr}
                    </div>
                  </div>
                )}
              </div>

              {/* Lista de Momentos (Playlist) */}
              <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 flex flex-col max-h-[420px]">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 border-b border-gray-800 pb-2">
                  📋 Selecionar Momento ({actionClips.length})
                </h4>
                <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                  {actionClips.map((clip, idx) => {
                    const isSelected = idx === activeClipIndex;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setActiveClipIndex(idx);
                          setClipSeekCounter(prev => prev + 1);
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition flex flex-col gap-1 ${
                          isSelected
                            ? 'bg-blue-900/30 border-blue-500 text-white shadow'
                            : 'bg-gray-900/60 border-gray-800/80 text-gray-300 hover:bg-gray-900 hover:border-gray-700'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="text-[10px] font-bold uppercase text-blue-400 truncate pr-2">
                            {clip.competition} • {clip.matchDate}
                          </span>
                          <span className="text-xs font-mono font-black text-green-400 bg-green-950/40 px-2 py-0.5 rounded border border-green-900/50">
                            ▶ {clip.period}ºT - {clip.timeStr}
                          </span>
                        </div>
                        <div className="text-xs font-bold truncate">{clip.matchTitle}</div>
                        {!clip.ytId && (
                          <span className="text-[10px] text-orange-400">⚠️ Sem vídeo anexado na partida</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* GRELHA PRINCIPAL: SUBMENUS SANFONA (ESQUERDA) + HISTÓRICO DE JOGOS (DIREITA) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA 1 E 2: ESTATÍSTICAS EM ESTILO SANFONA (ACORDEÃO) */}
        <div className="lg:col-span-2 bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl space-y-4 h-fit">
          <div className="flex justify-between items-center border-b border-gray-800 pb-3">
            <div>
              <h2 className="text-xl font-bold text-white">📊 Desempenho & Estatísticas</h2>
              <p className="text-xs text-gray-400">Clique em qualquer ação abaixo para abrir o vídeo com todos os lances daquela estatística.</p>
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

                  {isOpen && (
                    <div className="p-4 border-t border-gray-800 bg-gray-900/40 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {categoriasAgrupadas[catName].map(acao => {
                        const isVideoCallable = !isEditingStats && !['partidas', 'minutos'].includes(acao.id);
                        const isSelectedVideo = selectedActionForVideo?.id === acao.id;
                        const clipsCount = isVideoCallable ? getClipsForAction(acao).length : 0;

                        return (
                          <div
                            key={acao.id}
                            onClick={() => isVideoCallable && handleSelectActionVideo(acao)}
                            className={`flex justify-between items-center px-3.5 py-2.5 rounded-lg border transition ${
                              isSelectedVideo
                                ? 'bg-blue-900/30 border-blue-500 ring-1 ring-blue-500'
                                : 'bg-gray-950 border-gray-800/80 hover:border-blue-500/50'
                            } ${isVideoCallable ? 'cursor-pointer group' : ''}`}
                          >
                            <div className="flex flex-col pr-2">
                              <span className="text-sm text-gray-200 font-medium group-hover:text-blue-400 transition flex items-center gap-1.5">
                                {acao.nome}
                              </span>
                              {isVideoCallable && (
                                <span className={`text-[10px] font-bold mt-0.5 ${clipsCount > 0 ? 'text-green-400' : 'text-gray-600 group-hover:text-gray-400'}`}>
                                  {clipsCount > 0 ? `🎥 Ver ${clipsCount} ${clipsCount === 1 ? 'lance em vídeo' : 'lances em vídeo'}` : '🎬 Clique p/ abrir vídeos'}
                                </span>
                              )}
                            </div>
                            
                            {isEditingStats ? (
                              <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
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
                        );
                      })}
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
                const hasVideo = !!extractYouTubeId(jogo.dados?._meta?.videoUrl);
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
                    <h4 className="font-bold text-sm text-white mb-2 flex items-center justify-between">
                      <span>{jogo.titulo}</span>
                      {hasVideo && <span className="text-[10px] text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded border border-red-900/40">🎥 Vídeo</span>}
                    </h4>
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