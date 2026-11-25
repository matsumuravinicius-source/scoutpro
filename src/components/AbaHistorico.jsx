import React, { useState } from 'react';
import CampoFutebol, { CORES_ACAO_CAMPO } from './CampoFutebol';
import { getPlayerSectors } from '../utils/playerSectors';
import { LIVE_ACTION_GROUPS, getFormationPositions, formatPositionActionLog, collectPositionTeamStats, getPositionActionColor } from '../utils/liveMatchActions';

const positionActionIds = new Set(LIVE_ACTION_GROUPS.flatMap(group => group.options.map(option => option.id)));

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

const parseActionLog = log => {
  const match = log?.match(/^\[T(\d+)\s*-\s*(\d{1,2}:\d{2})\]\s*(.*?)\s*•\s*(.+)$/);
  return match ? { period: Number(match[1]), time: match[2], playerName: match[3].trim(), actionName: match[4].trim() } : null;
};

export default function AbaHistorico({
  matchHistory, editingMatchId, editMatchData, setEditMatchData, saveMatchEdit, cancelMatchEdit,
  handleEditMatchClick, handleDeleteMatch, expandedMatch, setExpandedMatch, players, TODAS_ACOES, ACOES_GOLEIRO, ACOES_LINHA,
  handleSetMatchEditAction, handleUpdateMatchEditAction,
  filterMatchCompetition, setFilterMatchCompetition, uniqueCompetitions,
  historyStartDate, setHistoryStartDate, historyEndDate, setHistoryEndDate, isDateInRange
}) {
  
  // Guarda o segundo atual de reprodução para cada partida aberta
  const [videoSeekState, setVideoSeekState] = useState({});
  
  // NOVOS ESTADOS: Filtros de Ação e de Atleta para a Linha do Tempo de cada partida
  const [timelineActionFilter, setTimelineActionFilter] = useState({});
  const [timelinePlayerFilter, setTimelinePlayerFilter] = useState({});
  const [timelineTeamFilter, setTimelineTeamFilter] = useState({});
  const [fieldMapActionFilter, setFieldMapActionFilter] = useState({});
  const [fieldMapPeriodFilter, setFieldMapPeriodFilter] = useState({});

  const filteredHistory = matchHistory.filter(m => {
    if (filterMatchCompetition && m.dados?._meta?.competicao !== filterMatchCompetition) return false;
    if (!isDateInRange(m.criado_em, historyStartDate, historyEndDate)) return false;
    return true;
  });

  const handleTimelineClick = (partida, logString) => {
    const match = logString.match(/\[T(\d+)\s*-\s*(\d{2}:\d{2})\]/);
    if (!match) return;

    const period = parseInt(match[1]);
    const eventSeconds = timeToSeconds(match[2]);
    const offsetT1 = timeToSeconds(partida.dados?._meta?.offsetT1 || '00:00');
    const offsetT2 = timeToSeconds(partida.dados?._meta?.offsetT2 || '45:00');
    const baseOffset = period === 1 ? offsetT1 : offsetT2;

    // Recua 3 segundos antes do clique para contextualizar a jogada
    const targetSecond = Math.max(0, baseOffset + eventSeconds - 3);
    setVideoSeekState(prev => ({ ...prev, [partida.id]: targetSecond }));
  };

  const revisePositionEvents = (meta, events, fieldEvents) => {
    const homeTeam = meta.equipes?.[0] || meta.homeTeam;
    const awayTeam = meta.equipes?.[1] || meta.awayTeam;
    const liveActionEvents = events.map(event => ({ ...event, teamName: event.teamSide === 'away' ? awayTeam : homeTeam }));
    const teamStats = collectPositionTeamStats(liveActionEvents, homeTeam, awayTeam);
    const awayStats = teamStats[awayTeam] || {};
    return { ...meta, homeTeam, awayTeam, liveActionEvents, fieldEvents, teamStats,
      eventLog: liveActionEvents.slice().reverse().map(formatPositionActionLog),
      gols_sofridos: awayStats.gols || 0,
      finalizacoes_adversario: (awayStats.gols || 0) + (awayStats.finalizacoes_certas || 0) + (awayStats.finalizacoes_erradas || 0) };
  };

  const updatePositionAction = (eventId, changes) => setEditMatchData(previous => {
    const meta = previous?.dados?._meta;
    if (meta?.liveMode !== 'positions') return previous;
    const original = (meta.liveActionEvents || []).find(event => event.id === eventId);
    if (!original) return previous;
    const next = { ...original, ...changes };
    const formation = meta.formations?.[next.teamSide];
    const positions = getFormationPositions(formation);
    const changedTeam = next.teamSide !== original.teamSide;
    const positionId = changedTeam ? '' : next.positionId;
    const position = positions.find(item => item.id === positionId);
    const action = TODAS_ACOES.find(item => item.id === next.actionId && positionActionIds.has(item.id));
    if (!action || !positions.length || !['home', 'away'].includes(next.teamSide) || (positionId && !position)) return previous;
    Object.assign(next, { playerId: null, positionId: position?.id || '', positionLabel: position?.label || '',
      formation, teamName: next.teamSide === 'away' ? (meta.equipes?.[1] || meta.awayTeam) : (meta.equipes?.[0] || meta.homeTeam),
      label: action.nome, seconds: timeToSeconds(next.time) });
    const events = meta.liveActionEvents.map(event => event.id === eventId ? next : event);
    const fieldEvents = (meta.fieldEvents || []).flatMap(event => event.id !== eventId ? [event]
      : CORES_ACAO_CAMPO[next.actionId] ? [{ ...event, ...next, color: getPositionActionColor(next) }] : []);
    return { ...previous, dados: { ...previous.dados, _meta: revisePositionEvents(meta, events, fieldEvents) } };
  });

  const removePositionAction = eventId => setEditMatchData(previous => {
    const meta = previous?.dados?._meta;
    if (meta?.liveMode !== 'positions') return previous;
    const events = (meta.liveActionEvents || []).filter(event => event.id !== eventId);
    const fieldEvents = (meta.fieldEvents || []).filter(event => event.id !== eventId);
    return { ...previous, dados: { ...previous.dados, _meta: revisePositionEvents(meta, events, fieldEvents) } };
  });

  const updateLoggedAction = (logIndex, changes) => setEditMatchData(previous => {
    if (!previous?.dados?._meta) return previous;
    const meta = previous.dados._meta;
    const logs = [...(meta.eventLog || [])];
    const oldLog = logs[logIndex];
    const parsed = parseActionLog(oldLog);
    if (!parsed) return previous;
    const oldPlayer = players.find(player => player.nome === parsed.playerName);
    const oldAction = TODAS_ACOES.find(action => action.nome === parsed.actionName);
    const next = { ...parsed, ...changes };
    const nextPlayer = players.find(player => player.id === next.playerId) || oldPlayer;
    const nextAction = TODAS_ACOES.find(action => action.id === next.actionId) || oldAction;
    if (!nextPlayer || !nextAction) return previous;

    const isLiveActionMatch = meta.liveMode === 'actions';
    const homeTeam = meta.equipes?.[0] || meta.homeTeam;
    const awayTeam = meta.equipes?.[1] || meta.awayTeam;
    const teamSide = nextPlayer.time_nome === homeTeam ? 'home' : nextPlayer.time_nome === awayTeam ? 'away' : undefined;
    const actionUpdate = {
      playerId: nextPlayer.id,
      playerName: nextPlayer.nome,
      actionId: nextAction.id,
      label: nextAction.nome,
      period: Number(next.period),
      time: next.time,
      ...(isLiveActionMatch ? { teamName: nextPlayer.time_nome, teamSide, seconds: timeToSeconds(next.time) } : {})
    };
    logs[logIndex] = `[T${next.period} - ${next.time}] ${nextPlayer.nome} • ${nextAction.nome}`;
    let fieldEvents = meta.fieldEvents || [];
    const fieldEventIndex = fieldEvents.findIndex(event => event.playerId === oldPlayer?.id && event.actionId === oldAction?.id && Number(event.period) === parsed.period && event.time === parsed.time);
    if (fieldEventIndex >= 0) {
      fieldEvents = [...fieldEvents];
      const replacement = { ...fieldEvents[fieldEventIndex] };
      if (CORES_ACAO_CAMPO[nextAction.id]) {
        const isAwayShot = isLiveActionMatch && teamSide === 'away' && ['gols', 'finalizacoes_certas', 'finalizacoes_erradas'].includes(nextAction.id);
        Object.assign(replacement, {
          ...actionUpdate,
          color: isAwayShot ? (nextAction.id === 'gols' ? '#f97316' : '#eab308') : CORES_ACAO_CAMPO[nextAction.id]
        });
        fieldEvents[fieldEventIndex] = replacement;
      } else {
        fieldEvents.splice(fieldEventIndex, 1);
      }
    }
    let liveActionEvents = meta.liveActionEvents;
    if (isLiveActionMatch && Array.isArray(liveActionEvents)) {
      const liveActionIndex = liveActionEvents.findIndex(event => event.playerId === oldPlayer?.id && event.actionId === oldAction?.id && Number(event.period) === parsed.period && event.time === parsed.time);
      liveActionEvents = liveActionEvents.map((event, index) => index === liveActionIndex ? { ...event, ...actionUpdate } : event);
    }
    return { ...previous, dados: { ...previous.dados, _meta: { ...meta, eventLog: logs, fieldEvents,
      ...(isLiveActionMatch && Array.isArray(liveActionEvents) ? { liveActionEvents } : {}) } } };
  });

  const removeLoggedAction = logIndex => setEditMatchData(previous => {
    if (!previous?.dados?._meta) return previous;
    const meta = previous.dados._meta;
    const logs = [...(meta.eventLog || [])];
    const parsed = parseActionLog(logs[logIndex]);
    const player = parsed && players.find(item => item.nome === parsed.playerName);
    const action = parsed && TODAS_ACOES.find(item => item.nome === parsed.actionName);
    logs.splice(logIndex, 1);
    let fieldEvents = meta.fieldEvents || [];
    const fieldEventIndex = fieldEvents.findIndex(event => event.playerId === player?.id && event.actionId === action?.id && Number(event.period) === parsed?.period && event.time === parsed?.time);
    if (fieldEventIndex >= 0) fieldEvents = fieldEvents.filter((_, index) => index !== fieldEventIndex);
    let liveActionEvents = meta.liveActionEvents;
    if (meta.liveMode === 'actions' && Array.isArray(liveActionEvents)) {
      const liveActionIndex = liveActionEvents.findIndex(event => event.playerId === player?.id && event.actionId === action?.id && Number(event.period) === parsed?.period && event.time === parsed?.time);
      if (liveActionIndex >= 0) liveActionEvents = liveActionEvents.filter((_, index) => index !== liveActionIndex);
    }
    return { ...previous, dados: { ...previous.dados, _meta: { ...meta, eventLog: logs, fieldEvents,
      ...(meta.liveMode === 'actions' && Array.isArray(liveActionEvents) ? { liveActionEvents } : {}) } } };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold">Relatórios de Partidas Salvas</h2>
        <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-gray-900 p-1 rounded-lg border border-gray-700 w-full lg:w-auto">
            <span className="text-gray-500 text-xs font-bold px-2 uppercase">De:</span>
            <input type="date" value={historyStartDate} onChange={e => setHistoryStartDate(e.target.value)} className="bg-transparent outline-none text-sm text-blue-400 font-bold" />
            <span className="text-gray-500 text-xs font-bold px-2 uppercase border-l border-gray-700">Até:</span>
            <input type="date" value={historyEndDate} onChange={e => setHistoryEndDate(e.target.value)} className="bg-transparent outline-none text-sm text-blue-400 font-bold" />
          </div>
          <select value={filterMatchCompetition} onChange={e => setFilterMatchCompetition(e.target.value)} className="p-2 bg-gray-900 border border-gray-700 rounded-lg outline-none text-blue-400 font-bold w-full lg:w-auto">
            <option value="">Todas as Competições</option>
            {uniqueCompetitions?.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {filteredHistory.length === 0 ? <div className="text-center py-20 text-gray-500 bg-gray-900 rounded-xl border border-gray-800">Nenhum relatório de partida encontrado com os filtros selecionados.</div> : (
        filteredHistory.map(partida => {
          const ytId = extractYouTubeId(partida.dados?._meta?.videoUrl);
          const currentStartSec = videoSeekState[partida.id] || 0;

          // Extração inteligente das Ações e Atletas presentes na Linha do Tempo desta partida
          const editingThisMatch = editingMatchId === partida.id;
          const displayMeta = editingThisMatch ? (editMatchData?.dados?._meta || {}) : (partida.dados?._meta || {});
          const isPositionMatch = displayMeta.liveMode === 'positions';
          const reportMeta = isPositionMatch ? displayMeta : (partida.dados?._meta || {});
          const positionEvents = isPositionMatch ? (displayMeta.liveActionEvents || []).slice().reverse().map(event => ({
            ...event, teamName: event.teamSide === 'away' ? (displayMeta.equipes?.[1] || displayMeta.awayTeam) : (displayMeta.equipes?.[0] || displayMeta.homeTeam)
          })) : [];
          const rawLogs = isPositionMatch ? positionEvents.map(formatPositionActionLog)
            : editingThisMatch ? (editMatchData?.dados?._meta?.eventLog || []) : (partida.dados?._meta?.eventLog || []);
          const selectedAction = timelineActionFilter[partida.id] || '';
          const selectedPlayer = timelinePlayerFilter[partida.id] || '';
          const selectedTeam = timelineTeamFilter[partida.id] || '';
          const filteredPositionEvents = positionEvents.filter(event => (!selectedAction || event.label === selectedAction)
            && (!selectedPlayer || event.positionId === selectedPlayer) && (!selectedTeam || event.teamSide === selectedTeam));
          const positionsInLogs = [...new Map(positionEvents.map(event => [event.positionId, event.positionLabel])).entries()];
          const positionRows = [...positionEvents.reduce((rows, event) => {
            const key = `${event.teamSide}:${event.positionId}`;
            const row = rows.get(key) || { key, teamName: event.teamName, positionLabel: event.positionLabel, actions: {}, total: 0 };
            row.actions[event.actionId] = (row.actions[event.actionId] || 0) + 1;
            row.total += 1;
            rows.set(key, row);
            return rows;
          }, new Map()).values()];
          const positionActions = TODAS_ACOES.filter(action => positionEvents.some(event => event.actionId === action.id));

          const uniqueActionsInLogs = [...new Set(rawLogs.map(log => {
            if (log.includes('•')) return log.split('•')[1].trim();
            if (log.includes('Substituição')) return 'Substituição';
            return null;
          }).filter(Boolean))].sort();

          const uniquePlayersInLogs = [...new Set(rawLogs.map(log => {
            if (log.includes('•')) {
              const afterBracket = log.split(']')[1] || '';
              return afterBracket.split('•')[0].trim();
            }
            return null;
          }).filter(Boolean))].sort();

          // Filtragem dos eventos da Linha do Tempo
          const filteredLogs = rawLogs.map((log, index) => ({ log, index })).filter(({ log }) => {
            if (selectedAction) {
              if (selectedAction === 'Substituição') {
                if (!log.includes('Substituição')) return false;
              } else {
                const actionPart = log.includes('•') ? log.split('•')[1].trim() : '';
                if (actionPart !== selectedAction) return false;
              }
            }
            if (selectedPlayer) {
              if (log.includes('•')) {
                const playerPart = (log.split(']')[1] || '').split('•')[0].trim();
                if (playerPart !== selectedPlayer) return false;
              } else {
                if (!log.includes(selectedPlayer)) return false;
              }
            }
            return true;
          });

          const fieldEvents = (isPositionMatch ? displayMeta.fieldEvents : partida.dados?._meta?.fieldEvents) || [];
          const actionFilter = fieldMapActionFilter[partida.id] || '';
          const periodFilter = fieldMapPeriodFilter[partida.id] || '';
          const actions = [...new Map(fieldEvents.map(event => [event.actionId, event.label || event.actionId])).entries()];
          const actionFilteredEvents = actionFilter ? fieldEvents.filter(event => event.actionId === actionFilter) : fieldEvents;
          const visibleEvents = actionFilteredEvents.filter(event => !periodFilter || Number(event.period) === periodFilter);
          const distribution = [
            { label: "0'–15'", count: 0 }, { label: "16'–30'", count: 0 },
            { label: "31'–fim 1ºT", count: 0 }, { label: "45'–60'", count: 0 },
            { label: "61'–75'", count: 0 }, { label: ">75'", count: 0 }
          ];
          actionFilteredEvents.forEach(event => {
            if (!event.time) return;
            const period = Number(event.period);
            const minute = Math.floor(timeToSeconds(event.time) / 60);
            let bucketIndex = -1;
            if (period === 1) bucketIndex = minute <= 15 ? 0 : minute <= 30 ? 1 : 2;
            else if (period === 2) {
              const matchMinute = 45 + minute;
              bucketIndex = matchMinute <= 60 ? 3 : matchMinute <= 75 ? 4 : 5;
            } else if (period > 2) bucketIndex = 5;
            if (bucketIndex >= 0) distribution[bucketIndex].count += 1;
          });
          const maxCount = Math.max(...distribution.map(bucket => bucket.count), 1);

          return (
            <div key={partida.id} className={`bg-gray-900 rounded-xl border transition ${editingMatchId === partida.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-800'}`}>
              <div className="p-4 bg-gray-800/50 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800/50 gap-4">
                {editingMatchId === partida.id ? (
                  <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input type="text" value={editMatchData.titulo} onChange={e => setEditMatchData({...editMatchData, titulo: e.target.value})} className="p-2 bg-gray-950 rounded border border-gray-700 text-blue-400 font-bold outline-none" placeholder="Título da Partida" />
                    <input type="text" value={editMatchData.dados._meta?.videoUrl || ''} onChange={e => setEditMatchData({...editMatchData, dados: {...editMatchData.dados, _meta: {...editMatchData.dados._meta, videoUrl: e.target.value}}})} className="p-2 bg-gray-950 rounded border border-gray-700 text-xs text-white outline-none" placeholder="Link do YouTube..." />
                    <div className="flex gap-2">
                      <input type="text" value={editMatchData.dados._meta?.offsetT1 || '00:00'} onChange={e => setEditMatchData({...editMatchData, dados: {...editMatchData.dados, _meta: {...editMatchData.dados._meta, offsetT1: e.target.value}}})} className="w-1/2 p-2 bg-gray-950 rounded border border-gray-700 text-xs font-mono text-center text-blue-400" placeholder="1ºT (00:00)" title="Início do 1º Tempo no Vídeo" />
                      <input type="text" value={editMatchData.dados._meta?.offsetT2 || '45:00'} onChange={e => setEditMatchData({...editMatchData, dados: {...editMatchData.dados, _meta: {...editMatchData.dados._meta, offsetT2: e.target.value}}})} className="w-1/2 p-2 bg-gray-950 rounded border border-gray-700 text-xs font-mono text-center text-blue-400" placeholder="2ºT (45:00)" title="Início do 2º Tempo no Vídeo" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="font-bold text-lg text-blue-400 flex flex-wrap items-center gap-2">
                      {partida.dados?._meta?.competicao && <span className="bg-blue-900/30 text-blue-300 text-[10px] px-2 py-0.5 rounded uppercase border border-blue-900/50">{reportMeta.competicao}</span>}
                      {partida.titulo}
                      {ytId && <span className="bg-red-900/30 text-red-400 text-[10px] px-2 py-0.5 rounded border border-red-900/50">🎥 Vídeo Disponível</span>}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">Registado em: {new Date(partida.criado_em).toLocaleDateString()}</p>
                  </div>
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
                  {reportMeta && (
                     <div className="mb-6 space-y-4">
                        {(reportMeta.fieldEvents?.length > 0 || reportMeta.periodLogs?.length > 0 || reportMeta.gols_sofridos > 0 || reportMeta.finalizacoes_adversario > 0 || reportMeta.ultimo_terco_adversario > 0) && <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                        {fieldEvents.length > 0 && <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <h4 className="text-gray-200 font-bold text-sm">Mapa de ações da partida</h4>
                              {periodFilter && <button type="button" onClick={() => setFieldMapPeriodFilter(prev => ({ ...prev, [partida.id]: '' }))} className="text-[10px] text-blue-400 hover:text-blue-300 mt-1">Mostrar todos os tempos</button>}
                            </div>
                            <select aria-label="Filtrar mapa por ação" value={actionFilter} onChange={event => setFieldMapActionFilter(prev => ({ ...prev, [partida.id]: event.target.value }))} className="p-2 bg-gray-900 border border-gray-700 rounded text-xs text-blue-300 font-bold">
                              <option value="">Todas as ações</option>
                              {actions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                            </select>
                          </div>
                          <div className="max-w-xl"><CampoFutebol events={visibleEvents} title="" orientation="horizontal" /></div>
                        </div>}
                        <div className="space-y-4">
                          {reportMeta.periodLogs?.length > 0 && (
                             <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                               <h4 className="text-gray-400 font-bold text-sm mb-2">Duração (Tempos):</h4>
                               {reportMeta.periodLogs.map((log, index) => {
                                 const period = Number(log.match(/^(\d+)º Tempo:/)?.[1]);
                                 const isSelected = fieldMapPeriodFilter[partida.id] === period;
                                 return <button key={index} type="button" disabled={!period || !reportMeta.fieldEvents?.length} onClick={() => setFieldMapPeriodFilter(previous => ({ ...previous, [partida.id]: isSelected ? '' : period }))} className={`block w-full text-left font-mono text-sm rounded px-2 py-1 transition ${isSelected ? 'bg-blue-900/40 text-blue-200' : 'text-blue-400 hover:bg-gray-900'} disabled:cursor-default disabled:hover:bg-transparent`} title={reportMeta.fieldEvents?.length ? 'Clique para filtrar o mapa por este tempo' : 'Esta partida não tem ações marcadas no mapa'}>
                                   {log}{reportMeta.fieldEvents?.length > 0 && <span className="ml-2 text-[10px] text-gray-500">{isSelected ? 'Mapa filtrado' : 'Filtrar mapa'}</span>}
                                 </button>;
                               })}
                             </div>
                          )}
                          <div className="bg-gray-950 p-3 rounded-lg border border-red-900/30">
                            <h4 className="text-red-400 font-bold text-sm mb-2">{isPositionMatch ? "Ações de " + (displayMeta.equipes?.[1] || displayMeta.awayTeam) : '🛡️ Ações do Adversário:'}</h4>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div><span className="text-gray-500 text-[10px] uppercase block mb-1">Golos</span>{editingMatchId === partida.id && !isPositionMatch ? <input type="number" min="0" value={editMatchData.dados._meta?.gols_sofridos ?? 0} onChange={e => setEditMatchData({...editMatchData, dados: {...editMatchData.dados, _meta: {...editMatchData.dados._meta, gols_sofridos: parseInt(e.target.value)||0}}})} className="w-full p-1 text-center bg-gray-900 text-red-400 font-bold text-sm rounded border border-gray-700 outline-none" /> : <div className="text-red-400 font-mono text-lg font-bold">{reportMeta?.gols_sofridos ?? 0}</div>}</div>
                              <div><span className="text-gray-500 text-[10px] uppercase block mb-1">Finaliz.</span>{editingMatchId === partida.id && !isPositionMatch ? <input type="number" min="0" value={editMatchData.dados._meta?.finalizacoes_adversario ?? 0} onChange={e => setEditMatchData({...editMatchData, dados: {...editMatchData.dados, _meta: {...editMatchData.dados._meta, finalizacoes_adversario: parseInt(e.target.value)||0}}})} className="w-full p-1 text-center bg-gray-900 text-red-400 font-bold text-sm rounded border border-gray-700 outline-none" /> : <div className="text-red-400 font-mono text-lg font-bold">{reportMeta?.finalizacoes_adversario ?? 0}</div>}</div>
                              <div><span className="text-gray-500 text-[10px] uppercase block mb-1">Últ. Terço</span>{editingMatchId === partida.id && !isPositionMatch ? <input type="number" min="0" value={editMatchData.dados._meta?.ultimo_terco_adversario ?? 0} onChange={e => setEditMatchData({...editMatchData, dados: {...editMatchData.dados, _meta: {...editMatchData.dados._meta, ultimo_terco_adversario: parseInt(e.target.value)||0}}})} className="w-full p-1 text-center bg-gray-900 text-red-400 font-bold text-sm rounded border border-gray-700 outline-none" /> : <div className="text-red-400 font-mono text-lg font-bold">{reportMeta?.ultimo_terco_adversario ?? 0}</div>}</div>
                            </div>
                          </div>
                          {fieldEvents.length > 0 && <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 space-y-3">
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <h5 className="text-gray-200 font-bold text-xs">Distribuição por período</h5>
                              <span className="text-[10px] text-gray-500">{actionFilter ? actions.find(([id]) => id === actionFilter)?.[1] : 'Todas as ações'}</span>
                            </div>
                            <div className="overflow-x-auto">
                              <div className="grid grid-cols-6 gap-2 min-w-[510px] items-end">
                                {distribution.map(bucket => <div key={bucket.label} className="min-w-0 text-center">
                                  <div className="h-24 flex flex-col justify-end items-center">
                                    <span className="text-xs font-bold text-white mb-1">{bucket.count}</span>
                                    <div className="w-full max-w-12 rounded-t bg-blue-500/80 border border-blue-300/30 transition-all" style={{ height: `${Math.max(bucket.count ? 8 : 2, (bucket.count / maxCount) * 72)}px` }} title={`${bucket.count} ações`} />
                                  </div>
                                  <span className="block text-[10px] text-gray-400 mt-2 leading-tight">{bucket.label}</span>
                                </div>)}
                              </div>
                            </div>
                          </div>}
                        </div>
                        </div>}

                        {/* GRELHA VÍDEO + LINHA DO TEMPO CLICÁVEL COM FILTROS */}
                        {(ytId || rawLogs.length > 0) && (
                          <div className={`grid grid-cols-1 ${ytId ? 'lg:grid-cols-3' : ''} gap-4`}>
                            {ytId && (
                              <div className="lg:col-span-2 aspect-video bg-black rounded-lg overflow-hidden border border-gray-800">
                                <iframe
                                  key={`${ytId}-${currentStartSec}`}
                                  className="w-full h-full"
                                  src={`https://www.youtube.com/embed/${ytId}?start=${currentStartSec}&autoplay=1&rel=0`}
                                  title="Vídeo da Partida"
                                  frameBorder="0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            )}
                            {rawLogs.length > 0 && (
                               <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 max-h-[420px] flex flex-col">
                                 <div className="flex justify-between items-center mb-2">
                                   <h4 className="text-gray-300 font-bold text-sm">⏱️ Linha do Tempo</h4>
                                   <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded font-mono font-bold">
                                     {isPositionMatch ? filteredPositionEvents.length : filteredLogs.length} {(isPositionMatch ? filteredPositionEvents.length : filteredLogs.length) === 1 ? 'lance' : 'lances'}
                                   </span>
                                 </div>

                                 {/* FILTROS DE AÇÃO E ATLETA NA LINHA DO TEMPO */}
                                 <div className={`grid grid-cols-1 ${isPositionMatch ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-2 mb-3 pb-2 border-b border-gray-800`}>
                                   <select
                                     value={selectedAction}
                                     onChange={e => setTimelineActionFilter(prev => ({ ...prev, [partida.id]: e.target.value }))}
                                     className="p-1.5 bg-gray-900 border border-gray-700 rounded text-xs text-blue-400 font-bold outline-none focus:border-blue-500"
                                   >
                                     <option value="">Todas as Ações</option>
                                     {uniqueActionsInLogs.map(act => (
                                       <option key={act} value={act}>{act}</option>
                                     ))}
                                   </select>

                                   <select
                                     value={selectedPlayer}
                                     onChange={e => setTimelinePlayerFilter(prev => ({ ...prev, [partida.id]: e.target.value }))}
                                     className="p-1.5 bg-gray-900 border border-gray-700 rounded text-xs text-gray-300 font-bold outline-none focus:border-blue-500"
                                   >
                                     <option value="">{isPositionMatch ? 'Todas as posições' : 'Todos os Atletas'}</option>
                                     {isPositionMatch ? positionsInLogs.map(([id, label]) => <option key={id} value={id}>{label}</option>) : uniquePlayersInLogs.map(pl => (
                                       <option key={pl} value={pl}>{pl}</option>
                                     ))}
                                   </select>
                                   {isPositionMatch && <select aria-label="Filtrar lances por equipe" value={selectedTeam} onChange={event => setTimelineTeamFilter(previous => ({ ...previous, [partida.id]: event.target.value }))} className="p-1.5 bg-gray-900 border border-gray-700 rounded text-xs text-gray-300 font-bold outline-none focus:border-blue-500">
                                     <option value="">Todas as equipes</option>
                                     <option value="home">{displayMeta.equipes?.[0] || displayMeta.homeTeam}</option>
                                     <option value="away">{displayMeta.equipes?.[1] || displayMeta.awayTeam}</option>
                                   </select>}
                                 </div>

                                 <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                                   {isPositionMatch ? (filteredPositionEvents.length === 0 ? <p className="text-xs text-gray-600 text-center py-8">Nenhum lance encontrado para este filtro.</p> : filteredPositionEvents.map(event => editingThisMatch ? (
                                     <div key={event.id} className="p-2 bg-gray-900 rounded border border-gray-800 space-y-2">
                                       <div className="grid grid-cols-2 gap-2" aria-label="Equipe da ação">
                                         {['home', 'away'].map((side, index) => <button key={side} type="button" aria-pressed={event.teamSide === side} onClick={() => updatePositionAction(event.id, { teamSide: side })} className={`rounded border p-2 text-xs font-bold ${event.teamSide === side ? 'border-blue-400 bg-blue-900/40 text-blue-200' : 'border-gray-700 text-gray-300'}`}>{displayMeta.equipes?.[index] || (side === 'home' ? displayMeta.homeTeam : displayMeta.awayTeam)}</button>)}
                                       </div>
                                       <div className="grid grid-cols-2 gap-2">
                                         <select aria-label="Posição da ação" value={event.positionId} onChange={input => updatePositionAction(event.id, { positionId: input.target.value })} className="min-w-0 p-1.5 bg-gray-950 border border-gray-700 rounded text-xs text-gray-200">
                                           <option value="">Selecione a posição</option>
                                           {getFormationPositions(displayMeta.formations?.[event.teamSide]).map(position => <option key={position.id} value={position.id}>{position.label}</option>)}
                                         </select>
                                         <select aria-label="Tipo de ação" value={event.actionId} onChange={input => updatePositionAction(event.id, { actionId: input.target.value })} className="min-w-0 p-1.5 bg-gray-950 border border-gray-700 rounded text-xs text-blue-300">
                                           {TODAS_ACOES.filter(action => positionActionIds.has(action.id)).map(action => <option key={action.id} value={action.id}>{action.nome}</option>)}
                                         </select>
                                         <select aria-label="Tempo da ação" value={event.period} onChange={input => updatePositionAction(event.id, { period: Number(input.target.value) })} className="p-1.5 bg-gray-950 border border-gray-700 rounded text-xs text-gray-300">
                                           {[1, 2, 3, 4].map(period => <option key={period} value={period}>{period}º Tempo</option>)}
                                         </select>
                                         <input aria-label="Minuto da ação" type="text" value={event.time} onChange={input => { if (/^\d{0,2}(:\d{0,2})?$/.test(input.target.value)) updatePositionAction(event.id, { time: input.target.value }); }} placeholder="MM:SS" className="min-w-0 p-1.5 bg-gray-950 border border-gray-700 rounded text-xs font-mono text-gray-300" />
                                       </div>
                                       <button type="button" onClick={() => removePositionAction(event.id)} className="text-[10px] font-bold text-red-400 hover:text-red-300">Remover ação</button>
                                     </div>
                                   ) : <button key={event.id} type="button" onClick={() => handleTimelineClick(partida, formatPositionActionLog(event))} className="w-full text-left text-gray-300 text-xs border-l-2 border-blue-500 pl-2 py-1.5 bg-gray-900/60 hover:bg-blue-900/30 hover:text-white rounded-r">
                                     {formatPositionActionLog(event)}{ytId && <span className="ml-2 text-[10px] text-blue-400">▶ Ver</span>}
                                   </button>)) : filteredLogs.length === 0 ? (
                                     <p className="text-xs text-gray-600 text-center py-8">Nenhum lance encontrado para este filtro.</p>
                                   ) : (
                                     filteredLogs.map(({ log, index }) => {
                                       const parsedAction = parseActionLog(log);
                                       const actionPlayer = parsedAction && players.find(player => player.nome === parsedAction.playerName);
                                       const actionType = parsedAction && TODAS_ACOES.find(action => action.nome === parsedAction.actionName);
                                       if (editingThisMatch && parsedAction && actionPlayer && actionType) {
                                         const playersInMatch = Object.keys(editMatchData.dados).filter(id => id !== '_meta').map(id => players.find(player => player.id === id)).filter(Boolean);
                                         return <div key={index} className="p-2 bg-gray-900 rounded border border-gray-800 space-y-2">
                                           <div className="grid grid-cols-2 gap-2">
                                             <select aria-label="Atleta da ação" value={actionPlayer.id} onChange={event => updateLoggedAction(index, { playerId: event.target.value })} className="min-w-0 p-1.5 bg-gray-950 border border-gray-700 rounded text-xs text-gray-200">
                                               {playersInMatch.map(player => <option key={player.id} value={player.id}>{player.nome}</option>)}
                                             </select>
                                             <select aria-label="Tipo de ação" value={actionType.id} onChange={event => updateLoggedAction(index, { actionId: event.target.value })} className="min-w-0 p-1.5 bg-gray-950 border border-gray-700 rounded text-xs text-blue-300">
                                               {TODAS_ACOES.map(action => <option key={action.id} value={action.id}>{action.nome}</option>)}
                                             </select>
                                             <select aria-label="Tempo da ação" value={parsedAction.period} onChange={event => updateLoggedAction(index, { period: Number(event.target.value) })} className="p-1.5 bg-gray-950 border border-gray-700 rounded text-xs text-gray-300">
                                               {[1, 2, 3, 4].map(period => <option key={period} value={period}>{period}º Tempo</option>)}
                                             </select>
                                             <input aria-label="Minuto da ação" type="text" value={parsedAction.time} onChange={event => { if (/^\d{0,2}(:\d{0,2})?$/.test(event.target.value)) updateLoggedAction(index, { time: event.target.value }); }} placeholder="MM:SS" className="min-w-0 p-1.5 bg-gray-950 border border-gray-700 rounded text-xs font-mono text-gray-300" />
                                           </div>
                                           <button type="button" onClick={() => removeLoggedAction(index)} className="text-[10px] font-bold text-red-400 hover:text-red-300">Remover ação</button>
                                         </div>;
                                       }
                                       return <button
                                         key={index}
                                         type="button"
                                         onClick={() => handleTimelineClick(partida, log)}
                                         className="w-full text-left text-gray-300 text-xs border-l-2 border-blue-500 pl-2 py-1.5 bg-gray-900/60 hover:bg-blue-900/30 hover:text-white rounded-r transition flex justify-between items-center group"
                                       >
                                         <span>{log}</span>
                                         {ytId && <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 font-bold pr-2 whitespace-nowrap">▶ Ver</span>}
                                       </button>;
                                     })
                                   )}
                                 </div>
                               </div>
                            )}
                          </div>
                        )}
                     </div>
                  )}
                  
                  {isPositionMatch ? <section className="space-y-3" aria-label="Estatísticas por equipe e posição">
                    <div className="flex flex-wrap gap-3 text-sm text-gray-300">
                      {['home', 'away'].map((side, index) => <div key={side} className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2">
                        <span className="font-bold text-white">{displayMeta.equipes?.[index] || (side === 'home' ? displayMeta.homeTeam : displayMeta.awayTeam)}</span>
                        <span className="ml-2 text-gray-400">{displayMeta.formations?.[side]} · {positionEvents.filter(event => event.teamSide === side).length} ações</span>
                      </div>)}
                    </div>
                    {positionRows.length ? <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-max text-sm">
                        <thead><tr className="border-b border-gray-800 text-gray-400"><th scope="col" className="p-2">Equipe</th><th scope="col" className="p-2">Posição</th>{positionActions.map(action => <th scope="col" key={action.id} className="p-2 text-center">{action.nome}</th>)}<th scope="col" className="p-2 text-center">Total</th></tr></thead>
                        <tbody>{positionRows.map(row => <tr key={row.key} className="border-b border-gray-800/50 text-gray-300"><td className="p-2 font-bold">{row.teamName}</td><td className="p-2">{row.positionLabel}</td>{positionActions.map(action => <td key={action.id} className="p-2 text-center font-mono">{row.actions[action.id] || 0}</td>)}<td className="p-2 text-center font-mono font-bold text-blue-300">{row.total}</td></tr>)}</tbody>
                      </table>
                    </div> : <p className="text-sm text-gray-500">Nenhuma ação registrada nesta partida.</p>}
                  </section> : <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-max">
                      <thead><tr className="border-b border-gray-800 text-gray-400 text-sm"><th className="p-2 sticky left-0 bg-gray-900 shadow-[1px_0_0_#1f2937] z-10">Atleta</th>{TODAS_ACOES.map(a => <th key={a.id} className="p-2 text-center" title={a.nome}>{a.nome.substring(0,4)}.</th>)}</tr></thead>
                      <tbody>
                        {Object.keys(editingMatchId === partida.id ? editMatchData.dados : partida.dados).filter(id => id !== '_meta').map(playerId => {
                          const p = players.find(x => x.id === playerId) || { nome: 'Removido' };
                          const playerSectors = getPlayerSectors(p);
                          const isGoleiro = playerSectors.includes('GOLEIRO (GK)');
                          const isJogadorDeLinha = playerSectors.length === 0 || playerSectors.some(sector => sector !== 'GOLEIRO (GK)');

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
                                  const isValid = (isGoleiro && ACOES_GOLEIRO.some(ag => ag.id === a.id)) || (isJogadorDeLinha && ACOES_LINHA.some(al => al.id === a.id));
                                  if (!isValid) return <td key={a.id} className="p-2 text-center text-gray-700">-</td>;
                                  return <td key={a.id} className="p-2 text-center font-mono text-gray-300">{partida.dados[playerId]?.[a.id] || 0}</td>
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
