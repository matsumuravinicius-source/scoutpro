import React, { useEffect, useState, useRef } from 'react';
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
import CampoFutebol from './components/CampoFutebol';
import { getPlayerActions, getPlayerSectors } from './utils/playerSectors';
import { validateLiveMatchSetup, prepareLiveAction, collectLiveTeamStats, collectPositionTeamStats, formatPositionActionLog, getPositionActionColor } from './utils/liveMatchActions';

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
  { id: 'conducoes', nome: 'Conduções', categoria: 'Geral' },
  { id: 'finalizacoes_certas', nome: 'Fin. Certas', categoria: 'Finalizações' }, 
  { id: 'finalizacoes_erradas', nome: 'Fin. Erradas', categoria: 'Finalizações' }, 
  { id: 'gols', nome: 'Golos', categoria: 'Finalizações' },
  { id: 'passes_certos', nome: 'Passes Completos', categoria: 'Passes' },
  { id: 'cruzamentos', nome: 'Cruzamentos', categoria: 'Passes' },
  { id: 'passes_chave', nome: 'Passes Chave', categoria: 'Passes' },
  { id: 'passes_frente', nome: 'Passes p/ Frente', categoria: 'Passes' },
  { id: 'assistencias', nome: 'Assistências', categoria: 'Passes' },
  { id: 'desarmes', nome: 'Desarmes', categoria: 'Defensivo' },
  { id: 'duelos_aereos', nome: 'Duelos Aéreos', categoria: 'Defensivo' },
  { id: 'duelos_terrestres', nome: 'Duelos Terrestres', categoria: 'Defensivo' },
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

