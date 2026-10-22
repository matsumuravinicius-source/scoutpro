import React, { useState } from 'react';
import CampoFutebol from './CampoFutebol';

const readShieldPhoto = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error('Não foi possível abrir a imagem selecionada.'));
    image.onload = () => {
      const maxDimension = 512;
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext('2d');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
});

const EMPTY_TEAM_DETAILS = { country: '', division: '', categories: '', foundedYear: '', shieldPhoto: '' };

export default function AbaClubes({ teams, teamMetadata = {}, players, matchHistory, newTeamName, setNewTeamName, handleAddTeam, handleDeleteTeam, uniqueCompetitions, isDateInRange, TODAS_ACOES, onSelectPlayer }) {
  const [selectedTeam, setSelectedTeam] = useState('');
  const [newTeamDetails, setNewTeamDetails] = useState(EMPTY_TEAM_DETAILS);
  const [expandedAction, setExpandedAction] = useState('');
  const [activeClip, setActiveClip] = useState(null);
  const [filterActionId, setFilterActionId] = useState('');
  const [fieldMapActionFilter, setFieldMapActionFilter] = useState('');
  const [filterCompetition, setFilterCompetition] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleShieldPhotoChange = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Selecione um ficheiro de imagem para o escudo.');
      event.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 10 MB.');
      event.target.value = '';
      return;
    }
    try {
      const shieldPhoto = await readShieldPhoto(file);
      setNewTeamDetails(previous => ({ ...previous, shieldPhoto }));
    } catch (error) {
      alert(error.message || 'Não foi possível carregar a imagem.');
    }
    event.target.value = '';
  };

  if (selectedTeam) {
    const selectedTeamDetails = teamMetadata[selectedTeam] || {};
    const teamPlayers = players.filter(player => player.time_nome === selectedTeam);
    const teamPlayerIds = teamPlayers.map(player => player.id);
    const teamMatches = matchHistory.filter(match => {
      if (!match.dados?._meta?.equipes?.includes(selectedTeam)) return false;
      if (filterCompetition && match.dados?._meta?.competicao !== filterCompetition) return false;
      return isDateInRange(match.criado_em, startDate, endDate);
    });
    const teamPlayerNames = new Set(teamPlayers.map(player => player.nome));
    const teamFieldEvents = teamMatches.flatMap(match => {
      const fieldEvents = match.dados?._meta?.fieldEvents || [];
      return fieldEvents
        .filter(event => teamPlayerIds.includes(event.playerId))
        .map(event => ({
          ...event,
          id: `${match.id}-${event.id}`,
          playerName: event.playerName || teamPlayers.find(player => player.id === event.playerId)?.nome,
          matchTitle: match.titulo
        }));
    });
    const fieldMapActions = [...new Map(teamFieldEvents.map(event => [event.actionId, event.label || event.actionId])).entries()];
    const visibleTeamFieldEvents = fieldMapActionFilter
      ? teamFieldEvents.filter(event => event.actionId === fieldMapActionFilter)
      : teamFieldEvents;
    const clipsByAction = {};
    teamMatches.forEach(match => {
      const meta = match.dados?._meta || {};
      (meta.eventLog || []).forEach((log, index) => {
        const parts = log.match(/^\[T(\d+)\s*-\s*(\d{2}:\d{2})\]\s*(.*?)\s*•\s*(.+)$/);
        if (!parts || !teamPlayerNames.has(parts[3].trim())) return;
        const actionName = parts[4].trim();
        const action = TODAS_ACOES.find(item => item.nome === actionName);
        if (!action) return;
        const period = Number(parts[1]);
        const eventSeconds = parts[2].split(':').map(Number).reduce((total, value) => total * 60 + value, 0);
        const offset = (period === 1 ? meta.offsetT1 : meta.offsetT2) || (period === 1 ? '00:00' : '45:00');
        const offsetSeconds = offset.split(':').map(Number).reduce((total, value) => total * 60 + value, 0);
        const startSecond = Math.max(0, offsetSeconds + eventSeconds - 10);
        const matchUrl = meta.videoUrl || '';
        const videoIdMatch = matchUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|embed\/|live\/))([\w-]{11})/);
        if (!videoIdMatch) return;
        const clip = {
          id: `${match.id}-${index}`,
          actionName: action.nome,
          matchTitle: match.titulo,
          matchDate: new Date(match.criado_em).toLocaleDateString(),
          eventTime: `T${period} ${parts[2]}`,
          playerName: parts[3].trim(),
          startSecond,
          endSecond: startSecond + 20,
          videoId: videoIdMatch?.[1] || null
        };
        if (!clipsByAction[action.id]) clipsByAction[action.id] = { action, clips: [] };
        clipsByAction[action.id].clips.push(clip);
      });
    });
    const actionsWithVideo = Object.values(clipsByAction);
    const visibleActions = actionsWithVideo.filter(({ action }) => action.id === filterActionId);
    const totals = teamMatches.reduce((acc, match) => {
      Object.entries(match.dados || {}).forEach(([playerId, stats]) => {
        if (playerId === '_meta' || !teamPlayerIds.includes(playerId)) return;
        ['gols', 'assistencias', 'finalizacoes_certas', 'finalizacoes_erradas', 'desarmes', 'cruzamentos', 'cartoes_amarelos', 'cartoes_vermelhos'].forEach(action => {
          acc[action] += parseInt(stats[action], 10) || 0;
        });
      });
      acc.gols_sofridos += parseInt(match.dados?._meta?.gols_sofridos, 10) || 0;
      return acc;
    }, { gols: 0, assistencias: 0, finalizacoes_certas: 0, finalizacoes_erradas: 0, desarmes: 0, cruzamentos: 0, cartoes_amarelos: 0, cartoes_vermelhos: 0, gols_sofridos: 0 });

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-900/40 border border-blue-700 flex items-center justify-center text-3xl overflow-hidden">{selectedTeamDetails.shieldPhoto ? <img src={selectedTeamDetails.shieldPhoto} alt={`Escudo de ${selectedTeam}`} className="w-full h-full object-cover" /> : '🛡️'}</div>
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-blue-400">Perfil do Clube</span>
              <h1 className="text-3xl font-black text-white">{selectedTeam}</h1>
              <p className="text-sm text-gray-400">{teamPlayers.length} atletas · {teamMatches.length} partidas registradas</p>
              {(selectedTeamDetails.country || selectedTeamDetails.division || selectedTeamDetails.categories?.length || selectedTeamDetails.foundedYear) && <p className="text-xs text-gray-500 mt-1">{[selectedTeamDetails.country, selectedTeamDetails.division, selectedTeamDetails.categories?.join(', '), selectedTeamDetails.foundedYear && `Fundado em ${selectedTeamDetails.foundedYear}`].filter(Boolean).join(' · ')}</p>}
            </div>
          </div>
          <button type="button" onClick={() => { setSelectedTeam(''); setFieldMapActionFilter(''); }} className="px-4 py-2.5 bg-gray-950 hover:bg-gray-800 rounded-lg border border-gray-700 text-sm font-bold text-gray-200">← Voltar para Clubes</button>
        </div>

        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex flex-col md:flex-row items-center gap-3">
          <span className="text-gray-400 font-bold text-xs uppercase whitespace-nowrap">🔎 Filtrar perfil:</span>
          <div className="flex items-center gap-2 bg-gray-950 p-2 rounded-lg border border-gray-700 w-full md:flex-1">
            <label className="text-gray-500 text-xs font-bold uppercase" htmlFor="club-profile-start">De</label>
            <input id="club-profile-start" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="bg-transparent outline-none text-sm w-full text-blue-400 font-bold" />
            <label className="text-gray-500 text-xs font-bold uppercase border-l border-gray-700 pl-2" htmlFor="club-profile-end">Até</label>
            <input id="club-profile-end" type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="bg-transparent outline-none text-sm w-full text-blue-400 font-bold" />
          </div>
          <select aria-label="Filtrar por competição" value={filterCompetition} onChange={event => setFilterCompetition(event.target.value)} className="p-2.5 bg-gray-950 rounded-lg border border-gray-700 text-sm outline-none text-blue-400 font-bold w-full md:w-64">
            <option value="">Todas as competições</option>
            {uniqueCompetitions?.map(competition => <option key={competition} value={competition}>{competition}</option>)}
          </select>
        </div>

        <section className="bg-gray-900 p-5 rounded-xl border border-gray-800">
          <h2 className="text-lg font-bold mb-4">Desempenho acumulado</h2>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-bold text-gray-200">Mapa de ações do clube</h3>
                <select aria-label="Filtrar mapa por ação" value={fieldMapActionFilter} onChange={event => setFieldMapActionFilter(event.target.value)} className="p-2 bg-gray-950 border border-gray-700 rounded text-xs text-blue-300 font-bold">
                  <option value="">Todas as ações ({teamFieldEvents.length})</option>
                  {fieldMapActions.map(([actionId, label]) => <option key={actionId} value={actionId}>{label} ({teamFieldEvents.filter(event => event.actionId === actionId).length})</option>)}
                </select>
              </div>
              {visibleTeamFieldEvents.length ? <div className="w-full max-w-[320px] mx-auto lg:mx-0"><CampoFutebol events={visibleTeamFieldEvents} title="" orientation="vertical" /></div> : <div className="aspect-[68/105] max-h-[520px] max-w-[320px] bg-gray-950 rounded-lg border border-gray-800 border-dashed flex items-center justify-center p-4 text-center text-sm text-gray-500">{teamFieldEvents.length ? 'Nenhuma ação encontrada para este filtro.' : 'Nenhuma ação de campo registrada para este clube nas partidas selecionadas.'}</div>}
            </div>
            <div className="lg:col-span-7">
              <h3 className="text-sm font-bold text-gray-200 mb-3">Estatísticas do elenco</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  ['Golos', totals.gols, 'text-blue-400'], ['Golos sofridos', totals.gols_sofridos, 'text-red-400'],
                  ['Assistências', totals.assistencias, 'text-green-400'], ['Finalizações certas', totals.finalizacoes_certas, 'text-green-400'],
                  ['Finalizações erradas', totals.finalizacoes_erradas, 'text-orange-400'], ['Desarmes', totals.desarmes, 'text-white'],
                  ['Cruzamentos', totals.cruzamentos, 'text-white'], ['Cartões amarelos', totals.cartoes_amarelos, 'text-yellow-400'],
                  ['Cartões vermelhos', totals.cartoes_vermelhos, 'text-red-500']
                ].map(([label, value, color]) => (
                  <div key={label} className="bg-gray-950 p-4 rounded-lg border border-gray-800">
                    <span className="block text-[10px] uppercase font-bold text-gray-500">{label}</span>
                    <span className={`text-2xl font-black font-mono ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-gray-900 p-5 rounded-xl border border-gray-800">
          <h2 className="text-lg font-bold">Ações e lances</h2>
          <p className="text-xs text-gray-500 mt-1 mb-4">Abra uma ação para ver os eventos do elenco. Cada reprodução começa até 10 segundos antes e termina 10 segundos depois do registro.</p>
          {actionsWithVideo.length ? <>
          <div className="mb-4 max-w-sm">
            <label htmlFor="club-action-filter" className="block text-xs font-bold uppercase text-gray-400 mb-1">Filtrar por ação</label>
            <select id="club-action-filter" value={filterActionId} onChange={event => { setFilterActionId(event.target.value); setExpandedAction(event.target.value); setActiveClip(null); }} className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-700 text-sm text-blue-300 outline-none focus:border-blue-500">
              <option value="">Selecione uma ação...</option>
              {actionsWithVideo.map(({ action, clips }) => <option key={action.id} value={action.id}>{action.nome} ({clips.length})</option>)}
            </select>
          </div>
          {filterActionId ? <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div className="lg:col-span-8 space-y-2 lg:sticky lg:top-24">
              {activeClip?.videoId ? <>
                <div className="flex items-start justify-between gap-3">
                  <div><h3 className="font-bold text-white">{activeClip.actionName} · {activeClip.playerName}</h3><p className="text-xs text-gray-500 mt-1">{activeClip.matchTitle} · {activeClip.matchDate} · {activeClip.eventTime}</p></div>
                  <button type="button" onClick={() => setActiveClip(null)} className="shrink-0 text-xs text-gray-400 hover:text-white">Limpar ✕</button>
                </div>
                <div className="aspect-video bg-black rounded-lg overflow-hidden border border-gray-800"><iframe key={activeClip.id} className="w-full h-full" src={`https://www.youtube.com/embed/${activeClip.videoId}?start=${activeClip.startSecond}&end=${activeClip.endSecond}&autoplay=1&rel=0`} title={`Lance de ${activeClip.playerName}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>
              </> : <div className="aspect-video bg-gray-950 rounded-lg border border-gray-800 border-dashed flex flex-col items-center justify-center text-center p-6"><span className="text-4xl mb-3">▶</span><p className="font-bold text-gray-300">Selecione um lance na lista</p><p className="text-xs text-gray-500 mt-1">O vídeo será reproduzido aqui.</p></div>}
            </div>

            <div className="lg:col-span-4 max-h-[620px] overflow-y-auto pr-1 space-y-2">
              {visibleActions.map(({ action, clips }) => (
                <div key={action.id} className="rounded-lg border border-gray-800 overflow-hidden">
                  <button type="button" onClick={() => setExpandedAction(expandedAction === action.id ? '' : action.id)} className="w-full flex justify-between items-center gap-3 p-3 text-left bg-gray-950 hover:bg-gray-800/70">
                    <span className="font-bold text-white">{action.nome}</span>
                    <span className="flex items-center gap-3 text-xs text-blue-400"><span>{clips.length}</span><span>{expandedAction === action.id ? '⌃' : '⌄'}</span></span>
                  </button>
                  {expandedAction === action.id && <div className="p-2 space-y-2 bg-gray-950/60">
                    {clips.map(clip => <button key={clip.id} type="button" disabled={!clip.videoId} onClick={() => setActiveClip(clip)} className={`w-full text-left p-3 rounded-lg border transition ${activeClip?.id === clip.id ? 'border-blue-500 bg-blue-950/40' : 'border-gray-800 bg-gray-950 hover:border-gray-600'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                      <span className="block text-sm font-bold text-gray-200">{clip.playerName}</span><span className="block text-xs text-gray-500 mt-1">{clip.matchTitle}</span><span className="block text-[10px] text-gray-500 mt-1">{clip.matchDate} · {clip.eventTime}</span>
                    </button>)}
                  </div>}
                </div>
              ))}
            </div>
          </div> : <p className="text-sm text-gray-500 bg-gray-950 rounded-lg p-4">Selecione uma ação no filtro para carregar os lances.</p>}
          </> : <p className="text-sm text-gray-500 bg-gray-950 rounded-lg p-4">Nenhuma ação com vídeo disponível para este clube nos filtros selecionados.</p>}
        </section>

        <section className="bg-gray-900 p-5 rounded-xl border border-gray-800">
          <h2 className="text-lg font-bold mb-4">Elenco <span className="text-sm text-gray-500">({teamPlayers.length})</span></h2>
          {teamPlayers.length ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {teamPlayers.map(player => <button key={player.id} type="button" onClick={() => onSelectPlayer?.(player.id)} className="w-full text-left bg-gray-950 p-4 rounded-lg border border-gray-800 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
              <span className="font-bold text-white">{player.nome}</span>
              <span className="block text-xs text-blue-400 mt-1">{player.categoria || 'Sem categoria'}</span>
              <span className="block text-xs text-gray-500 mt-1">{player.setor} · {player.funcoes?.join(', ') || 'Sem função'}</span>
              <span className="block text-xs text-blue-400 mt-3">Ver perfil do atleta →</span>
            </button>)}
          </div> : <p className="text-sm text-gray-500">Nenhum atleta cadastrado neste clube.</p>}
        </section>

        <section className="bg-gray-900 p-5 rounded-xl border border-gray-800">
          <h2 className="text-lg font-bold mb-4">Histórico de partidas</h2>
          {teamMatches.length ? <div className="space-y-3">
            {teamMatches.map(match => <article key={match.id} className="bg-gray-950 p-4 rounded-lg border border-gray-800">
              <div className="flex flex-col sm:flex-row justify-between gap-1">
                <h3 className="font-bold text-white">{match.titulo}</h3>
                <span className="text-xs text-gray-500">{new Date(match.criado_em).toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-blue-400 mt-1">{match.dados?._meta?.competicao || 'Sem competição'}</p>
              <p className="text-xs text-gray-400 mt-2">{match.dados?._meta?.eventLog?.length || 0} eventos registrados</p>
            </article>)}
          </div> : <p className="text-sm text-gray-500">Nenhuma partida registrada para este clube.</p>}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl">
        <h2 className="text-2xl font-bold mb-2">Gestão de Clubes</h2>
        <p className="text-sm text-gray-400 mb-6">Adicione clubes com dados de identificação e escudo.</p>
        <form onSubmit={event => handleAddTeam(event, {
          country: newTeamDetails.country.trim(),
          division: newTeamDetails.division.trim(),
          categories: newTeamDetails.categories.split(',').map(category => category.trim()).filter(Boolean),
          foundedYear: newTeamDetails.foundedYear ? Number(newTeamDetails.foundedYear) : null,
          shieldPhoto: newTeamDetails.shieldPhoto
        }).then(success => { if (success) setNewTeamDetails(EMPTY_TEAM_DETAILS); })} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <label className="block text-xs font-bold text-gray-400">Nome do clube
              <input type="text" placeholder="Nome do Novo Clube" required value={newTeamName} onChange={e => setNewTeamName(e.target.value)} className="mt-1 w-full p-3 bg-gray-950 rounded-lg border border-gray-700 text-sm text-white outline-none focus:border-blue-500" />
            </label>
            <label className="block text-xs font-bold text-gray-400">País
              <input type="text" placeholder="Ex.: Brasil" value={newTeamDetails.country} onChange={event => setNewTeamDetails(previous => ({ ...previous, country: event.target.value }))} className="mt-1 w-full p-3 bg-gray-950 rounded-lg border border-gray-700 text-sm text-white outline-none focus:border-blue-500" />
            </label>
            <label className="block text-xs font-bold text-gray-400">Divisão
              <input type="text" placeholder="Ex.: Série A" value={newTeamDetails.division} onChange={event => setNewTeamDetails(previous => ({ ...previous, division: event.target.value }))} className="mt-1 w-full p-3 bg-gray-950 rounded-lg border border-gray-700 text-sm text-white outline-none focus:border-blue-500" />
            </label>
            <label className="block text-xs font-bold text-gray-400">Categorias
              <input type="text" placeholder="Ex.: Principal, Sub-20, Sub-17" value={newTeamDetails.categories} onChange={event => setNewTeamDetails(previous => ({ ...previous, categories: event.target.value }))} className="mt-1 w-full p-3 bg-gray-950 rounded-lg border border-gray-700 text-sm text-white outline-none focus:border-blue-500" />
              <span className="block mt-1 text-[10px] text-gray-600">Separe as categorias por vírgula.</span>
            </label>
            <label className="block text-xs font-bold text-gray-400">Ano de fundação
              <input type="number" min="1800" max={new Date().getFullYear()} placeholder="Ex.: 1910" value={newTeamDetails.foundedYear} onChange={event => setNewTeamDetails(previous => ({ ...previous, foundedYear: event.target.value }))} className="mt-1 w-full p-3 bg-gray-950 rounded-lg border border-gray-700 text-sm text-white outline-none focus:border-blue-500" />
            </label>
            <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-950 p-3">
              {newTeamDetails.shieldPhoto ? <img src={newTeamDetails.shieldPhoto} alt="Pré-visualização do escudo" className="w-14 h-14 object-cover rounded-lg border border-gray-700" /> : <div className="w-14 h-14 rounded-lg border border-gray-700 flex items-center justify-center text-2xl text-gray-500">🛡️</div>}
              <div className="min-w-0">
                <span className="block text-xs font-bold text-gray-400 mb-2">Foto do escudo</span>
                <label className="inline-block cursor-pointer px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 text-xs font-bold text-gray-200">
                  Escolher imagem
                  <input type="file" accept="image/*" onChange={handleShieldPhotoChange} className="hidden" />
                </label>
                {newTeamDetails.shieldPhoto && <button type="button" onClick={() => setNewTeamDetails(previous => ({ ...previous, shieldPhoto: '' }))} className="ml-2 text-xs font-bold text-red-400 hover:text-red-300">Remover</button>}
              </div>
            </div>
          </div>
          <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition shadow-lg">Adicionar Clube</button>
        </form>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        
        <div className="flex flex-col lg:flex-row justify-end mb-4 gap-4">
           <div className="flex items-center gap-2 bg-gray-950 p-1 rounded border border-gray-700">
             <span className="text-gray-500 text-xs font-bold px-2 uppercase">De:</span>
             <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent outline-none text-sm text-blue-400 font-bold" />
             <span className="text-gray-500 text-xs font-bold px-2 uppercase border-l border-gray-700">Até:</span>
             <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent outline-none text-sm text-blue-400 font-bold" />
           </div>
           <div className="flex items-center gap-2">
             <span className="text-gray-400 font-bold text-sm">🏆 Competição:</span>
             <select value={filterCompetition} onChange={e => setFilterCompetition(e.target.value)} className="p-2 bg-gray-950 rounded-lg border border-gray-700 text-sm outline-none text-blue-400 font-bold">
               <option value="">Todas as Competições</option>
               {uniqueCompetitions?.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-sm">
                <th className="p-3 sticky left-0 bg-gray-900 shadow-[1px_0_0_#1f2937]">Clube / Ações</th>
                <th className="p-3 text-center" title="Partidas">Partidas</th>
                <th className="p-3 text-center text-blue-400">Golos</th>
                <th className="p-3 text-center text-red-400">Golos Sofridos</th>
                <th className="p-3 text-center">Assistências</th>
                <th className="p-3 text-center text-green-400">Fin. Certas</th>
                <th className="p-3 text-center text-orange-400">Fin. Erradas</th>
                <th className="p-3 text-center">Desarmes</th>
                <th className="p-3 text-center">Cruzamentos</th>
                <th className="p-3 text-center text-yellow-400">Cartões Amarelos</th>
                <th className="p-3 text-center text-red-500">Cartões Vermelhos</th>
              </tr>
            </thead>
            <tbody>
              {teams.length === 0 ? (
                <tr><td colSpan="11" className="p-6 text-center text-gray-500">Nenhum clube registado.</td></tr>
              ) : (
                teams.map(team => {
                  const teamDetails = teamMetadata[team] || {};
                  
                  const teamMatches = matchHistory.filter(m => {
                    if (filterCompetition && m.dados?._meta?.competicao !== filterCompetition) return false;
                    if (!isDateInRange(m.criado_em, startDate, endDate)) return false;
                    return m.dados?._meta?.equipes?.includes(team);
                  });

                  const teamPlayerIds = players.filter(p => p.time_nome === team).map(p => p.id);
                  let tGolos = 0, tAssist = 0, tFinCertas = 0, tFinErradas = 0, tDes = 0, tCruz = 0, tCA = 0, tCV = 0;
                  
                  if (filterCompetition || startDate || endDate) {
                     teamMatches.forEach(m => {
                       Object.keys(m.dados).forEach(pId => {
                         if (pId !== '_meta' && teamPlayerIds.includes(pId)) {
                           const st = m.dados[pId];
                           tGolos += parseInt(st.gols || 0); tAssist += parseInt(st.assistencias || 0);
                           tFinCertas += parseInt(st.finalizacoes_certas || 0); tFinErradas += parseInt(st.finalizacoes_erradas || 0);
                           tDes += parseInt(st.desarmes || 0); tCruz += parseInt(st.cruzamentos || 0);
                           tCA += parseInt(st.cartoes_amarelos || 0); tCV += parseInt(st.cartoes_vermelhos || 0);
                         }
                       });
                     });
                  } else {
                     const teamPlayers = players.filter(p => p.time_nome === team);
                     tGolos = teamPlayers.reduce((sum, p) => sum + (p.acoes.gols || 0), 0);
                     tAssist = teamPlayers.reduce((sum, p) => sum + (p.acoes.assistencias || 0), 0);
                     tFinCertas = teamPlayers.reduce((sum, p) => sum + (p.acoes.finalizacoes_certas || 0), 0);
                     tFinErradas = teamPlayers.reduce((sum, p) => sum + (p.acoes.finalizacoes_erradas || 0), 0);
                     tDes = teamPlayers.reduce((sum, p) => sum + (p.acoes.desarmes || 0), 0);
                     tCruz = teamPlayers.reduce((sum, p) => sum + (p.acoes.cruzamentos || 0), 0);
                     tCA = teamPlayers.reduce((sum, p) => sum + (p.acoes.cartoes_amarelos || 0), 0);
                     tCV = teamPlayers.reduce((sum, p) => sum + (p.acoes.cartoes_vermelhos || 0), 0);
                  }
                  
                  const tPartidas = teamMatches.length;
                  const tSofridos = teamMatches.reduce((sum, m) => sum + (m.dados?._meta?.gols_sofridos || 0), 0);

                  return (
                    <tr key={team} className="border-b border-gray-800/50 hover:bg-gray-800/20 text-sm">
                      {/* Célula com o Botão de Lixo */}
                      <td className="p-3 sticky left-0 bg-gray-900 shadow-[1px_0_0_#1f2937] z-10">
                        <div className="flex items-center justify-between gap-2">
                           <button type="button" onClick={() => { setSelectedTeam(team); setExpandedAction(''); setActiveClip(null); setFieldMapActionFilter(''); }} className="font-bold text-left text-blue-300 hover:text-blue-200 hover:underline flex items-center gap-2" title={`Abrir perfil de ${team}`}>
                             {teamDetails.shieldPhoto ? <img src={teamDetails.shieldPhoto} alt="" className="w-8 h-8 rounded object-cover border border-gray-700" /> : <span className="text-xl">🛡️</span>}
                             <span>{team}</span>
                           </button>
                           <button onClick={() => handleDeleteTeam(team)} className="text-red-500 bg-red-900/20 rounded p-1.5 text-xs hover:bg-red-500 hover:text-white transition shadow" title="Excluir Clube e Todos os Jogadores">🗑️</button>
                        </div>
                      </td>
                      <td className="p-3 text-center font-mono text-gray-300">{tPartidas}</td>
                      <td className="p-3 text-center font-mono text-blue-400 font-bold">{tGolos}</td>
                      <td className="p-3 text-center font-mono text-red-400 font-bold">{tSofridos}</td>
                      <td className="p-3 text-center font-mono text-gray-300">{tAssist}</td>
                      <td className="p-3 text-center font-mono text-green-400">{tFinCertas}</td>
                      <td className="p-3 text-center font-mono text-orange-400">{tFinErradas}</td>
                      <td className="p-3 text-center font-mono text-gray-300">{tDes}</td>
                      <td className="p-3 text-center font-mono text-gray-300">{tCruz}</td>
                      <td className="p-3 text-center font-mono text-yellow-400">{tCA}</td>
                      <td className="p-3 text-center font-mono text-red-500">{tCV}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
