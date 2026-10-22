import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import Navbar from './components/Navbar';
import AbaClubes from './components/AbaClubes';
import AbaBaseDados from './components/AbaBaseDados';
import PerfilAtleta from './components/PerfilAtleta';
import AbaLiveMatch from './components/AbaLiveMatch';
import AbaHistorico from './components/AbaHistorico';
import AbaAnalise from './components/AbaAnalise';
import AbaRanking from './components/AbaRanking';
import AbaComparativo from './components/AbaComparativo';
import AbaRelatorios from './components/AbaRelatorios';
import CampoFutebol, { CORES_ACAO_CAMPO } from './components/CampoFutebol';
import { getPlayerActions, getPlayerSectors } from './utils/playerSectors';

export const SETORES = {
  'GOLEIRO (GK)': ['GOLEIRO (GK)'],
  'DEFENSORES (DEF)': ['ZAGUEIRO (ZAG)', 'LATERAL DIREITO (LD)', 'LATERAL ESQUERDO (LE)'],
  'MÉDIOS (MEI)': ['VOLANTE (VOL)', 'MEIA CENTRAL (MC)', '2º VOLANTE (2ºV)', 'MEIA ATACANTE (MEI)'],
  'ATACANTES (ATA)': ['EXTREMO (EX)', 'CENTRO AVANTE (CA)', 'FALSO 9 (F9)']
};

export const ACOES_LINHA = [
  { id: 'partidas', nome: 'Partidas', categoria: 'Geral' }, 
  { id: 'minutos', nome: 'Minutos Jogados', categoria: 'Geral' },
  { id: 'progressoes', nome: 'Progressões', categoria: 'Geral' },
  { id: 'finalizacoes_certas', nome: 'Fin. Certas', categoria: 'Finalizações' }, 
  { id: 'finalizacoes_erradas', nome: 'Fin. Erradas', categoria: 'Finalizações' }, 
  { id: 'gols', nome: 'Golos', categoria: 'Finalizações' },
  { id: 'cruzamentos', nome: 'Cruzamentos', categoria: 'Passes' },
  { id: 'passes_chave', nome: 'Passes Chave', categoria: 'Passes' },
  { id: 'passes_frente', nome: 'Passes p/ Frente', categoria: 'Passes' },
  { id: 'assistencias', nome: 'Assistências', categoria: 'Passes' },
  { id: 'desarmes', nome: 'Desarmes', categoria: 'Defensivo' },
  { id: 'duelos_aereos', nome: 'Duelos Aéreos', categoria: 'Defensivo' },
  { id: 'bloqueios', nome: 'Bloqueios', categoria: 'Defensivo' },
  { id: 'cartoes_amarelos', nome: 'Cartões Amarelos', categoria: 'Disciplinares' },
  { id: 'cartoes_vermelhos', nome: 'Cartões Vermelhos', categoria: 'Disciplinares' },
  { id: 'faltas_cometidas', nome: 'Faltas Cometidas', categoria: 'Disciplinares' },
  { id: 'perdas_posse', nome: 'Perdas de Posse', categoria: 'Erros' },
  { id: 'erro_passe', nome: 'Erro de Passe', categoria: 'Erros' }
];

export const ACOES_GOLEIRO = [
  { id: 'partidas', nome: 'Partidas', categoria: 'Geral' }, 
  { id: 'minutos', nome: 'Minutos Jogados', categoria: 'Geral' },
  { id: 'defesas', nome: 'Defesas', categoria: 'Guarda-Redes' }, 
  { id: 'defesas_dificeis', nome: 'Defesas difíceis', categoria: 'Guarda-Redes' },
  { id: 'saida_meta', nome: 'Saída de meta', categoria: 'Guarda-Redes' }, 
  { id: 'confrontos', nome: 'Confrontos', categoria: 'Guarda-Redes' },
  { id: 'gols_sofridos', nome: 'Golos Sofridos', categoria: 'Guarda-Redes' },
  { id: 'tiros_meta', nome: 'Tiros de meta', categoria: 'Distribuição' }, 
  { id: 'acoes_pes', nome: 'Ações com os pés', categoria: 'Distribuição' },
  { id: 'cartoes_amarelos', nome: 'Cartões Amarelos', categoria: 'Disciplinares' }, 
  { id: 'cartoes_vermelhos', nome: 'Cartões Vermelhos', categoria: 'Disciplinares' },
  { id: 'faltas_cometidas', nome: 'Faltas Cometidas', categoria: 'Disciplinares' }
];

export const TODAS_ACOES = [...new Map([...ACOES_LINHA, ...ACOES_GOLEIRO].map(item => [item.id, item])).values()];

export const isDateInRange = (dateString, startDate, endDate) => {
  if (!startDate && !endDate) return true;
  const matchDate = new Date(dateString);
  if (startDate && matchDate < new Date(startDate + 'T00:00:00')) return false;
  if (endDate && matchDate > new Date(endDate + 'T23:59:59')) return false;
  return true;
};

const clockToSeconds = value => {
  const [minutes = 0, seconds = 0] = (value || '0:0').split(':').map(Number);
  return minutes * 60 + seconds;
};

const calculatePlayedMinutes = (squad, eventLog, periodLogs, currentPeriod, currentPeriodSeconds) => {
  const durations = {};
  (periodLogs || []).forEach(log => {
    const match = log.match(/^(\d+)º Tempo:\s*(\d{1,2}:\d{2})$/);
    if (match) durations[Number(match[1])] = clockToSeconds(match[2]);
  });
  if (currentPeriod <= 4) durations[currentPeriod] = Math.max(durations[currentPeriod] || 0, currentPeriodSeconds || 0);

  const playersByName = new Map((squad || []).map(player => [player.nome, player.id]));
  const substitutions = (eventLog || []).map(line => {
    const time = line.match(/^\[T(\d+)\s*-\s*(\d{1,2}:\d{2})\].*SAIU\s+(.+?)\s*\|\s*ENTROU\s+(.+)$/);
    if (!time) return null;
    return { period: Number(time[1]), seconds: clockToSeconds(time[2]), outId: playersByName.get(time[3].trim()), inId: playersByName.get(time[4].trim()) };
  }).filter(Boolean).sort((a, b) => a.period - b.period || a.seconds - b.seconds);

  const active = new Set((squad || []).filter(player => player.titular).map(player => player.id));
  const totals = Object.fromEntries((squad || []).map(player => [player.id, 0]));
  Object.keys(durations).map(Number).sort((a, b) => a - b).forEach(period => {
    let cursor = 0;
    substitutions.filter(event => event.period === period).forEach(event => {
      const eventSecond = Math.min(durations[period], Math.max(cursor, event.seconds));
      if (event.outId && active.has(event.outId)) totals[event.outId] += eventSecond - cursor;
      if (event.outId) active.delete(event.outId);
      if (event.inId) active.add(event.inId);
      cursor = eventSecond;
    });
    active.forEach(playerId => { totals[playerId] += Math.max(0, durations[period] - cursor); });
  });
  return Object.fromEntries(Object.entries(totals).map(([playerId, seconds]) => [playerId, Math.floor(seconds / 60)]));
};