export default function App() {
  const [session, setSession] = useState(null);

  const [activeTab, setActiveTab] = useState('scout');
  const [selectedPlayerProfileId, setSelectedPlayerProfileId] = useState(null);

  const [teams, setTeams] = useState([]);
  const [teamMetadata, setTeamMetadata] = useState({});
  const [players, setPlayers] = useState([]);
  const [matchHistory, setMatchHistory] = useState([]);
  
  const [competitions, setCompetitions] = useState([]);
  const [competitionDetails, setCompetitionDetails] = useState([]);
  const [newCompetitionName, setNewCompetitionName] = useState('');
  const [newCompetitionCategory, setNewCompetitionCategory] = useState('');
  const [newCompetitionCountry, setNewCompetitionCountry] = useState('');
  
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
  const [matchAwayTeam, setMatchAwayTeam] = useState('');
  const [matchHomeFormation, setMatchHomeFormation] = useState('');
  const [matchAwayFormation, setMatchAwayFormation] = useState('');
  const [matchCategory, setMatchCategory] = useState(''); 
  const [isMatchActive, setIsMatchActive] = useState(false);
  const [matchTitle, setMatchTitle] = useState('');
  const [matchDate, setMatchDate] = useState('');
  
  const [liveActionEvents, setLiveActionEvents] = useState([]);
  const [fieldEventSaving, setFieldEventSaving] = useState(false);
  const liveActionBusy = useRef(false);
  
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [matchTime, setMatchTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState(1);
  const [periodLogs, setPeriodLogs] = useState([]);
  const [fieldEvents, setFieldEvents] = useState([]);
  const [pendingFieldEvent, setPendingFieldEvent] = useState(null);

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
    const { data: compData, error: compError } = await supabase.from('competicoes').select('nome,categoria,pais').order('nome');
    if (!compError && compData) {
      setCompetitions(compData.map(competition => competition.nome));
      setCompetitionDetails(compData);
    } else {
      const { data: legacyCompData } = await supabase.from('competicoes').select('nome').order('nome');
      if (legacyCompData) {
        setCompetitions(legacyCompData.map(competition => competition.nome));
        setCompetitionDetails(legacyCompData.map(competition => ({ ...competition, categoria: '', pais: '' })));
      }
    }
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
    const nome = newCompetitionName.trim();
    if (!nome || competitions.includes(nome)) return alert("Aviso: Competição inválida ou já existe.");
    const competition = { nome, categoria: newCompetitionCategory.trim(), pais: newCompetitionCountry.trim() };
    const { error } = await supabase.from('competicoes').insert([competition]);
    if (error) { alert("Erro: " + error.message); } else {
      setCompetitions([...competitions, nome].sort());
      setCompetitionDetails([...competitionDetails, competition].sort((a, b) => a.nome.localeCompare(b.nome)));
      setNewCompetitionName('');
      setNewCompetitionCategory('');
      setNewCompetitionCountry('');
      alert("✅ Competição adicionada!");
    }
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
    if (matchTeam === oldName) {
      setMatchTeam(newName);
      if (isMatchActive) setMatchTitle(`${newName} x ${matchAwayTeam}`);
    }
    if (matchAwayTeam === oldName) {
      setMatchAwayTeam(newName);
      if (isMatchActive) setMatchTitle(`${matchTeam} x ${newName}`);
    }
    setLiveActionEvents(events => events.map(event => event.teamName === oldName ? { ...event, teamName: newName } : event));
    setFieldEvents(events => events.map(event => event.teamName === oldName ? { ...event, teamName: newName } : event));
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
    setCompetitionDetails(competitionDetails.filter(competition => competition.nome !== compName));
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
        if (selectedPlayerProfileId === playerId) setSelectedPlayerProfileId(null);
      } 
    } 
  };

  const handleSetGlobalAction = async (playerId, actionId, value) => { const rawValue = value === '' ? '' : Math.max(0, parseInt(value) || 0); const player = safePlayers.find(p => p.id === playerId); const novasAcoesGlobais = { ...player.acoes, [actionId]: rawValue }; setPlayers(safePlayers.map(p => p.id === playerId ? { ...p, acoes: novasAcoesGlobais } : p)); if (typeof rawValue === 'number') await supabase.from('jogadores').update({ acoes: novasAcoesGlobais }).eq('id', playerId); };
  const handleUpdateGlobalActions = async (playerId, actionId, incrementValue) => { const player = safePlayers.find(p => p.id === playerId); const novoValor = Math.max(0, (parseInt(player.acoes[actionId]) || 0) + incrementValue); const novasAcoesGlobais = { ...player.acoes, [actionId]: novoValor }; setPlayers(safePlayers.map(p => p.id === playerId ? { ...p, acoes: novasAcoesGlobais } : p)); await supabase.from('jogadores').update({ acoes: novasAcoesGlobais }).eq('id', playerId); };

  const mapActionIds = new Set(['finalizacoes_certas', 'finalizacoes_erradas', 'gols', 'desarmes', 'duelos_aereos', 'duelos_terrestres', 'bloqueios', 'erro_passe']);

  const iniciarPartida = () => {
    try {
      validateLiveMatchSetup({ competition: matchCompetition, date: matchDate, homeTeam: matchTeam, awayTeam: matchAwayTeam, category: matchCategory, homeFormation: matchHomeFormation, awayFormation: matchAwayFormation });
      if (!teams.includes(matchTeam) || !teams.includes(matchAwayTeam) || !competitions.includes(matchCompetition)) {
        throw new Error('Selecione equipes e uma competição cadastradas.');
      }
    } catch (error) {
      alert(error.message);
      return;
    }
    setMatchTitle(`${matchTeam} x ${matchAwayTeam}`);
    setLiveActionEvents([]);
    setPendingFieldEvent(null);
    setFieldEvents([]);
    setPeriodLogs([]);
    setMatchTime(0);
    setCurrentPeriod(1);
    setIsTimerRunning(false);
    setIsMatchActive(true);
  };

  const handleFinalizarTempo = () => {
    if (currentPeriod > 4) return;
    setPeriodLogs(previous => [...previous, `${currentPeriod}º Tempo: ${formatTime(matchTime)}`]);
    setIsTimerRunning(false);
    setMatchTime(0);
    setCurrentPeriod(previous => previous + 1);
  };

  const commitLiveAction = async (event, point = null) => {
    if (liveActionBusy.current) throw new Error('Aguarde a conclusão do registro anterior.');
    liveActionBusy.current = true;
    try {
      const label = TODAS_ACOES.find(action => action.id === event.actionId)?.nome || event.actionId;
      const record = { ...event, id: `${Date.now()}-${Math.random()}`, label, time: formatTime(event.seconds) };
      setLiveActionEvents(previousEvents => [...previousEvents, record]);
      if (point) {
        setFieldEvents(previousEvents => [...previousEvents, { ...record, ...point, color: getPositionActionColor(event) }]);
      }
    } finally {
      liveActionBusy.current = false;
    }
  };

  const handleRegisterLiveAction = async request => {
    if (!isMatchActive || currentPeriod > 4 || pendingFieldEvent) throw new Error('Conclua o registro atual antes de adicionar outra ação.');
    const event = prepareLiveAction(request, { homeTeam: matchTeam, awayTeam: matchAwayTeam, homeFormation: matchHomeFormation, awayFormation: matchAwayFormation });
    if (mapActionIds.has(event.actionId)) {
      setPendingFieldEvent(event);
      return { pendingLocation: true };
    }
    await commitLiveAction(event);
    return { pendingLocation: false };
  };

  const confirmFieldEvent = async point => {
    if (!pendingFieldEvent || liveActionBusy.current) return;
    setFieldEventSaving(true);
    try {
      await commitLiveAction(pendingFieldEvent, point);
      setPendingFieldEvent(null);
    } catch (error) {
      alert(error.message);
    } finally {
      setFieldEventSaving(false);
    }
  };

  const encerrarPartida = async () => {
    if (liveActionBusy.current || pendingFieldEvent) return;
    if (!window.confirm('Salvar o relatório e finalizar esta partida?')) return;
    setIsTimerRunning(false);
    const teamStats = collectPositionTeamStats(liveActionEvents, matchTeam, matchAwayTeam);
    const awayStats = teamStats[matchAwayTeam];
    const savedPeriods = currentPeriod <= 4 && (matchTime > 0 || isTimerRunning || !periodLogs.length)
      ? [...periodLogs, `${currentPeriod}º Tempo: ${formatTime(matchTime)}`] : periodLogs;
    const dadosTratados = { _meta: {
      eventLog: [...liveActionEvents].reverse().map(formatPositionActionLog), periodLogs: savedPeriods, fieldEvents, liveActionEvents,
      equipes: [matchTeam, matchAwayTeam], homeTeam: matchTeam, awayTeam: matchAwayTeam,
      categoria: matchCategory, competicao: matchCompetition, teamStats, squad: [], formations: { home: matchHomeFormation, away: matchAwayFormation },
      gols_sofridos: awayStats.gols || 0,
      finalizacoes_adversario: (awayStats.finalizacoes_certas || 0) + (awayStats.finalizacoes_erradas || 0) + (awayStats.gols || 0),
      ultimo_terco_adversario: 0, videoUrl: '', offsetT1: '00:00', offsetT2: '45:00',
      liveMode: 'positions', minutesTracked: false
    } };
    const payload = { titulo: matchTitle, dados: dadosTratados, criado_em: new Date(`${matchDate}T12:00:00`).toISOString() };
    const { data, error } = await supabase.from('partidas').insert([payload]).select();
    if (error || !data?.length) {
      alert(`Não foi possível salvar a partida: ${error?.message || 'tente novamente.'}`);
      return;
    }
    setMatchHistory(previous => [data[0], ...previous]);
    setIsMatchActive(false);
    setMatchTitle('');
    setMatchDate('');
    setMatchCompetition('');
    setMatchTeam('');
    setMatchAwayTeam('');
    setMatchHomeFormation('');
    setMatchAwayFormation('');
    setMatchCategory('');
    setLiveActionEvents([]);
    setActiveTab('historico');
  };

  const handleEditMatchClick = (partida) => { setEditingMatchId(partida.id); setEditMatchData({ titulo: partida.titulo, dados: JSON.parse(JSON.stringify(partida.dados)) }); setExpandedMatch(partida.id); };
  const cancelMatchEdit = () => { setEditingMatchId(null); setEditMatchData(null); };
  const handleUpdateMatchEditAction = (playerId, actionId, incrementValue) => { if(playerId === '_meta') return; setEditMatchData(prev => ({ ...prev, dados: { ...prev.dados, [playerId]: { ...(prev.dados[playerId] || {}), [actionId]: Math.max(0, (parseInt(prev.dados[playerId]?.[actionId]) || 0) + incrementValue) } } })); };
  const handleSetMatchEditAction = (playerId, actionId, value) => { if(playerId === '_meta') return; setEditMatchData(prev => ({ ...prev, dados: { ...prev.dados, [playerId]: { ...(prev.dados[playerId] || {}), [actionId]: value === '' ? '' : Math.max(0, parseInt(value) || 0) } } })); };
  const saveMatchEdit = async (partidaId) => {
    const originalMatch = safeMatchHistory.find(m => m.id === partidaId); if (!originalMatch) return;
    const dadosTratados = { ...editMatchData.dados }; Object.keys(dadosTratados).forEach(pId => { if (pId !== '_meta' && dadosTratados[pId].minutos === '') dadosTratados[pId].minutos = 0; });
    if (dadosTratados._meta?.liveMode === 'positions') {
      const meta = dadosTratados._meta;
      const homeTeam = meta.equipes?.[0] || meta.homeTeam;
      const awayTeam = meta.equipes?.[1] || meta.awayTeam;
      let events;
      try {
        events = (meta.liveActionEvents || []).map(event => {
          if (!/^\d{1,2}:[0-5]\d$/.test(event.time)) throw new Error('Use o formato MM:SS para o minuto de cada ação.');
          const [minutes, seconds] = event.time.split(':').map(Number);
          const validated = prepareLiveAction({ ...event, team: event.teamSide === 'home' ? homeTeam : event.teamSide === 'away' ? awayTeam : '', seconds: minutes * 60 + seconds },
            { homeTeam, awayTeam, homeFormation: meta.formations?.home, awayFormation: meta.formations?.away });
          return { ...event, ...validated, label: TODAS_ACOES.find(action => action.id === validated.actionId)?.nome || validated.actionId };
        });
      } catch (error) {
        alert(error.message);
        return;
      }
      const byId = new Map(events.map(event => [event.id, event]));
      const teamStats = collectPositionTeamStats(events, homeTeam, awayTeam);
      const awayStats = teamStats[awayTeam];
      dadosTratados._meta = { ...meta, homeTeam, awayTeam, teamStats, liveActionEvents: events,
        eventLog: [...events].reverse().map(formatPositionActionLog),
        fieldEvents: (meta.fieldEvents || []).flatMap(point => {
          const event = byId.get(point.id);
          return event && getPositionActionColor(event) ? [{ ...point, ...event, color: getPositionActionColor(event) }] : [];
        }),
        gols_sofridos: awayStats.gols || 0,
        finalizacoes_adversario: (awayStats.gols || 0) + (awayStats.finalizacoes_certas || 0) + (awayStats.finalizacoes_erradas || 0) };
    }
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
    const isPositionMatch = dadosTratados._meta?.liveMode === 'positions';
    const originalActionCounts = isPositionMatch ? {} : countLoggedActions(originalMatch.dados?._meta?.eventLog);
    const editedActionCounts = isPositionMatch ? {} : countLoggedActions(dadosTratados?._meta?.eventLog);
    new Set([...Object.keys(originalActionCounts), ...Object.keys(editedActionCounts)]).forEach(key => {
      const [playerId, actionId] = key.split('::');
      const countDiff = (editedActionCounts[key] || 0) - (originalActionCounts[key] || 0);
      if (!countDiff || !dadosTratados[playerId]) return;
      dadosTratados[playerId] = {
        ...dadosTratados[playerId],
        [actionId]: Math.max(0, (parseInt(dadosTratados[playerId][actionId], 10) || 0) + countDiff)
      };
    });
    if (dadosTratados._meta?.liveMode === 'actions') {
      const meta = dadosTratados._meta;
      const homeTeam = meta.equipes?.[0] || meta.homeTeam;
      const awayTeam = meta.equipes?.[1] || meta.awayTeam;
      const teamStats = collectLiveTeamStats(dadosTratados, safePlayers, homeTeam, awayTeam);
      const awayStats = teamStats[awayTeam];
      dadosTratados._meta = { ...meta, homeTeam, awayTeam, teamStats,
        gols_sofridos: awayStats.gols || 0,
        finalizacoes_adversario: (awayStats.gols || 0) + (awayStats.finalizacoes_certas || 0) + (awayStats.finalizacoes_erradas || 0) };
    }
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
        {activeTab === 'clubes' && <AbaClubes teams={teams} teamMetadata={teamMetadata} players={safePlayers} matchHistory={safeMatchHistory} newTeamName={newTeamName} setNewTeamName={setNewTeamName} handleAddTeam={handleAddTeam} handleUpdateTeam={handleUpdateTeam} handleDeleteTeam={handleDeleteTeam} competitions={competitions} competitionDetails={competitionDetails} newCompetitionName={newCompetitionName} setNewCompetitionName={setNewCompetitionName} newCompetitionCategory={newCompetitionCategory} setNewCompetitionCategory={setNewCompetitionCategory} newCompetitionCountry={newCompetitionCountry} setNewCompetitionCountry={setNewCompetitionCountry} handleAddCompetition={handleAddCompetition} handleDeleteCompetition={handleDeleteCompetition} uniqueCompetitions={uniqueCompetitionsHistory} isDateInRange={isDateInRange} TODAS_ACOES={TODAS_ACOES} ACOES_LINHA={ACOES_LINHA} ACOES_GOLEIRO={ACOES_GOLEIRO} onSelectPlayer={id => { setSelectedPlayerProfileId(id); setActiveTab('scout'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />}
        
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
            />
          )
        )}
        
        {activeTab === 'live' && <AbaLiveMatch
          isMatchActive={isMatchActive} matchTitle={matchTitle} matchDate={matchDate} setMatchDate={setMatchDate}
          matchCompetition={matchCompetition} setMatchCompetition={setMatchCompetition} competitions={competitions}
          matchTeam={matchTeam} setMatchTeam={setMatchTeam} matchAwayTeam={matchAwayTeam} setMatchAwayTeam={setMatchAwayTeam}
          matchHomeFormation={matchHomeFormation} setMatchHomeFormation={setMatchHomeFormation} matchAwayFormation={matchAwayFormation} setMatchAwayFormation={setMatchAwayFormation}
          matchCategory={matchCategory} setMatchCategory={setMatchCategory} uniqueCategories={uniqueCategories}
          teams={teams} players={safePlayers} iniciarPartida={iniciarPartida} currentPeriod={currentPeriod}
          formatTime={formatTime} matchTime={matchTime} isTimerRunning={isTimerRunning} setIsTimerRunning={setIsTimerRunning}
          handleFinalizarTempo={handleFinalizarTempo} encerrarPartida={encerrarPartida}
          liveActionEvents={liveActionEvents} handleRegisterLiveAction={handleRegisterLiveAction}
        />}
        
        {activeTab === 'historico' && <AbaHistorico matchHistory={safeMatchHistory} editingMatchId={editingMatchId} editMatchData={editMatchData} setEditMatchData={setEditMatchData} saveMatchEdit={saveMatchEdit} cancelMatchEdit={cancelMatchEdit} handleEditMatchClick={handleEditMatchClick} handleDeleteMatch={handleDeleteMatch} expandedMatch={expandedMatch} setExpandedMatch={setExpandedMatch} players={safePlayers} TODAS_ACOES={TODAS_ACOES} ACOES_LINHA={ACOES_LINHA} ACOES_GOLEIRO={ACOES_GOLEIRO} handleSetMatchEditAction={handleSetMatchEditAction} handleUpdateMatchEditAction={handleUpdateMatchEditAction} filterMatchCompetition={filterMatchCompetition} setFilterMatchCompetition={setFilterMatchCompetition} uniqueCompetitions={uniqueCompetitionsHistory} historyStartDate={historyStartDate} setHistoryStartDate={setHistoryStartDate} historyEndDate={historyEndDate} setHistoryEndDate={setHistoryEndDate} isDateInRange={isDateInRange} />}
        
        {activeTab === 'analise' && <AbaAnalise FilterComponent={renderGlobalFilters(true)} handleSaveCustomMetric={handleSaveCustomMetric} novaMetrica={novaMetrica} setNovaMetrica={setNovaMetrica} TODAS_ACOES={TODAS_ACOES} savedMetrics={savedMetrics} selectedMetricId={selectedMetricId} setSelectedMetricId={setSelectedMetricId} handleDeleteCustomMetric={handleDeleteCustomMetric} getAnalyzedPlayers={getAnalyzedPlayers} calculateCustomMetric={calculateCustomMetric} />}
        
        {activeTab === 'leaderboard' && <AbaRanking FilterComponent={renderGlobalFilters(true)} rankMetric={rankMetric} setRankMetric={setRankMetric} TODAS_ACOES={TODAS_ACOES} uniqueCompetitions={uniqueCompetitionsHistory} getRankedPlayers={getRankedPlayers} />}
        
        {activeTab === 'comparativo' && <AbaComparativo startDateA={startDateA} setStartDateA={setStartDateA} endDateA={endDateA} setEndDateA={setEndDateA} filterTeamA={filterTeamA} setFilterTeamA={setFilterTeamA} teams={teams} filterCategoryA={filterCategoryA} setFilterCategoryA={setFilterCategoryA} uniqueCategories={uniqueCategories} filterSectorA={filterSectorA} setFilterSectorA={setFilterSectorA} SETORES={SETORES} compareA={compareA} setCompareA={setCompareA} filteredPlayersA={filteredPlayersA} startDateB={startDateB} setStartDateB={setStartDateB} endDateB={endDateB} setEndDateB={setEndDateB} filterTeamB={filterTeamB} setFilterTeamB={setFilterTeamB} filterCategoryB={filterCategoryB} setFilterCategoryB={setFilterCategoryB} filterSectorB={filterSectorB} setFilterSectorB={setFilterSectorB} compareB={compareB} setCompareB={setCompareB} filteredPlayersB={filteredPlayersB} TODAS_ACOES={TODAS_ACOES} players={safePlayers} getComputedStats={getComputedStats} matchHistory={safeMatchHistory} uniqueCompetitions={uniqueCompetitionsHistory} isDateInRange={isDateInRange} />}

      </main>
      {pendingFieldEvent && <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-4xl bg-gray-900 border border-gray-700 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div><h2 className="text-xl font-black text-white">Marque a posição da ação</h2><p className="text-sm text-gray-400 mt-1">{`${pendingFieldEvent.teamName} · ${pendingFieldEvent.positionLabel} · ${TODAS_ACOES.find(action => action.id === pendingFieldEvent.actionId)?.nome} · T${pendingFieldEvent.period} ${formatTime(pendingFieldEvent.seconds)}`}</p></div>
            <button type="button" disabled={fieldEventSaving} onClick={() => setPendingFieldEvent(null)} className="text-gray-400 hover:text-white">Cancelar ✕</button>
          </div>
          <CampoFutebol onSelectPoint={fieldEventSaving ? undefined : confirmFieldEvent} title={fieldEventSaving ? "Salvando ação…" : "Campo (clique no local da ação)"} />
        </div>
      </div>}
    </div>
  );
}
