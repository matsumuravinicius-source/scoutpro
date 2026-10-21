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

const readProfilePhoto = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error('Não foi possível abrir a imagem selecionada.'));
    image.onload = () => {
      const maxDimension = 640;
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
});

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
  const [mapaAcaoSelecionada, setMapaAcaoSelecionada] = useState('');

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
    ano_nascimento: player?.ano_nascimento || '',
    foto_perfil: player?.acoes?.foto_perfil || ''
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
  const acoesDoJogoSelecionado = mapaJogoSelecionado
    ? (partidasComMapa.find(match => match.id === mapaJogoSelecionado)?.dados?._meta?.fieldEvents || []).filter(event => event.playerId === player.id)
    : acoesNoMapa;
  const acoesVisiveisNoMapa = mapaAcaoSelecionada
    ? acoesDoJogoSelecionado.filter(event => event.actionId === mapaAcaoSelecionada)
    : acoesDoJogoSelecionado;
  const tiposDeAcaoNoMapa = [...new Map(acoesNoMapa.map(event => [event.actionId, event.label || event.actionId])).entries()];

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

  const handleProfilePhotoChange = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Selecione um arquivo de imagem.');
      event.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 10 MB.');
      event.target.value = '';
      return;
    }
    try {
      const foto_perfil = await readProfilePhoto(file);
      setEditForm(previous => ({ ...previous, foto_perfil }));
    } catch (error) {
      alert(error.message || 'Não foi possível carregar a imagem.');
    }
    event.target.value = '';
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
            onClick={() => {
              if (!isEditingBio) {
                setEditForm({
                  nome: player.nome || '',
                  time_nome: player.time_nome || '',
                  categoria: player.categoria || '',
                  setor: player.setor || '',
                  funcoes: player.funcoes?.length ? player.funcoes : [],
                  altura: player.altura || '',
                  pe_dominante: player.pe_dominante || 'Destro',
                  percentual_gordura: player.percentual_gordura || '',
                  velocidade_maxima: player.velocidade_maxima || '',
                  ano_nascimento: player.ano_nascimento || '',
                  foto_perfil: player.acoes?.foto_perfil || ''
                });
              }
              setIsEditingBio(previous => !previous);
            }}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pé dominante</label>
                <select value={editForm.pe_dominante} onChange={e => setEditForm({...editForm, pe_dominante: e.target.value})} className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-700 text-sm outline-none">
                  <option value="Destro">Destro</option><option value="Canhoto">Canhoto</option><option value="Ambidestro">Ambidestro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Altura (m)</label>
                <input type="number" min="0" step="0.01" placeholder="1.80" value={editForm.altura} onChange={e => setEditForm({...editForm, altura: e.target.value})} className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-700 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gordura corporal (%)</label>
                <input type="number" min="0" step="0.1" placeholder="10.5" value={editForm.percentual_gordura} onChange={e => setEditForm({...editForm, percentual_gordura: e.target.value})} className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-700 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Velocidade máxima (km/h)</label>
                <input type="number" min="0" step="0.1" placeholder="32.4" value={editForm.velocidade_maxima} onChange={e => setEditForm({...editForm, velocidade_maxima: e.target.value})} className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-700 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ano de nascimento</label>
                <input type="number" min="1900" max={new Date().getFullYear()} value={editForm.ano_nascimento} onChange={e => setEditForm({...editForm, ano_nascimento: e.target.value})} className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-700 text-sm outline-none" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-gray-950 rounded-lg border border-gray-800">
              {editForm.foto_perfil ? <img src={editForm.foto_perfil} alt={`Pré-visualização da foto de ${player.nome}`} className="w-20 h-20 object-cover rounded-xl border border-gray-700" /> : <div className="w-20 h-20 rounded-xl bg-gray-900 border border-gray-700 flex items-center justify-center text-2xl font-black text-gray-500">{player.nome.substring(0, 2).toUpperCase()}</div>}
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Foto do atleta</label>
                <input type="file" accept="image/*" onChange={handleProfilePhotoChange} className="block w-full text-xs text-gray-400 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:font-bold hover:file:bg-blue-500" />
                <p className="text-[10px] text-gray-500 mt-1">A imagem é redimensionada para caber no perfil. Tamanho máximo: 10 MB.</p>
              </div>
              {editForm.foto_perfil && <button type="button" onClick={() => setEditForm(previous => ({ ...previous, foto_perfil: '' }))} className="text-xs font-bold text-red-400 hover:text-red-300">Remover foto</button>}
            </div>
            <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition">Salvar Alterações</button>
          </form>
        </div>
      ) : (
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-5">
            {player.acoes?.foto_perfil ? <img src={player.acoes.foto_perfil} alt={`Foto de ${player.nome}`} className="w-20 h-20 rounded-2xl object-cover shadow-lg border border-blue-400/30" /> : <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center text-3xl font-black text-white shadow-lg border border-blue-400/30">{player.nome.substring(0, 2).toUpperCase()}</div>}
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

      <section className="bg-gray-900 p-5 rounded-xl border border-gray-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">🗺️ Mapa de ações e jogos registrados</h2>
          <select aria-label="Filtrar mapa por ação" value={mapaAcaoSelecionada} onChange={event => setMapaAcaoSelecionada(event.target.value)} className="w-full sm:w-auto p-2 bg-gray-950 border border-gray-700 rounded-lg text-xs text-blue-300 font-bold">
            <option value="">Todas as ações ({acoesNoMapa.length})</option>
            {tiposDeAcaoNoMapa.map(([actionId, label]) => <option key={actionId} value={actionId}>{label} ({acoesNoMapa.filter(event => event.actionId === actionId).length})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-4">
            {acoesVisiveisNoMapa.length ? <CampoFutebol events={acoesVisiveisNoMapa} title="" orientation="vertical" /> : <div className="aspect-[68/105] max-h-[520px] bg-gray-950 rounded-lg border border-gray-800 border-dashed flex items-center justify-center p-4 text-center text-sm text-gray-500">{acoesNoMapa.length ? `Nenhuma ação encontrada${mapaJogoSelecionado ? ' neste jogo' : ''} para o filtro selecionado.` : `Nenhuma ação de campo registrada${mapaJogoSelecionado ? ' neste jogo' : ' para este atleta'}.`}</div>}
          </div>
          <div className="lg:col-span-8 bg-gray-950 p-3 rounded-lg border border-gray-800">
            <div className="flex items-center justify-between gap-3 mb-2"><h3 className="text-sm font-bold text-white">Jogos registrados ({partidasDoAtleta.length})</h3>{mapaJogoSelecionado && <button type="button" onClick={() => setMapaJogoSelecionado('')} className="text-xs text-blue-400 hover:text-blue-300">Mostrar todos</button>}</div>
            <div className="max-h-[520px] overflow-y-auto space-y-2 pr-1">
              {partidasDoAtleta.map(jogo => {
                const st = jogo.dados[player.id] || {};
                return <button key={jogo.id} type="button" onClick={() => setMapaJogoSelecionado(jogo.id)} className={'w-full text-left p-3 rounded-lg border transition ' + (mapaJogoSelecionado === jogo.id ? 'border-blue-500 bg-blue-950/30' : 'border-gray-800 bg-gray-900 hover:border-gray-600')}>
                  <div className="flex justify-between text-[10px] text-blue-400 font-bold mb-1"><span>{jogo.dados?._meta?.competicao || 'Amigável'}</span><span>{new Date(jogo.criado_em).toLocaleDateString()}</span></div>
                  <h4 className="font-bold text-sm text-white mb-2">{jogo.titulo}</h4>
                  <div className="flex gap-3 text-xs font-mono text-gray-400 border-t border-gray-800 pt-2"><span>⏱️ {st.minutos || 0}'</span><span className="text-blue-400">⚽ {st.gols || 0}</span><span className="text-green-400">👟 {st.assistencias || 0}</span></div>
                </button>;
              })}
            </div>
          </div>
        </div>
      </section>

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

      {/* SANFONA DE ESTATÍSTICAS + JOGOS REGISTADOS */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl space-y-4 h-fit">
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

      </div>
    </div>
  );
}