export default function App() {
  const [session, setSession] = useState(null);

  const [activeTab, setActiveTab] = useState('scout');
  const [selectedPlayerProfileId, setSelectedPlayerProfileId] = useState(null);

  const [teams, setTeams] = useState([]);
  const [teamMetadata, setTeamMetadata] = useState({});
  const [players, setPlayers] = useState([]);
  const [matchHistory, setMatchHistory] = useState([]);
  
  const [competitions, setCompetitions] = useState([]);
  const [newCompetitionName, setNewCompetitionName] = useState('');
  
  const [filterTeam, setFilterTeam] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [novoJogador, setNovoJogador] = useState({ nome: '', time_nome: '', categoria: '', setor: '', setores: [], funcoes: [''], altura: '', pe_dominante: 'Destro', percentual_gordura: '', velocidade_maxima: '', ano_nascimento: '' });

  const [matchCompetition, setMatchCompetition] = useState(''); 
  const [filterMatchCompetition, setFilterMatchCompetition] = useState(''); 
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [globalStartDate, setGlobalStartDate] = useState('');
  const [globalEndDate, setGlobalEndDate] = useState('');
  const [startDateA, setStartDateA] = useState('');
  const [endDateA, setEndDateA] = useState('');
  const [startDateB, setStartDateB] = useState('');
  const [endDateB, setEndDateB] = useState('');

  const [matchTeam, setMatchTeam] = useState('');
  const [matchCategory, setMatchCategory] = useState(''); 
  const [matchSquad, setMatchSquad] = useState([]); 
  const [isMatchActive, setIsMatchActive] = useState(false);
  const [matchTitle, setMatchTitle] = useState('');
  const [matchDate, setMatchDate] = useState('');
  
  const [matchVideoUrl, setMatchVideoUrl] = useState('');
  const [videoOffsetT1, setVideoOffsetT1] = useState('00:00');
  const [videoOffsetT2, setVideoOffsetT2] = useState('45:00');
  
  const [matchStats, setMatchStats] = useState({});
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [matchTime, setMatchTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState(1);
  const [periodLogs, setPeriodLogs] = useState([]);
  const [matchEventLog, setMatchEventLog] = useState([]);
  const [fieldEvents, setFieldEvents] = useState([]);
  const [pendingFieldEvent, setPendingFieldEvent] = useState(null);
  const [opponentGoals, setOpponentGoals] = useState(0);
  const [opponentShots, setOpponentShots] = useState(0);
  const [opponentFinalThird, setOpponentFinalThird] = useState(0);

  const [editingMatchId, setEditingMatchId] = useState(null);
  const [editMatchData, setEditMatchData] = useState(null);

  const [compareA, setCompareA] = useState('');
  const [filterTeamA, setFilterTeamA] = useState('');
  const [filterCategoryA, setFilterCategoryA] = useState('');
  const [filterSectorA, setFilterSectorA] = useState('');
  const [compareB, setCompareB] = useState('');
  const [filterTeamB, setFilterTeamB] = useState('');
  const [filterCategoryB, setFilterCategoryB] = useState('');
  const [filterSectorB, setFilterSectorB] = useState('');
  const [showSectorWarning, setShowSectorWarning] = useState(false);
  const [dismissedWarningFor, setDismissedWarningFor] = useState('');

  const [rankMetric, setRankMetric] = useState('gols');
  const [savedMetrics, setSavedMetrics] = useState(() => {
    const localData = localStorage.getItem('scoutpro_custom_metrics');
    return localData ? JSON.parse(localData) : [{ id: 'gols_por_minuto', nome: 'Golos por Minuto Jog.', numerador: 'gols', denominador: 'minutos' }];
  });
  const [novaMetrica, setNovaMetrica] = useState({ nome: '', numerador: '', denominador: '' });
  const [selectedMetricId, setSelectedMetricId] = useState(savedMetrics[0]?.id || null);

  const safePlayers = players || [];
  const safeMatchHistory = matchHistory || [];

  const uniqueCategories = [...new Set(safePlayers.map(p => p.categoria).filter(Boolean))];
  if (!uniqueCategories.includes('Principal')) uniqueCategories.push('Principal');
  if (!uniqueCategories.includes('Sub-20')) uniqueCategories.push('Sub-20');

  const uniqueCompetitionsHistory = [...new Set(safeMatchHistory.map(m => m.dados?._meta?.competicao).filter(Boolean))].sort();

  const displayedPlayers = safePlayers.filter(p => {
    if (filterTeam && p.time_nome !== filterTeam) return false;
    if (filterCategory && p.categoria !== filterCategory) return false;
    return true;
  });

  const filteredPlayersA = safePlayers.filter(p => {
    if (filterTeamA && p.time_nome !== filterTeamA) return false;
    if (filterCategoryA && p.categoria !== filterCategoryA) return false;
    if (filterSectorA && !getPlayerSectors(p).includes(filterSectorA)) return false;
    if ((startDateA || endDateA) && !safeMatchHistory.some(m => isDateInRange(m.criado_em, startDateA, endDateA) && m.dados && m.dados[p.id])) return false;
    return true;
  });

  const filteredPlayersB = safePlayers.filter(p => {
    if (filterTeamB && p.time_nome !== filterTeamB) return false;
    if (filterCategoryB && p.categoria !== filterCategoryB) return false;
    if (filterSectorB && !getPlayerSectors(p).includes(filterSectorB)) return false;
    if ((startDateB || endDateB) && !safeMatchHistory.some(m => isDateInRange(m.criado_em, startDateB, endDateB) && m.dados && m.dados[p.id])) return false;
    return true;
  });

  const getComputedStats = (player, startDate, endDate, competition = '') => {
    if (!startDate && !endDate && !competition) return player.acoes;
    const playerMatches = safeMatchHistory.filter(m =>
      isDateInRange(m.criado_em, startDate, endDate) &&
      (!competition || m.dados?._meta?.competicao === competition) &&
      m.dados && m.dados[player.id]
    );
    const computed = {};
    TODAS_ACOES.forEach(a => computed[a.id] = 0);
    playerMatches.forEach(m => {
      const st = m.dados[player.id];
      Object.keys(st).forEach(k => { computed[k] = (computed[k] || 0) + (parseInt(st[k]) || 0); });
    });
    return computed;
  };

  const playersWithCalculatedStats = displayedPlayers.map(p => ({
    ...p,
    acoes_calc: getComputedStats(p, globalStartDate, globalEndDate),
    acoes: (globalStartDate || globalEndDate) ? getComputedStats(p, globalStartDate, globalEndDate) : p.acoes
  }));

  useEffect(() => {
    if (compareA && compareB) {
      const pA = safePlayers.find(p => p.id === compareA);
      const pB = safePlayers.find(p => p.id === compareB);
      if (pA && pB && getPlayerSectors(pA).join('|') !== getPlayerSectors(pB).join('|')) {
        const compareKey = `${compareA}-${compareB}`;
        if (dismissedWarningFor !== compareKey) setShowSectorWarning(true);
      } else setShowSectorWarning(false);
    }
  }, [compareA, compareB, safePlayers, dismissedWarningFor]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session) buscarDados(); }, [session]);

  useEffect(() => {
    let interval;
    if (isTimerRunning) interval = setInterval(() => setMatchTime(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  async function buscarDados() {
    const { data: timesData } = await supabase.from('times').select('*').order('nome');
    if (timesData) {
      setTeams(timesData.map(t => t.nome));
      let localMetadata = {};
      try { localMetadata = JSON.parse(localStorage.getItem('scoutpro_team_metadata') || '{}'); } catch { localMetadata = {}; }
      setTeamMetadata(Object.fromEntries(timesData.map(team => [team.nome, {
        ...(localMetadata[team.nome] || {}),
        ...(team.metadata || {})
      }])));
    }
    const { data: compData } = await supabase.from('competicoes').select('nome').order('nome');
    if (compData) setCompetitions(compData.map(c => c.nome));
    const { data: jogadoresData } = await supabase.from('jogadores').select('*');
    if (jogadoresData) {
      const jogadoresFormatados = jogadoresData.map(j => {
        const acoesBase = {}; 
        const listaRelevante = getPlayerActions(j, ACOES_LINHA, ACOES_GOLEIRO);
        listaRelevante.forEach(a => acoesBase[a.id] = j.acoes?.[a.id] || 0);
        if (j.acoes?.foto_perfil) acoesBase.foto_perfil = j.acoes.foto_perfil;
        return { ...j, acoes: acoesBase };
      });
      setPlayers(jogadoresFormatados);
    }
    const { data: partidasData } = await supabase.from('partidas').select('*').order('criado_em', { ascending: false });
    if (partidasData) setMatchHistory(partidasData);
  }

  const handleAddCompetition = async (e) => {
    e.preventDefault();
    if (!newCompetitionName.trim() || competitions.includes(newCompetitionName.trim())) return alert("Aviso: Competição inválida ou já existe.");
    const { error } = await supabase.from('competicoes').insert([{ nome: newCompetitionName.trim() }]);
    if (error) { alert("Erro: " + error.message); } else { setCompetitions([...competitions, newCompetitionName.trim()].sort()); setNewCompetitionName(''); alert("✅ Competição adicionada!"); }
  };

  const handleAddTeam = async (e, metadata = {}) => {
    e.preventDefault();
    const teamName = newTeamName.trim();
    if (!teamName || teams.includes(teamName)) return alert("Clube inválido ou já existe.");
    let { error } = await supabase.from('times').insert([{ nome: teamName, metadata }]);
    if (error && /metadata|column|schema cache/i.test(error.message || '')) {
      const fallback = await supabase.from('times').insert([{ nome: teamName }]);
      error = fallback.error;
    }
    if (error) return alert(`Não foi possível adicionar o clube: ${error.message}`);
    const nextMetadata = { ...teamMetadata, [teamName]: metadata };
    setTeams([...teams, teamName].sort());
    setTeamMetadata(nextMetadata);
    localStorage.setItem('scoutpro_team_metadata', JSON.stringify(nextMetadata));
    setNewTeamName('');
    return true;
  };

  const handleUpdateTeam = async (oldName, newNameValue, metadata) => {
    const newName = newNameValue.trim();
    if (!newName) {
      alert('O nome do clube é obrigatório.');
      return false;
    }
    if (newName !== oldName && teams.includes(newName)) {
      alert('Já existe um clube com esse nome.');
      return false;
    }
    const { error } = await supabase.rpc('update_team_profile', {
      p_old_name: oldName,
      p_new_name: newName,
      p_metadata: metadata
    });
    if (error) {
      alert(`Não foi possível editar o clube. Confirme se as migrações do Supabase foram aplicadas. Detalhe: ${error.message}`);
      return false;
    }

    if (newName !== oldName) {
      setTeams(teams.map(team => team === oldName ? newName : team).sort());
      setPlayers(safePlayers.map(player => player.time_nome === oldName ? { ...player, time_nome: newName } : player));
      setMatchHistory(safeMatchHistory.map(match => {
        const meta = match.dados?._meta;
        if (!meta?.equipes?.includes(oldName)) return match;
        return {
          ...match,
          dados: { ...match.dados, _meta: { ...meta, equipes: meta.equipes.map(team => team === oldName ? newName : team) } }
        };
      }));
    }
    const updatedMetadata = { ...teamMetadata };
    delete updatedMetadata[oldName];
    updatedMetadata[newName] = metadata;
    setTeamMetadata(updatedMetadata);
    localStorage.setItem('scoutpro_team_metadata', JSON.stringify(updatedMetadata));
    if (filterTeam === oldName) setFilterTeam(newName);
    if (filterTeamA === oldName) setFilterTeamA(newName);
    if (filterTeamB === oldName) setFilterTeamB(newName);
    if (matchTeam === oldName) setMatchTeam(newName);
    if (novoJogador.time_nome === oldName) setNovoJogador(previous => ({ ...previous, time_nome: newName }));
    return true;
  };

  const handleDeleteCompetition = async (compName) => {
    if (!window.confirm(`ATENÇÃO DESTRUTIVA! Excluir a competição "${compName}" irá apagar DEFINITIVAMENTE todas as partidas nela registradas e reverter os dados globais dos jogadores. Deseja continuar?`)) return;
    
    const matchesToDelete = safeMatchHistory.filter(m => m.dados?._meta?.competicao === compName);
    const matchIds = matchesToDelete.map(m => m.id);
    
    if (matchIds.length > 0) {
      let updatedPlayers = [...safePlayers];
      const changedPlayerIds = new Set();
      
      for (const match of matchesToDelete) {
        for (const pId of Object.keys(match.dados).filter(id => id !== '_meta')) {
          const oldStats = match.dados[pId] || {};
          const pIndex = updatedPlayers.findIndex(p => p.id === pId);
          if (pIndex !== -1) {
            const player = updatedPlayers[pIndex]; 
            const novasAcoesGlobais = { ...player.acoes };
            TODAS_ACOES.forEach(acao => { 
              const oldVal = parseInt(oldStats[acao.id]) || 0; 
              if (oldVal > 0) novasAcoesGlobais[acao.id] = Math.max(0, (parseInt(novasAcoesGlobais[acao.id]) || 0) - oldVal); 
            });
            updatedPlayers[pIndex] = { ...player, acoes: novasAcoesGlobais };
            changedPlayerIds.add(pId);
          }
        }
      }
      
      setPlayers(updatedPlayers);
      const updatePromises = updatedPlayers.filter(p => changedPlayerIds.has(p.id)).map(p => 
        supabase.from('jogadores').update({ acoes: p.acoes }).eq('id', p.id)
      );
      await Promise.all(updatePromises);
      await supabase.from('partidas').delete().in('id', matchIds);
    }
    
    await supabase.from('competicoes').delete().eq('nome', compName);
    setMatchHistory(safeMatchHistory.filter(m => m.dados?._meta?.competicao !== compName));
    setCompetitions(competitions.filter(c => c !== compName));
    alert(`✅ Competição "${compName}" excluída com sucesso!`);
  };

  const handleDeleteTeam = async (teamName) => {
    if (!window.confirm(`ATENÇÃO DESTRUTIVA! Excluir o clube "${teamName}" irá apagar DEFINITIVAMENTE todos os jogadores que pertencem a ele. Deseja continuar?`)) return;
    await supabase.from('jogadores').delete().eq('time_nome', teamName);
    await supabase.from('times').delete().eq('nome', teamName);
    setPlayers(safePlayers.filter(p => p.time_nome !== teamName));
    setTeams(teams.filter(t => t !== teamName));
    const nextMetadata = { ...teamMetadata };
    delete nextMetadata[teamName];
    setTeamMetadata(nextMetadata);
    localStorage.setItem('scoutpro_team_metadata', JSON.stringify(nextMetadata));
    alert(`✅ Clube "${teamName}" e seus jogadores foram excluídos!`);
  };

  const handleSavePlayer = async (e) => {
    e.preventDefault();
    const setoresSelecionados = getPlayerSectors(novoJogador);
    if (setoresSelecionados.length === 0) return alert("Selecione pelo menos um setor.");
    const funcoesLimpas = novoJogador.funcoes.filter(f => f.trim() !== '');
    if(funcoesLimpas.length === 0) return alert("Selecione pelo menos uma função.");
    const setorValue = setoresSelecionados.join(' | ');
    const payload = { nome: novoJogador.nome, time_nome: novoJogador.time_nome, categoria: novoJogador.categoria || 'Sem Categoria', setor: setorValue, funcoes: funcoesLimpas, pe_dominante: novoJogador.pe_dominante, altura: parseFloat(novoJogador.altura) || 0, percentual_gordura: parseFloat(novoJogador.percentual_gordura) || 0, velocidade_maxima: parseFloat(novoJogador.velocidade_maxima) || 0, ano_nascimento: parseInt(novoJogador.ano_nascimento) || null };
    
    const acoesIniciais = {}; 
    const listaBase = setoresSelecionados.includes('GOLEIRO (GK)')
      ? (setoresSelecionados.length > 1 ? [...ACOES_LINHA, ...ACOES_GOLEIRO] : ACOES_GOLEIRO)
      : ACOES_LINHA;
    listaBase.forEach(a => acoesIniciais[a.id] = 0); 
    payload.acoes = acoesIniciais;
    
    const { data, error } = await supabase.from('jogadores').insert([payload]).select();
    if (error) { 
      alert("Erro: " + error.message); 
    } else if (data) { 
      setPlayers([...safePlayers, data[0]]); 
      setNovoJogador({ nome: '', time_nome: '', categoria: '', setor: '', setores: [], funcoes: [''], altura: '', pe_dominante: 'Destro', percentual_gordura: '', velocidade_maxima: '', ano_nascimento: '' });
      alert("✅ Jogador adicionado!"); 
    }
  };

  const handleUpdatePlayerBio = async (playerId, updatedFields) => {
    const setoresSelecionados = getPlayerSectors(updatedFields);
    if (setoresSelecionados.length === 0) {
      alert("Selecione pelo menos um setor.");
      return false;
    }
    const funcoesLimpas = (updatedFields.funcoes || []).filter(f => f.trim() !== '');
    if (funcoesLimpas.length === 0) {
      alert("Selecione pelo menos uma função.");
      return false;
    }
    const payload = {
      nome: updatedFields.nome,
      time_nome: updatedFields.time_nome,
      categoria: updatedFields.categoria || 'Sem Categoria',
      setor: setoresSelecionados.join(' | '),
      funcoes: funcoesLimpas,
      pe_dominante: updatedFields.pe_dominante,
      altura: parseFloat(updatedFields.altura) || 0,
      percentual_gordura: parseFloat(updatedFields.percentual_gordura) || 0,
      velocidade_maxima: parseFloat(updatedFields.velocidade_maxima) || 0,
      ano_nascimento: parseInt(updatedFields.ano_nascimento) || null,
      acoes: { ...(safePlayers.find(p => p.id === playerId)?.acoes || {}), foto_perfil: updatedFields.foto_perfil || null }
    };

    const { error } = await supabase.from('jogadores').update(payload).eq('id', playerId);
    if (error) {
      alert("Erro ao atualizar ficha: " + error.message);
      return false;
    }
    setPlayers(safePlayers.map(p => p.id === playerId ? { ...p, ...payload, acoes: payload.acoes } : p));
    alert("✅ Ficha do atleta atualizada com sucesso!");
    return true;
  };
  
  const handleDeletePlayer = async (playerId, playerName) => { 
    if (window.confirm(`Excluir permanentemente "${playerName}"?`)) { 
      const { error } = await supabase.from('jogadores').delete().eq('id', playerId); 
      if (!error) { 
        setPlayers(safePlayers.filter(p => p.id !== playerId)); 
        setMatchSquad(prev => prev.filter(s => s.id !== playerId)); 
        if (selectedPlayerProfileId === playerId) setSelectedPlayerProfileId(null);
      } 
    } 
  };

  const handleSetGlobalAction = async (playerId, actionId, value) => { const rawValue = value === '' ? '' : Math.max(0, parseInt(value) || 0); const player = safePlayers.find(p => p.id === playerId); const novasAcoesGlobais = { ...player.acoes, [actionId]: rawValue }; setPlayers(safePlayers.map(p => p.id === playerId ? { ...p, acoes: novasAcoesGlobais } : p)); if (typeof rawValue === 'number') await supabase.from('jogadores').update({ acoes: novasAcoesGlobais }).eq('id', playerId); };
  const handleUpdateGlobalActions = async (playerId, actionId, incrementValue) => { const player = safePlayers.find(p => p.id === playerId); const novoValor = Math.max(0, (parseInt(player.acoes[actionId]) || 0) + incrementValue); const novasAcoesGlobais = { ...player.acoes, [actionId]: novoValor }; setPlayers(safePlayers.map(p => p.id === playerId ? { ...p, acoes: novasAcoesGlobais } : p)); await supabase.from('jogadores').update({ acoes: novasAcoesGlobais }).eq('id', playerId); };

  const handleAddToSquad = (playerId) => { if (matchSquad.find(p => p.id === playerId)) return; if (matchSquad.length >= 23) return alert("Limite de 23 atletas."); const titularesCount = matchSquad.filter(p => p.titular).length; const isTitular = titularesCount < 11; setMatchSquad(prev => [...prev, { id: playerId, numero: '', titular: isTitular, inPitch: isTitular }]); };
  const handleRemoveFromSquad = (playerId) => { setMatchSquad(prev => prev.filter(p => p.id !== playerId)); };
  const handleUpdateSquadPlayer = (playerId, field, value) => { if (field === 'titular') { const titularesCount = matchSquad.filter(p => p.titular && p.id !== playerId).length; if (value === true && titularesCount >= 11) { alert("Já existem 11 titulares."); return; } const reservasCount = matchSquad.filter(p => !p.titular && p.id !== playerId).length; if (value === false && reservasCount >= 12) { alert("Já existem 12 reservas."); return; } } setMatchSquad(prev => prev.map(p => p.id === playerId ? { ...p, [field]: value, ...(field === 'titular' ? {inPitch: value} : {}) } : p)); };
  const handlePerformSubstitution = (playerOutId, playerInId) => { if(!playerInId) return; setMatchSquad(prev => prev.map(p => { if (p.id === playerOutId) return { ...p, inPitch: false }; if (p.id === playerInId) return { ...p, inPitch: true }; return p; })); };

  const mapActionIds = new Set(['finalizacoes_certas', 'finalizacoes_erradas', 'gols', 'desarmes', 'duelos_aereos', 'bloqueios', 'perdas_posse', 'erro_passe', 'faltas_cometidas']);
  const confirmFieldEvent = async point => {
    const pending = pendingFieldEvent;
    if (!pending) return;
    const isOpponent = pending.kind === 'opponent';
    const actionId = isOpponent ? (pending.actionType === 'golo' ? 'adversario_gol' : 'adversario_finalizacao') : pending.actionId;
    const label = isOpponent ? (pending.actionType === 'golo' ? 'Golo do adversário' : 'Finalização do adversário') : (TODAS_ACOES.find(action => action.id === actionId)?.nome || actionId);
    const player = isOpponent ? null : safePlayers.find(item => item.id === pending.playerId);
    const newEvent = { id: `${Date.now()}-${Math.random()}`, ...point, actionId, label, playerId: pending.playerId || null, playerName: player?.nome || 'Adversário', period: currentPeriod, time: formatTime(matchTime), color: CORES_ACAO_CAMPO[actionId] };
    setFieldEvents(previous => [...previous, newEvent]);
    setPendingFieldEvent(null);

    if (isOpponent) {
      const name = pending.actionType === 'golo' ? 'Golo Marcado' : 'Finalização';
      setMatchEventLog(previous => [`[T${currentPeriod} - ${formatTime(matchTime)}] Adversário • ${name}`, ...previous]);
      if (pending.actionType === 'golo') setOpponentGoals(previous => previous + 1);
      else setOpponentShots(previous => previous + 1);
      return;
    }

    const currentValue = parseInt(matchStats[pending.playerId]?.[actionId], 10) || 0;
    const actionName = TODAS_ACOES.find(action => action.id === actionId)?.nome || actionId;
    setMatchEventLog(previous => [`[T${currentPeriod} - ${formatTime(matchTime)}] ${player?.nome || 'Atleta'} • ${actionName}`, ...previous]);
    await processLiveAction(pending.playerId, actionId, currentValue + 1, 1);
  };

  const getLivePlayerMinutes = playerId => calculatePlayedMinutes(matchSquad.map(sq => ({ ...sq, nome: safePlayers.find(player => player.id === sq.id)?.nome || '' })), matchEventLog, periodLogs, currentPeriod, matchTime)[playerId] || 0;

  const iniciarPartida = () => { 
    if (!matchCompetition.trim()) return alert("Selecione a Competição."); 
    if (matchSquad.length === 0) return alert("Mínimo 1 atleta."); 
    const titularesCount = matchSquad.filter(p => p.titular).length; 
    if (titularesCount > 11) return alert("Máximo de 11 titulares."); 
    if (!matchTitle.trim()) return alert("Dê um título ao Jogo."); 
    
    setIsMatchActive(true); 
    setMatchTime(0); 
    setIsTimerRunning(false); 
    setCurrentPeriod(1); 
    setPeriodLogs([]); 
    setMatchEventLog([]); 
    setFieldEvents([]);
    setOpponentGoals(0); 
    setOpponentShots(0); 
    setOpponentFinalThird(0); 
  };

  const handleFinalizarTempo = () => { if (currentPeriod > 4) return; setPeriodLogs(prev => [...prev, `${currentPeriod}º Tempo: ${formatTime(matchTime)}`]); setIsTimerRunning(false); setMatchTime(0); setCurrentPeriod(prev => prev + 1); };
  const handleOpponentAction = (type, increment) => {
    if (increment > 0 && ['golo', 'finalizacao'].includes(type)) {
      setPendingFieldEvent({ kind: 'opponent', actionType: type });
      return;
    }
    if (increment > 0) {
      const name = type === 'ultimo_terco' ? 'Entrada no Último Terço' : '';
      if (name) setMatchEventLog(logs => [`[T${currentPeriod} - ${formatTime(matchTime)}] Adversário • ${name}`, ...logs]);
    }
    if (type === 'golo') setOpponentGoals(previous => Math.max(0, previous + increment));
    if (type === 'finalizacao') setOpponentShots(previous => Math.max(0, previous + increment));
    if (type === 'ultimo_terco') setOpponentFinalThird(previous => Math.max(0, previous + increment));
  };

  const processLiveAction = async (playerId, actionId, newMatchVal, incrementValue) => {
    const prevPlayerStats = matchStats[playerId] || {}; const newPlayerStats = { ...prevPlayerStats, [actionId]: newMatchVal };
    const wasActive = Object.entries(prevPlayerStats).some(([k, v]) => k !== 'partidas' && Number(v) > 0); const isNowActive = Object.entries(newPlayerStats).some(([k, v]) => k !== 'partidas' && Number(v) > 0);
    let partidasIncrement = 0; if (!wasActive && isNowActive) partidasIncrement = 1; else if (wasActive && !isNowActive) partidasIncrement = -1;
    if (partidasIncrement !== 0) newPlayerStats.partidas = (prevPlayerStats.partidas || 0) + partidasIncrement;
    setMatchStats(prev => ({ ...prev, [playerId]: newPlayerStats }));
    if (incrementValue !== 0 || partidasIncrement !== 0) {
      const player = safePlayers.find(p => p.id === playerId); const novasAcoesGlobais = { ...player.acoes };
      if (incrementValue !== 0) novasAcoesGlobais[actionId] = Math.max(0, (parseInt(novasAcoesGlobais[actionId]) || 0) + incrementValue);
      if (partidasIncrement !== 0) novasAcoesGlobais.partidas = Math.max(0, (parseInt(novasAcoesGlobais.partidas) || 0) + partidasIncrement);
      setPlayers(safePlayers.map(p => p.id === playerId ? { ...p, acoes: novasAcoesGlobais } : p)); await supabase.from('jogadores').update({ acoes: novasAcoesGlobais }).eq('id', playerId);
    }
  };

  const handleLiveAction = async (playerId, actionId, incrementValue) => {
    const currentMatchVal = parseInt(matchStats[playerId]?.[actionId]) || 0; 
    if (incrementValue < 0 && currentMatchVal === 0) return;
    if (mapActionIds.has(actionId) && incrementValue > 0) {
      setPendingFieldEvent({ kind: 'player', playerId, actionId });
      return;
    }
    if (mapActionIds.has(actionId) && incrementValue < 0) {
      setFieldEvents(previous => {
        const lastMatch = previous.map((event, index) => ({ event, index })).reverse().find(({ event }) => event.playerId === playerId && event.actionId === actionId);
        return lastMatch ? previous.filter((_, index) => index !== lastMatch.index) : previous;
      });
    }
    
    if (incrementValue > 0 && !['partidas', 'minutos'].includes(actionId)) {
      const acaoNome = TODAS_ACOES.find(a => a.id === actionId)?.nome || actionId;
      const nomeAtleta = safePlayers.find(p => p.id === playerId)?.nome || 'Atleta';
      setMatchEventLog(prev => [
        `[T${currentPeriod} - ${formatTime(matchTime)}] ${nomeAtleta} • ${acaoNome}`, 
        ...prev
      ]);
    }
    
    await processLiveAction(playerId, actionId, currentMatchVal + incrementValue, incrementValue);
  };

  const handleSetLiveAction = async (playerId, actionId, value) => { const rawValue = value === '' ? '' : Math.max(0, parseInt(value) || 0); const currentMatchVal = matchStats[playerId]?.[actionId]; const numericCurrent = (currentMatchVal === '' || currentMatchVal === undefined) ? 0 : parseInt(currentMatchVal); await processLiveAction(playerId, actionId, rawValue, (typeof rawValue === 'number' ? rawValue : 0) - numericCurrent); };

  const encerrarPartida = async () => {
    if (!window.confirm("Salvar o relatório e finalizar esta partida?")) return; setIsTimerRunning(false);
    const nomesNoElenco = matchSquad.map(sq => ({ ...sq, nome: safePlayers.find(player => player.id === sq.id)?.nome || '' }));
    const minutosCalculados = calculatePlayedMinutes(nomesNoElenco, matchEventLog, periodLogs, currentPeriod, matchTime);
    const dadosTratados = { ...matchStats };
    matchSquad.forEach(sq => {
      const playerStats = { ...(dadosTratados[sq.id] || {}) };
      playerStats.minutos = minutosCalculados[sq.id] || 0;
      if (playerStats.minutos > 0 && !playerStats.partidas) playerStats.partidas = 1;
      dadosTratados[sq.id] = playerStats;
    });
    const squadTeams = [...new Set(matchSquad.map(s => safePlayers.find(p => p.id === s.id)?.time_nome).filter(Boolean))];
    
    dadosTratados._meta = { 
      eventLog: matchEventLog, periodLogs: periodLogs, 
      fieldEvents,
      gols_sofridos: opponentGoals, finalizacoes_adversario: opponentShots, ultimo_terco_adversario: opponentFinalThird, 
      equipes: squadTeams, squad: matchSquad, competicao: matchCompetition,
      videoUrl: matchVideoUrl, offsetT1: videoOffsetT1, offsetT2: videoOffsetT2 
    };
    
    const payload = { titulo: matchTitle, dados: dadosTratados };
    if (matchDate) { 
       payload.criado_em = new Date(`${matchDate}T12:00:00`).toISOString(); 
    }

    const { data, error } = await supabase.from('partidas').insert([payload]).select();
    if (!error && data) { 
        const playersWithUpdatedMinutes = await Promise.all(safePlayers.map(async player => {
          const minutes = minutosCalculados[player.id];
          if (minutes === undefined) return player;
          const previousMinutes = parseInt(player.acoes?.minutos, 10) || 0;
          const updatedActions = { ...player.acoes, minutos: previousMinutes + minutes };
          await supabase.from('jogadores').update({ acoes: updatedActions }).eq('id', player.id);
          return { ...player, acoes: updatedActions };
        }));
        setPlayers(playersWithUpdatedMinutes);
        setMatchHistory([data[0], ...safeMatchHistory]); 
        setIsMatchActive(false); 
        setMatchTitle(''); 
        setMatchCompetition(''); 
        setMatchDate('');
        setMatchVideoUrl('');
        setMatchStats({}); 
        setMatchSquad([]); 
        setMatchTeam(''); 
        setMatchCategory(''); 
        setActiveTab('historico'); 
    }
  };

  const handleEditMatchClick = (partida) => { setEditingMatchId(partida.id); setEditMatchData({ titulo: partida.titulo, dados: JSON.parse(JSON.stringify(partida.dados)) }); setExpandedMatch(partida.id); };
  const cancelMatchEdit = () => { setEditingMatchId(null); setEditMatchData(null); };
  const handleUpdateMatchEditAction = (playerId, actionId, incrementValue) => { if(playerId === '_meta') return; setEditMatchData(prev => ({ ...prev, dados: { ...prev.dados, [playerId]: { ...(prev.dados[playerId] || {}), [actionId]: Math.max(0, (parseInt(prev.dados[playerId]?.[actionId]) || 0) + incrementValue) } } })); };
  const handleSetMatchEditAction = (playerId, actionId, value) => { if(playerId === '_meta') return; setEditMatchData(prev => ({ ...prev, dados: { ...prev.dados, [playerId]: { ...(prev.dados[playerId] || {}), [actionId]: value === '' ? '' : Math.max(0, parseInt(value) || 0) } } })); };
  const saveMatchEdit = async (partidaId) => {
    const originalMatch = safeMatchHistory.find(m => m.id === partidaId); if (!originalMatch) return;
    const dadosTratados = { ...editMatchData.dados }; Object.keys(dadosTratados).forEach(pId => { if (pId !== '_meta' && dadosTratados[pId].minutos === '') dadosTratados[pId].minutos = 0; });
    const invalidActionTime = (dadosTratados._meta?.eventLog || []).some(line => {
      const match = line.match(/^\[T\d+\s*-\s*(.*?)\]\s*.*?\s*•\s*(.+)$/);
      return match && TODAS_ACOES.some(action => action.nome === match[2].trim()) && !/^\d{1,2}:[0-5]\d$/.test(match[1]);
    });
    if (invalidActionTime) return alert('Use o formato MM:SS para o minuto de cada ação.');
    const countLoggedActions = logs => {
      const counts = {};
      (logs || []).forEach(line => {
        const match = line.match(/^\[T\d+\s*-\s*\d{1,2}:\d{2}\]\s*(.*?)\s*•\s*(.+)$/);
        if (!match) return;
        const player = safePlayers.find(item => item.nome === match[1].trim());
        const action = TODAS_ACOES.find(item => item.nome === match[2].trim());
        if (!player || !action) return;
        const key = `${player.id}::${action.id}`;
        counts[key] = (counts[key] || 0) + 1;
      });
      return counts;
    };
    const originalActionCounts = countLoggedActions(originalMatch.dados?._meta?.eventLog);
    const editedActionCounts = countLoggedActions(dadosTratados?._meta?.eventLog);
    new Set([...Object.keys(originalActionCounts), ...Object.keys(editedActionCounts)]).forEach(key => {
      const [playerId, actionId] = key.split('::');
      const countDiff = (editedActionCounts[key] || 0) - (originalActionCounts[key] || 0);
      if (!countDiff || !dadosTratados[playerId]) return;
      dadosTratados[playerId] = {
        ...dadosTratados[playerId],
        [actionId]: Math.max(0, (parseInt(dadosTratados[playerId][actionId], 10) || 0) + countDiff)
      };
    });
    const diffs = {}; const allPlayerIds = new Set([...Object.keys(originalMatch.dados).filter(id => id !== '_meta'), ...Object.keys(dadosTratados).filter(id => id !== '_meta')]);
    allPlayerIds.forEach(pId => { const oldStats = originalMatch.dados[pId] || {}; const newStats = dadosTratados[pId] || {}; diffs[pId] = {}; TODAS_ACOES.forEach(acao => { const dif = (parseInt(newStats[acao.id]) || 0) - (parseInt(oldStats[acao.id]) || 0); if (dif !== 0) diffs[pId][acao.id] = dif; }); });
    const { error } = await supabase.from('partidas').update({ titulo: editMatchData.titulo, dados: dadosTratados }).eq('id', partidaId); if (error) return alert("Erro ao salvar.");
    let updatedPlayers = [...safePlayers];
    for (const pId of Object.keys(diffs)) {
      if (Object.keys(diffs[pId]).length > 0) {
        const pIndex = updatedPlayers.findIndex(p => p.id === pId);
        if (pIndex !== -1) {
          const player = updatedPlayers[pIndex]; const novasAcoesGlobais = { ...player.acoes };
          Object.keys(diffs[pId]).forEach(actionId => { novasAcoesGlobais[actionId] = Math.max(0, (parseInt(novasAcoesGlobais[actionId]) || 0) + diffs[pId][actionId]); });
          updatedPlayers[pIndex] = { ...player, acoes: novasAcoesGlobais }; await supabase.from('jogadores').update({ acoes: novasAcoesGlobais }).eq('id', pId);
        }
      }
    }
    setPlayers(updatedPlayers); setMatchHistory(safeMatchHistory.map(m => m.id === partidaId ? { ...m, titulo: editMatchData.titulo, dados: dadosTratados } : m)); cancelMatchEdit();
  };
  const handleDeleteMatch = async (partidaId, partidaTitulo) => {
    if (window.confirm(`Excluir a partida "${partidaTitulo}" e subtrair dados globais?`)) {
      const originalMatch = safeMatchHistory.find(m => m.id === partidaId);
      if (originalMatch) {
        let updatedPlayers = [...safePlayers];
        for (const pId of Object.keys(originalMatch.dados).filter(id => id !== '_meta')) {
          const oldStats = originalMatch.dados[pId] || {}; const pIndex = updatedPlayers.findIndex(p => p.id === pId);
          if (pIndex !== -1) {
            const player = updatedPlayers[pIndex]; const novasAcoesGlobais = { ...player.acoes };
            TODAS_ACOES.forEach(acao => { const oldVal = parseInt(oldStats[acao.id]) || 0; if (oldVal > 0) novasAcoesGlobais[acao.id] = Math.max(0, (parseInt(novasAcoesGlobais[acao.id]) || 0) - oldVal); });
            updatedPlayers[pIndex] = { ...player, acoes: novasAcoesGlobais }; await supabase.from('jogadores').update({ acoes: novasAcoesGlobais }).eq('id', pId);
          }
        }
        setPlayers(updatedPlayers);
      }
      await supabase.from('partidas').delete().eq('id', partidaId); setMatchHistory(safeMatchHistory.filter(m => m.id !== partidaId));
    }
  };

  const handleSaveCustomMetric = (e) => { e.preventDefault(); if (!novaMetrica.nome || !novaMetrica.numerador || !novaMetrica.denominador) return; const id = Date.now().toString(); const metricList = [...savedMetrics, { id, ...novaMetrica }]; setSavedMetrics(metricList); localStorage.setItem('scoutpro_custom_metrics', JSON.stringify(metricList)); setSelectedMetricId(id); setNovaMetrica({ nome: '', numerador: '', denominador: '' }); };
  const handleDeleteCustomMetric = (id) => { if(!window.confirm("Remover métrica?")) return; const metricList = savedMetrics.filter(m => m.id !== id); setSavedMetrics(metricList); localStorage.setItem('scoutpro_custom_metrics', JSON.stringify(metricList)); if (selectedMetricId === id) setSelectedMetricId(metricList[0]?.id || null); };
  const calculateCustomMetric = (player, metricObj) => { if (!metricObj || !player.acoes_calc) return 0; const num = parseFloat(player.acoes_calc[metricObj.numerador]) || 0; const den = parseFloat(player.acoes_calc[metricObj.denominador]) || 0; return den === 0 ? 0 : (num / den).toFixed(3); };
  const getAnalyzedPlayers = () => { const selectedMetricObj = savedMetrics.find(m => m.id === selectedMetricId); if(!selectedMetricObj) return []; return [...playersWithCalculatedStats].sort((a, b) => calculateCustomMetric(b, selectedMetricObj) - calculateCustomMetric(a, selectedMetricObj)); };
  const getRankedPlayers = (competition = '') => displayedPlayers
    .map(player => ({
      ...player,
      acoes_calc: getComputedStats(player, globalStartDate, globalEndDate, competition)
    }))
    .sort((a, b) => (b.acoes_calc[rankMetric] || 0) - (a.acoes_calc[rankMetric] || 0));
  const getIdade = (anoNasc) => anoNasc ? `${new Date().getFullYear() - anoNasc} anos | ` : '';

  const renderGlobalFilters = (showDate = false) => (
    <div className="flex flex-col md:flex-row gap-3 mb-4 bg-gray-900 p-4 rounded-xl border border-gray-800 items-center">
      <div className="flex items-center gap-2 text-gray-400 font-bold mr-2 whitespace-nowrap">🔎 Filtros:</div>
      {showDate && (
        <div className="flex items-center gap-2 flex-1 w-full bg-gray-950 p-1 rounded border border-gray-700">
          <span className="text-gray-500 text-xs font-bold px-2 uppercase">De:</span>
          <input type="date" value={globalStartDate} onChange={e => setGlobalStartDate(e.target.value)} className="bg-transparent outline-none text-sm w-full text-blue-400 font-bold" />
          <span className="text-gray-500 text-xs font-bold px-2 uppercase border-l border-gray-700">Até:</span>
          <input type="date" value={globalEndDate} onChange={e => setGlobalEndDate(e.target.value)} className="bg-transparent outline-none text-sm w-full text-blue-400 font-bold" />
        </div>
      )}
      <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} className="p-2 bg-gray-950 rounded border border-gray-700 outline-none text-sm flex-1 w-full"><option value="">Todos os Clubes</option>{teams.map(t => <option key={t} value={t}>{t}</option>)}</select>
      <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="p-2 bg-gray-950 rounded border border-gray-700 outline-none text-sm flex-1 w-full"><option value="">Todas as Categorias</option>{uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}</select>
    </div>
  );

  if (!session) return <Login />;

  const selectedProfilePlayer = safePlayers
    .map(p => ({
      ...p,
      acoes_calc: getComputedStats(p, globalStartDate, globalEndDate)
    }))
    .find(p => p.id === selectedPlayerProfileId);

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans pb-10">
      <Navbar 
        session={session} 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedPlayerProfileId(null);
        }} 
      />
      <datalist id="categorias-list">{uniqueCategories.map(c => <option key={c} value={c} />)}</datalist>

      {showSectorWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border-2 border-red-500 rounded-xl p-8 max-w-md w-full shadow-2xl transform transition-all">
            <div className="text-5xl text-center mb-4">⚠️</div>
            <h3 className="text-2xl font-black text-center text-red-500 mb-2">Setores Diferentes!</h3>
            <p className="text-center text-gray-300 mb-6">Você está a comparar dois atletas que jogam em posições distintas. Ações específicas e estatísticas táticas poderão não refletir uma comparação justa.</p>
            <button onClick={() => { setShowSectorWarning(false); setDismissedWarningFor(`${compareA}-${compareB}`); }} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-red-900/50">Compreendi, continuar</button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {activeTab === 'clubes' && <AbaClubes teams={teams} teamMetadata={teamMetadata} players={safePlayers} matchHistory={safeMatchHistory} newTeamName={newTeamName} setNewTeamName={setNewTeamName} handleAddTeam={handleAddTeam} handleUpdateTeam={handleUpdateTeam} handleDeleteTeam={handleDeleteTeam} uniqueCompetitions={uniqueCompetitionsHistory} isDateInRange={isDateInRange} TODAS_ACOES={TODAS_ACOES} onSelectPlayer={id => { setSelectedPlayerProfileId(id); setActiveTab('scout'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />}
        
        {activeTab === 'scout' && (
          selectedProfilePlayer ? (
            <PerfilAtleta
              player={selectedProfilePlayer}
              onBack={() => setSelectedPlayerProfileId(null)}
              teams={teams}
              SETORES={SETORES}
              ACOES_LINHA={ACOES_LINHA}
              ACOES_GOLEIRO={ACOES_GOLEIRO}
              handleSetGlobalAction={handleSetGlobalAction}
              handleUpdateGlobalActions={handleUpdateGlobalActions}
              handleDeletePlayer={handleDeletePlayer}
              onUpdatePlayerBio={handleUpdatePlayerBio}
              matchHistory={safeMatchHistory}
              isDateInRange={isDateInRange}
              uniqueCompetitions={uniqueCompetitionsHistory}
            />
          ) : (
            <AbaBaseDados
              novoJogador={novoJogador}
              setNovoJogador={setNovoJogador}
              teams={teams}
              handleSavePlayer={handleSavePlayer}
              FilterComponent={renderGlobalFilters(false)}
              displayedPlayers={playersWithCalculatedStats}
              onSelectPlayer={(id) => {
                setSelectedPlayerProfileId(id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              SETORES={SETORES}
              competitions={competitions}
              newCompetitionName={newCompetitionName}
              setNewCompetitionName={setNewCompetitionName}
              handleAddCompetition={handleAddCompetition}
              handleDeleteCompetition={handleDeleteCompetition}
            />
          )
        )}
        
        {activeTab === 'live' && <AbaLiveMatch isMatchActive={isMatchActive} matchTitle={matchTitle} setMatchTitle={setMatchTitle} matchDate={matchDate} setMatchDate={setMatchDate} matchVideoUrl={matchVideoUrl} setMatchVideoUrl={setMatchVideoUrl} videoOffsetT1={videoOffsetT1} setVideoOffsetT1={setVideoOffsetT1} videoOffsetT2={videoOffsetT2} setVideoOffsetT2={setVideoOffsetT2} matchCompetition={matchCompetition} setMatchCompetition={setMatchCompetition} competitions={competitions} matchTeam={matchTeam} setMatchTeam={setMatchTeam} matchCategory={matchCategory} setMatchCategory={setMatchCategory} matchSquad={matchSquad} setMatchSquad={setMatchSquad} handleAddToSquad={handleAddToSquad} handleRemoveFromSquad={handleRemoveFromSquad} handleUpdateSquadPlayer={handleUpdateSquadPlayer} handlePerformSubstitution={handlePerformSubstitution} teams={teams} players={safePlayers} iniciarPartida={iniciarPartida} currentPeriod={currentPeriod} formatTime={formatTime} matchTime={matchTime} isTimerRunning={isTimerRunning} setIsTimerRunning={setIsTimerRunning} handleFinalizarTempo={handleFinalizarTempo} opponentGoals={opponentGoals} opponentShots={opponentShots} opponentFinalThird={opponentFinalThird} handleOpponentAction={handleOpponentAction} encerrarPartida={encerrarPartida} matchEventLog={matchEventLog} setMatchEventLog={setMatchEventLog} ACOES_LINHA={ACOES_LINHA} ACOES_GOLEIRO={ACOES_GOLEIRO} matchStats={matchStats} handleSetLiveAction={handleSetLiveAction} handleLiveAction={handleLiveAction} getLivePlayerMinutes={getLivePlayerMinutes} />}
        
        {activeTab === 'historico' && <AbaHistorico matchHistory={safeMatchHistory} editingMatchId={editingMatchId} editMatchData={editMatchData} setEditMatchData={setEditMatchData} saveMatchEdit={saveMatchEdit} cancelMatchEdit={cancelMatchEdit} handleEditMatchClick={handleEditMatchClick} handleDeleteMatch={handleDeleteMatch} expandedMatch={expandedMatch} setExpandedMatch={setExpandedMatch} players={safePlayers} TODAS_ACOES={TODAS_ACOES} ACOES_LINHA={ACOES_LINHA} ACOES_GOLEIRO={ACOES_GOLEIRO} handleSetMatchEditAction={handleSetMatchEditAction} handleUpdateMatchEditAction={handleUpdateMatchEditAction} filterMatchCompetition={filterMatchCompetition} setFilterMatchCompetition={setFilterMatchCompetition} uniqueCompetitions={uniqueCompetitionsHistory} historyStartDate={historyStartDate} setHistoryStartDate={setHistoryStartDate} historyEndDate={historyEndDate} setHistoryEndDate={setHistoryEndDate} isDateInRange={isDateInRange} />}
        
        {activeTab === 'analise' && <AbaAnalise FilterComponent={renderGlobalFilters(true)} handleSaveCustomMetric={handleSaveCustomMetric} novaMetrica={novaMetrica} setNovaMetrica={setNovaMetrica} TODAS_ACOES={TODAS_ACOES} savedMetrics={savedMetrics} selectedMetricId={selectedMetricId} setSelectedMetricId={setSelectedMetricId} handleDeleteCustomMetric={handleDeleteCustomMetric} getAnalyzedPlayers={getAnalyzedPlayers} calculateCustomMetric={calculateCustomMetric} />}
        
        {activeTab === 'leaderboard' && <AbaRanking FilterComponent={renderGlobalFilters(true)} rankMetric={rankMetric} setRankMetric={setRankMetric} TODAS_ACOES={TODAS_ACOES} uniqueCompetitions={uniqueCompetitionsHistory} getRankedPlayers={getRankedPlayers} />}
        
        {activeTab === 'comparativo' && <AbaComparativo startDateA={startDateA} setStartDateA={setStartDateA} endDateA={endDateA} setEndDateA={setEndDateA} filterTeamA={filterTeamA} setFilterTeamA={setFilterTeamA} teams={teams} filterCategoryA={filterCategoryA} setFilterCategoryA={setFilterCategoryA} uniqueCategories={uniqueCategories} filterSectorA={filterSectorA} setFilterSectorA={setFilterSectorA} SETORES={SETORES} compareA={compareA} setCompareA={setCompareA} filteredPlayersA={filteredPlayersA} startDateB={startDateB} setStartDateB={setStartDateB} endDateB={endDateB} setEndDateB={setEndDateB} filterTeamB={filterTeamB} setFilterTeamB={setFilterTeamB} filterCategoryB={filterCategoryB} setFilterCategoryB={setFilterCategoryB} filterSectorB={filterSectorB} setFilterSectorB={setFilterSectorB} compareB={compareB} setCompareB={setCompareB} filteredPlayersB={filteredPlayersB} TODAS_ACOES={TODAS_ACOES} players={safePlayers} getComputedStats={getComputedStats} matchHistory={safeMatchHistory} uniqueCompetitions={uniqueCompetitionsHistory} isDateInRange={isDateInRange} />}

        {activeTab === 'relatorios' && <AbaRelatorios teams={teams} players={safePlayers} matchHistory={safeMatchHistory} uniqueCompetitions={uniqueCompetitionsHistory} uniqueCategories={uniqueCategories} TODAS_ACOES={TODAS_ACOES} ACOES_LINHA={ACOES_LINHA} ACOES_GOLEIRO={ACOES_GOLEIRO} savedMetrics={savedMetrics} isDateInRange={isDateInRange} getIdade={getIdade} />}
      </main>
      {pendingFieldEvent && <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-4xl bg-gray-900 border border-gray-700 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div><h2 className="text-xl font-black text-white">Marque a posição da ação</h2><p className="text-sm text-gray-400 mt-1">{pendingFieldEvent.kind === 'opponent' ? (pendingFieldEvent.actionType === 'golo' ? 'Golo do adversário' : 'Finalização do adversário') : `${safePlayers.find(player => player.id === pendingFieldEvent.playerId)?.nome || 'Atleta'} · ${TODAS_ACOES.find(action => action.id === pendingFieldEvent.actionId)?.nome}`}</p></div>
            <button type="button" onClick={() => setPendingFieldEvent(null)} className="text-gray-400 hover:text-white">Cancelar ✕</button>
          </div>
          <CampoFutebol onSelectPoint={confirmFieldEvent} title="Campo (clique no local da ação)" />
        </div>
      </div>}
    </div>
  );
}
