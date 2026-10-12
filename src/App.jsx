import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import Navbar from './components/Navbar';
import AbaClubes from './components/AbaClubes';
import AbaBaseDados from './components/AbaBaseDados';
import AbaLiveMatch from './components/AbaLiveMatch';
import AbaHistorico from './components/AbaHistorico';

// === LISTAS PRÉ-DEFINIDAS (SETORES E FUNÇÕES) ===
export const SETORES = {
  'GOLEIRO (GK)': ['GOLEIRO (GK)'],
  'DEFENSORES (DEF)': ['ZAGUEIRO (ZAG)', 'LATERAL DIREITO (LD)', 'LATERAL ESQUERDO (LE)'],
  'MÉDIOS (MEI)': ['VOLANTE (VOL)', 'MEIA CENTRAL (MC)', '2º VOLANTE (2ºV)', 'MEIA ATACANTE (MEI)'],
  'ATACANTES (ATA)': ['EXTREMO (EX)', 'CENTRO AVANTE (CA)', 'FALSO 9 (F9)']
};

export const ACOES_LINHA = [
  { id: 'partidas', nome: 'Partidas' }, { id: 'minutos', nome: 'Minutos Jogados' },
  { id: 'gols', nome: 'Golos' }, { id: 'assistencias', nome: 'Assistências' },
  { id: 'finalizacoes', nome: 'Finalizações' }, { id: 'passes_chave', nome: 'Passes Chave' },
  { id: 'cruzamentos', nome: 'Cruzamentos' }, { id: 'desarmes', nome: 'Desarmes' },
  { id: 'duelos_aereos', nome: 'Duelos Aéreos' }, { id: 'progressoes', nome: 'Progressões' },
  { id: 'perdas_posse', nome: 'Perdas de Posse' }, { id: 'cartoes_amarelos', nome: 'Cartões Amarelos' },
  { id: 'cartoes_vermelhos', nome: 'Cartões Vermelhos' }
];

export const ACOES_GOLEIRO = [
  { id: 'partidas', nome: 'Partidas' }, { id: 'minutos', nome: 'Minutos Jogados' },
  { id: 'defesas', nome: 'Defesas' }, { id: 'defesas_dificeis', nome: 'Defesas difíceis' },
  { id: 'saida_meta', nome: 'Saída de meta' }, { id: 'confrontos', nome: 'Confrontos' },
  { id: 'tiros_meta', nome: 'Tiros de meta' }, { id: 'acoes_pes', nome: 'Ações com os pés' },
  { id: 'cartoes_amarelos', nome: 'Cartões Amarelos' }, { id: 'cartoes_vermelhos', nome: 'Cartões Vermelhos' },
  { id: 'gols_sofridos', nome: 'Gols Sofridos' }
];

export const TODAS_ACOES = [...new Map([...ACOES_LINHA, ...ACOES_GOLEIRO].map(item => [item.id, item])).values()];

export default function App() {
  const [session, setSession] = useState(null);

  const [activeTab, setActiveTab] = useState('scout');
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [matchHistory, setMatchHistory] = useState([]);
  
  const [filterTeam, setFilterTeam] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  
  const [newTeamName, setNewTeamName] = useState('');
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [expandedPlayers, setExpandedPlayers] = useState([]); 
  const [novoJogador, setNovoJogador] = useState({ nome: '', time_nome: '', categoria: '', setor: '', funcoes: [''], altura: '', pe_dominante: 'Destro', percentual_gordura: '', velocidade_maxima: '', ano_nascimento: '' });

  // === ESTADOS DO MODO JOGO ===
  const [matchTeam, setMatchTeam] = useState('');
  const [matchCategory, setMatchCategory] = useState(''); 
  const [matchSquad, setMatchSquad] = useState([]); 
  const [isMatchActive, setIsMatchActive] = useState(false);
  const [matchTitle, setMatchTitle] = useState('');
  const [matchStats, setMatchStats] = useState({});
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [matchTime, setMatchTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState(1);
  const [periodLogs, setPeriodLogs] = useState([]);
  const [matchEventLog, setMatchEventLog] = useState([]);
  
  // NOVO: Mais ações para o Adversário
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

  const uniqueCategories = [...new Set(players.map(p => p.categoria).filter(Boolean))];
  if (!uniqueCategories.includes('Principal')) uniqueCategories.push('Principal');
  if (!uniqueCategories.includes('Sub-20')) uniqueCategories.push('Sub-20');

  const displayedPlayers = players.filter(p => {
    if (filterTeam && p.time_nome !== filterTeam) return false;
    if (filterCategory && p.categoria !== filterCategory) return false;
    return true;
  });

  const filteredPlayersA = players.filter(p => {
    if (filterTeamA && p.time_nome !== filterTeamA) return false;
    if (filterCategoryA && p.categoria !== filterCategoryA) return false;
    if (filterSectorA && p.setor !== filterSectorA) return false;
    return true;
  });

  const filteredPlayersB = players.filter(p => {
    if (filterTeamB && p.time_nome !== filterTeamB) return false;
    if (filterCategoryB && p.categoria !== filterCategoryB) return false;
    if (filterSectorB && p.setor !== filterSectorB) return false;
    return true;
  });

  useEffect(() => {
    if (compareA && compareB) {
      const pA = players.find(p => p.id === compareA);
      const pB = players.find(p => p.id === compareB);
      if (pA && pB && pA.setor !== pB.setor) {
        const compareKey = `${compareA}-${compareB}`;
        if (dismissedWarningFor !== compareKey) setShowSectorWarning(true);
      } else setShowSectorWarning(false);
    }
  }, [compareA, compareB, players, dismissedWarningFor]);

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
    const { data: timesData } = await supabase.from('times').select('nome').order('nome');
    if (timesData) setTeams(timesData.map(t => t.nome));
    const { data: jogadoresData } = await supabase.from('jogadores').select('*');
    if (jogadoresData) {
      const jogadoresFormatados = jogadoresData.map(j => {
        const acoesBase = {}; 
        const listaRelevante = j.setor === 'GOLEIRO (GK)' ? ACOES_GOLEIRO : ACOES_LINHA;
        listaRelevante.forEach(a => acoesBase[a.id] = j.acoes?.[a.id] || 0);
        return { ...j, acoes: acoesBase };
      });
      setPlayers(jogadoresFormatados);
    }
    const { data: partidasData } = await supabase.from('partidas').select('*').order('criado_em', { ascending: false });
    if (partidasData) setMatchHistory(partidasData);
  }

  const handleAddTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim() || teams.includes(newTeamName.trim())) return alert("Clube inválido ou já existe.");
    const { error } = await supabase.from('times').insert([{ nome: newTeamName.trim() }]);
    if (!error) { setTeams([...teams, newTeamName.trim()].sort()); setNewTeamName(''); }
  };

  const handleSavePlayer = async (e) => {
    e.preventDefault();
    const funcoesLimpas = novoJogador.funcoes.filter(f => f.trim() !== '');
    if(funcoesLimpas.length === 0) return alert("Selecione pelo menos uma função.");
    const payload = {
      nome: novoJogador.nome, time_nome: novoJogador.time_nome, categoria: novoJogador.categoria || 'Sem Categoria', 
      setor: novoJogador.setor, funcoes: funcoesLimpas, pe_dominante: novoJogador.pe_dominante,
      altura: parseFloat(novoJogador.altura) || 0, percentual_gordura: parseFloat(novoJogador.percentual_gordura) || 0, velocidade_maxima: parseFloat(novoJogador.velocidade_maxima) || 0, ano_nascimento: parseInt(novoJogador.ano_nascimento) || null,
    };
    if (editingPlayerId) {
      const { data, error } = await supabase.from('jogadores').update(payload).eq('id', editingPlayerId).select();
      if (!error && data) { setPlayers(players.map(p => p.id === editingPlayerId ? { ...p, ...payload } : p)); cancelarEdicao(); }
    } else {
      const acoesIniciais = {}; const listaBase = novoJogador.setor === 'GOLEIRO (GK)' ? ACOES_GOLEIRO : ACOES_LINHA;
      listaBase.forEach(a => acoesIniciais[a.id] = 0); payload.acoes = acoesIniciais;
      const { data, error } = await supabase.from('jogadores').insert([payload]).select();
      if (!error && data) { setPlayers([...players, data[0]]); cancelarEdicao(); }
    }
  };

  const handleEditClick = (player) => {
    if (editingPlayerId === player.id) { cancelarEdicao(); return; }
    setEditingPlayerId(player.id);
    setNovoJogador({ nome: player.nome, time_nome: player.time_nome, categoria: player.categoria, setor: player.setor || '', funcoes: (player.funcoes?.length > 0) ? player.funcoes : [''], altura: player.altura, pe_dominante: player.pe_dominante, percentual_gordura: player.percentual_gordura, velocidade_maxima: player.velocidade_maxima, ano_nascimento: player.ano_nascimento || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const cancelarEdicao = () => { setEditingPlayerId(null); setNovoJogador({ nome: '', time_nome: '', categoria: '', setor: '', funcoes: [''], altura: '', pe_dominante: 'Destro', percentual_gordura: '', velocidade_maxima: '', ano_nascimento: '' }); };
  const handleDeletePlayer = async (playerId, playerName) => { 
    if (window.confirm(`Excluir permanentemente o atleta "${playerName}"?`)) { 
      const { error } = await supabase.from('jogadores').delete().eq('id', playerId); 
      if (!error) { 
        setPlayers(players.filter(p => p.id !== playerId)); 
        setMatchSquad(matchSquad.filter(s => s.id !== playerId)); 
      } 
    } 
  };
  const toggleExpandPlayer = (id) => { setExpandedPlayers(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]); };

  const handleSetGlobalAction = async (playerId, actionId, value) => {
    const rawValue = value === '' ? '' : Math.max(0, parseInt(value) || 0); const player = players.find(p => p.id === playerId); const novasAcoesGlobais = { ...player.acoes, [actionId]: rawValue };
    setPlayers(players.map(p => p.id === playerId ? { ...p, acoes: novasAcoesGlobais } : p));
    if (typeof rawValue === 'number') await supabase.from('jogadores').update({ acoes: novasAcoesGlobais }).eq('id', playerId);
  };
  const handleUpdateGlobalActions = async (playerId, actionId, incrementValue) => {
    const player = players.find(p => p.id === playerId); const novoValor = Math.max(0, (parseInt(player.acoes[actionId]) || 0) + incrementValue); const novasAcoesGlobais = { ...player.acoes, [actionId]: novoValor };
    setPlayers(players.map(p => p.id === playerId ? { ...p, acoes: novasAcoesGlobais } : p));
    await supabase.from('jogadores').update({ acoes: novasAcoesGlobais }).eq('id', playerId);
  };

  // === LÓGICA DE PLANTEL E JOGO AO VIVO ===
  const handleAddToSquad = (playerId) => {
    if (matchSquad.find(p => p.id === playerId)) return;
    if (matchSquad.length >= 23) return alert("Limite de 23 atletas atingido.");
    const titularesCount = matchSquad.filter(p => p.titular).length;
    const isTitular = titularesCount < 11;
    setMatchSquad([...matchSquad, { id: playerId, numero: '', titular: isTitular, inPitch: isTitular }]);
  };
  const handleRemoveFromSquad = (playerId) => { setMatchSquad(matchSquad.filter(p => p.id !== playerId)); };
  const handleUpdateSquadPlayer = (playerId, field, value) => {
    if (field === 'titular') {
       const titularesCount = matchSquad.filter(p => p.titular && p.id !== playerId).length;
       if (value === true && titularesCount >= 11) { alert("Já existem 11 titulares."); return; }
       const reservasCount = matchSquad.filter(p => !p.titular && p.id !== playerId).length;
       if (value === false && reservasCount >= 12) { alert("Já existem 12 reservas."); return; }
    }
    setMatchSquad(matchSquad.map(p => p.id === playerId ? { ...p, [field]: value, ...(field === 'titular' ? {inPitch: value} : {}) } : p));
  };

  const iniciarPartida = () => { 
    if (matchSquad.length === 0) return alert("Mínimo 1 atleta."); 
    const titularesCount = matchSquad.filter(p => p.titular).length;
    if (titularesCount > 11) return alert("Máximo de 11 titulares permitido.");
    if (!matchTitle.trim()) return alert("Dê um nome."); 
    
    setIsMatchActive(true); setMatchTime(0); setIsTimerRunning(true); setCurrentPeriod(1); 
    setPeriodLogs([]); setMatchEventLog([]); 
    setOpponentGoals(0); setOpponentShots(0); setOpponentFinalThird(0); // Zera dados do adversário
  };

  const handleFinalizarTempo = () => { if (currentPeriod > 4) return alert("Limite 4 tempos."); setPeriodLogs(prev => [...prev, `${currentPeriod}º Tempo: ${formatTime(matchTime)}`]); setIsTimerRunning(false); setMatchTime(0); if (currentPeriod < 4) setCurrentPeriod(prev => prev + 1); };
  
  // NOVO: Função Globalizada de Eventos do Adversário
  const handleOpponentAction = (type, increment) => {
    if (increment > 0) {
      let nomeAcao = '';
      if(type === 'golo') nomeAcao = 'Golo Marcado';
      if(type === 'finalizacao') nomeAcao = 'Finalização';
      if(type === 'ultimo_terco') nomeAcao = 'Entrada no Último Terço';
      setMatchEventLog(logs => [`[T${currentPeriod} - ${formatTime(matchTime)}] Adversário • ${nomeAcao}`, ...logs]);
    }
    
    if (type === 'golo') setOpponentGoals(prev => Math.max(0, prev + increment));
    if (type === 'finalizacao') setOpponentShots(prev => Math.max(0, prev + increment));
    if (type === 'ultimo_terco') setOpponentFinalThird(prev => Math.max(0, prev + increment));
  };

  const processLiveAction = async (playerId, actionId, newMatchVal, incrementValue) => {
    const prevPlayerStats = matchStats[playerId] || {}; const newPlayerStats = { ...prevPlayerStats, [actionId]: newMatchVal };
    const wasActive = Object.entries(prevPlayerStats).some(([k, v]) => k !== 'partidas' && Number(v) > 0);
    const isNowActive = Object.entries(newPlayerStats).some(([k, v]) => k !== 'partidas' && Number(v) > 0);
    let partidasIncrement = 0; if (!wasActive && isNowActive) partidasIncrement = 1; else if (wasActive && !isNowActive) partidasIncrement = -1;
    if (partidasIncrement !== 0) newPlayerStats.partidas = (prevPlayerStats.partidas || 0) + partidasIncrement;
    setMatchStats(prev => ({ ...prev, [playerId]: newPlayerStats }));
    
    if (incrementValue !== 0 || partidasIncrement !== 0) {
      const player = players.find(p => p.id === playerId); const novasAcoesGlobais = { ...player.acoes };
      if (incrementValue !== 0) novasAcoesGlobais[actionId] = Math.max(0, (parseInt(novasAcoesGlobais[actionId]) || 0) + incrementValue);
      if (partidasIncrement !== 0) novasAcoesGlobais.partidas = Math.max(0, (parseInt(novasAcoesGlobais.partidas) || 0) + partidasIncrement);
      setPlayers(players.map(p => p.id === playerId ? { ...p, acoes: novasAcoesGlobais } : p));
      await supabase.from('jogadores').update({ acoes: novasAcoesGlobais }).eq('id', playerId);
    }
  };

  const handleLiveAction = async (playerId, actionId, incrementValue) => {
    const currentMatchVal = parseInt(matchStats[playerId]?.[actionId]) || 0; if (incrementValue < 0 && currentMatchVal === 0) return;
    
    // NOVO: Adicionado as defesas na Timeline
    if (incrementValue > 0 && ['gols', 'cartoes_amarelos', 'cartoes_vermelhos', 'passes_chave', 'defesas', 'defesas_dificeis'].includes(actionId)) {
      const acaoNome = TODAS_ACOES.find(a => a.id === actionId)?.nome || actionId;
      setMatchEventLog(prev => [`[T${currentPeriod} - ${formatTime(matchTime)}] ${players.find(p => p.id === playerId).nome} • ${acaoNome}`, ...prev]);
    }
    await processLiveAction(playerId, actionId, currentMatchVal + incrementValue, incrementValue);
  };

  const handleSetLiveAction = async (playerId, actionId, value) => {
    const rawValue = value === '' ? '' : Math.max(0, parseInt(value) || 0); const currentMatchVal = matchStats[playerId]?.[actionId];
    const numericCurrent = (currentMatchVal === '' || currentMatchVal === undefined) ? 0 : parseInt(currentMatchVal);
    await processLiveAction(playerId, actionId, rawValue, (typeof rawValue === 'number' ? rawValue : 0) - numericCurrent);
  };

  const encerrarPartida = async () => {
    if (!window.confirm("Salvar o relatório e finalizar esta partida?")) return; setIsTimerRunning(false);
    const dadosTratados = { ...matchStats }; Object.keys(dadosTratados).forEach(pId => { if (dadosTratados[pId].minutos === '') dadosTratados[pId].minutos = 0; });
    const squadTeams = [...new Set(matchSquad.map(s => players.find(p => p.id === s.id)?.time_nome).filter(Boolean))];
    
    // Guardar TUDO (incluindo as novas stats do adversário) no meta-dados
    dadosTratados._meta = { 
      eventLog: matchEventLog, periodLogs: periodLogs, 
      gols_sofridos: opponentGoals, finalizacoes_adversario: opponentShots, ultimo_terco_adversario: opponentFinalThird, 
      equipes: squadTeams, squad: matchSquad 
    };

    const { data, error } = await supabase.from('partidas').insert([{ titulo: matchTitle, dados: dadosTratados }]).select();
    if (!error && data) { 
      setMatchHistory([data[0], ...matchHistory]); setIsMatchActive(false); setMatchTitle(''); 
      setMatchStats({}); setMatchSquad([]); setMatchTeam(''); setMatchCategory(''); 
      setActiveTab('historico'); 
    }
  };

  // HISTÓRICO EDIÇÃO
  const handleEditMatchClick = (partida) => { setEditingMatchId(partida.id); setEditMatchData({ titulo: partida.titulo, dados: JSON.parse(JSON.stringify(partida.dados)) }); setExpandedMatch(partida.id); };
  const cancelMatchEdit = () => { setEditingMatchId(null); setEditMatchData(null); };
  const handleUpdateMatchEditAction = (playerId, actionId, incrementValue) => { if(playerId === '_meta') return; setEditMatchData(prev => ({ ...prev, dados: { ...prev.dados, [playerId]: { ...(prev.dados[playerId] || {}), [actionId]: Math.max(0, (parseInt(prev.dados[playerId]?.[actionId]) || 0) + incrementValue) } } })); };
  const handleSetMatchEditAction = (playerId, actionId, value) => { if(playerId === '_meta') return; setEditMatchData(prev => ({ ...prev, dados: { ...prev.dados, [playerId]: { ...(prev.dados[playerId] || {}), [actionId]: value === '' ? '' : Math.max(0, parseInt(value) || 0) } } })); };
  const saveMatchEdit = async (partidaId) => {
    const originalMatch = matchHistory.find(m => m.id === partidaId); if (!originalMatch) return;
    const dadosTratados = { ...editMatchData.dados }; Object.keys(dadosTratados).forEach(pId => { if (pId !== '_meta' && dadosTratados[pId].minutos === '') dadosTratados[pId].minutos = 0; });
    const diffs = {}; const allPlayerIds = new Set([...Object.keys(originalMatch.dados).filter(id => id !== '_meta'), ...Object.keys(dadosTratados).filter(id => id !== '_meta')]);
    allPlayerIds.forEach(pId => { const oldStats = originalMatch.dados[pId] || {}; const newStats = dadosTratados[pId] || {}; diffs[pId] = {}; TODAS_ACOES.forEach(acao => { const dif = (parseInt(newStats[acao.id]) || 0) - (parseInt(oldStats[acao.id]) || 0); if (dif !== 0) diffs[pId][acao.id] = dif; }); });
    const { error } = await supabase.from('partidas').update({ titulo: editMatchData.titulo, dados: dadosTratados }).eq('id', partidaId); if (error) return alert("Erro ao salvar.");
    let updatedPlayers = [...players];
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
    setPlayers(updatedPlayers); setMatchHistory(matchHistory.map(m => m.id === partidaId ? { ...m, titulo: editMatchData.titulo, dados: dadosTratados } : m)); cancelMatchEdit();
  };
  const handleDeleteMatch = async (partidaId, partidaTitulo) => {
    if (window.confirm(`Excluir a partida "${partidaTitulo}" e subtrair dados globais?`)) {
      const originalMatch = matchHistory.find(m => m.id === partidaId);
      if (originalMatch) {
        let updatedPlayers = [...players];
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
      await supabase.from('partidas').delete().eq('id', partidaId); setMatchHistory(matchHistory.filter(m => m.id !== partidaId));
    }
  };

  const handleSaveCustomMetric = (e) => { e.preventDefault(); if (!novaMetrica.nome || !novaMetrica.numerador || !novaMetrica.denominador) return; const id = Date.now().toString(); const metricList = [...savedMetrics, { id, ...novaMetrica }]; setSavedMetrics(metricList); localStorage.setItem('scoutpro_custom_metrics', JSON.stringify(metricList)); setSelectedMetricId(id); setNovaMetrica({ nome: '', numerador: '', denominador: '' }); };
  const handleDeleteCustomMetric = (id) => { if(!window.confirm("Remover métrica?")) return; const metricList = savedMetrics.filter(m => m.id !== id); setSavedMetrics(metricList); localStorage.setItem('scoutpro_custom_metrics', JSON.stringify(metricList)); if (selectedMetricId === id) setSelectedMetricId(metricList[0]?.id || null); };
  const calculateCustomMetric = (player, metricObj) => { if (!metricObj) return 0; const num = parseFloat(player.acoes[metricObj.numerador]) || 0; const den = parseFloat(player.acoes[metricObj.denominador]) || 0; return den === 0 ? 0 : (num / den).toFixed(3); };
  const getAnalyzedPlayers = () => { const selectedMetricObj = savedMetrics.find(m => m.id === selectedMetricId); if(!selectedMetricObj) return []; return [...displayedPlayers].sort((a, b) => calculateCustomMetric(b, selectedMetricObj) - calculateCustomMetric(a, selectedMetricObj)); };
  const getRankedPlayers = () => [...displayedPlayers].sort((a, b) => (b.acoes[rankMetric]||0) - (a.acoes[rankMetric]||0));
  const getIdade = (anoNasc) => anoNasc ? `${new Date().getFullYear() - anoNasc} anos | ` : '';

  const GlobalFilters = () => (
    <div className="flex flex-col md:flex-row gap-3 mb-6 bg-gray-900 p-4 rounded-xl border border-gray-800">
      <div className="flex items-center gap-2 text-gray-400 font-bold mr-2">🔎 Filtros:</div>
      <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} className="p-2 bg-gray-950 rounded border border-gray-700 outline-none text-sm flex-1"><option value="">Todos os Clubes</option>{teams.map(t => <option key={t} value={t}>{t}</option>)}</select>
      <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="p-2 bg-gray-950 rounded border border-gray-700 outline-none text-sm flex-1"><option value="">Todas as Categorias</option>{uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}</select>
    </div>
  );

  if (!session) return <Login />;

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans pb-10">
      <Navbar session={session} activeTab={activeTab} setActiveTab={setActiveTab} />
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
        
        {activeTab === 'clubes' && (
          <AbaClubes teams={teams} players={players} matchHistory={matchHistory} newTeamName={newTeamName} setNewTeamName={setNewTeamName} handleAddTeam={handleAddTeam} />
        )}

        {activeTab === 'scout' && (
          <AbaBaseDados novoJogador={novoJogador} setNovoJogador={setNovoJogador} teams={teams} handleSavePlayer={handleSavePlayer} editingPlayerId={editingPlayerId} cancelarEdicao={cancelarEdicao} FilterComponent={<GlobalFilters />} displayedPlayers={displayedPlayers} toggleExpandPlayer={toggleExpandPlayer} handleEditClick={handleEditClick} handleDeletePlayer={handleDeletePlayer} getIdade={getIdade} expandedPlayers={expandedPlayers} SETORES={SETORES} ACOES_LINHA={ACOES_LINHA} ACOES_GOLEIRO={ACOES_GOLEIRO} handleSetGlobalAction={handleSetGlobalAction} handleUpdateGlobalActions={handleUpdateGlobalActions} />
        )}

        {activeTab === 'live' && (
          <AbaLiveMatch 
            isMatchActive={isMatchActive} matchTitle={matchTitle} setMatchTitle={setMatchTitle} 
            matchTeam={matchTeam} setMatchTeam={setMatchTeam} 
            matchCategory={matchCategory} setMatchCategory={setMatchCategory}
            matchSquad={matchSquad} setMatchSquad={setMatchSquad} 
            handleAddToSquad={handleAddToSquad} handleRemoveFromSquad={handleRemoveFromSquad} handleUpdateSquadPlayer={handleUpdateSquadPlayer}
            teams={teams} players={players} iniciarPartida={iniciarPartida} currentPeriod={currentPeriod} formatTime={formatTime} matchTime={matchTime} 
            isTimerRunning={isTimerRunning} setIsTimerRunning={setIsTimerRunning} handleFinalizarTempo={handleFinalizarTempo} 
            opponentGoals={opponentGoals} opponentShots={opponentShots} opponentFinalThird={opponentFinalThird} handleOpponentAction={handleOpponentAction} 
            encerrarPartida={encerrarPartida} matchEventLog={matchEventLog} setMatchEventLog={setMatchEventLog} ACOES_LINHA={ACOES_LINHA} ACOES_GOLEIRO={ACOES_GOLEIRO} 
            matchStats={matchStats} handleSetLiveAction={handleSetLiveAction} handleLiveAction={handleLiveAction} 
          />
        )}

        {activeTab === 'historico' && (
          <AbaHistorico matchHistory={matchHistory} editingMatchId={editingMatchId} editMatchData={editMatchData} setEditMatchData={setEditMatchData} saveMatchEdit={saveMatchEdit} cancelMatchEdit={cancelMatchEdit} handleEditMatchClick={handleEditMatchClick} handleDeleteMatch={handleDeleteMatch} expandedMatch={expandedMatch} setExpandedMatch={setExpandedMatch} players={players} TODAS_ACOES={TODAS_ACOES} ACOES_LINHA={ACOES_LINHA} ACOES_GOLEIRO={ACOES_GOLEIRO} handleSetMatchEditAction={handleSetMatchEditAction} handleUpdateMatchEditAction={handleUpdateMatchEditAction} />
        )}

        {activeTab === 'analise' && (
          <div className="space-y-6">
            <GlobalFilters />
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl">
              <h2 className="text-2xl font-bold mb-2">Criar Cruzamento de Dados</h2>
              <form onSubmit={handleSaveCustomMetric} className="flex flex-col md:flex-row gap-4 items-center">
                <input type="text" placeholder="Nome (Ex: Golos/Minuto)" required value={novaMetrica.nome} onChange={e => setNovaMetrica({...novaMetrica, nome: e.target.value})} className="flex-1 p-3 bg-gray-950 rounded-lg border border-gray-700 text-sm w-full" />
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <select required value={novaMetrica.numerador} onChange={e => setNovaMetrica({...novaMetrica, numerador: e.target.value})} className="p-3 bg-gray-950 rounded-lg border border-gray-700 text-sm outline-none"><option value="">Numerador (X)...</option>{TODAS_ACOES.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}</select>
                  <span className="font-black text-xl text-gray-600">÷</span>
                  <select required value={novaMetrica.denominador} onChange={e => setNovaMetrica({...novaMetrica, denominador: e.target.value})} className="p-3 bg-gray-950 rounded-lg border border-gray-700 text-sm outline-none"><option value="">Denominador (Y)...</option>{TODAS_ACOES.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}</select>
                </div>
                <button type="submit" className="w-full md:w-auto px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg">Salvar</button>
              </form>
            </div>
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
              <h3 className="text-lg font-bold mb-4 text-blue-400">⚡ Acesso Rápido</h3>
              <div className="flex flex-wrap gap-3">
                {savedMetrics.map(metric => (
                  <div key={metric.id} className={`flex items-center rounded-lg border cursor-pointer ${selectedMetricId === metric.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-700 hover:border-gray-500'}`}>
                    <div className={`px-4 py-2 text-sm font-bold ${selectedMetricId === metric.id ? 'bg-blue-900/40 text-blue-300' : 'bg-gray-800 text-gray-300'}`} onClick={() => setSelectedMetricId(metric.id)}>{metric.nome} <span className="font-mono text-xs opacity-50 ml-2">({metric.numerador}/{metric.denominador})</span></div>
                    <button onClick={() => handleDeleteCustomMetric(metric.id)} className="bg-gray-950 px-3 py-2 text-red-500 hover:text-red-400">✕</button>
                  </div>
                ))}
              </div>
            </div>
            {selectedMetricId && savedMetrics.length > 0 && (
              <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="border-b border-gray-800 text-gray-400 text-sm"><th className="p-3">#</th><th className="p-3">Atleta</th><th className="p-3 text-right">Fórmula</th><th className="p-3 text-right font-black text-blue-400">Resultado (Índice)</th></tr></thead>
                  <tbody>
                    {getAnalyzedPlayers().map((player, idx) => {
                      const metricObj = savedMetrics.find(m => m.id === selectedMetricId);
                      return (
                        <tr key={player.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                          <td className="p-3 font-mono text-gray-500">{idx + 1}</td>
                          <td className="p-3 font-bold">{player.nome} <span className="text-xs text-gray-500 block">{player.funcoes?.join(' • ') || player.posicao} | {player.time_nome}</span></td>
                          <td className="p-3 text-right text-xs font-mono text-gray-500">{(player.acoes[metricObj.numerador] || 0)} / {(player.acoes[metricObj.denominador] || 0)}</td>
                          <td className="p-3 text-right font-mono text-xl text-green-400 font-bold">{calculateCustomMetric(player, metricObj)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            <GlobalFilters />
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Ranking de Atletas</h2>
                <select value={rankMetric} onChange={e => setRankMetric(e.target.value)} className="p-2 bg-gray-800 rounded border border-gray-700 font-bold text-blue-400 outline-none">
                  {TODAS_ACOES.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="border-b border-gray-800 text-gray-400"><th className="p-3">#</th><th className="p-3">Atleta</th><th className="p-3 text-right">Métrica</th></tr></thead>
                  <tbody>
                    {getRankedPlayers().map((player, idx) => (
                      <tr key={player.id} className="border-b border-gray-800/50 hover:bg-gray-800/20"><td className="p-3 font-mono text-gray-500">{idx + 1}</td><td className="p-3 font-bold">{player.nome} <span className="text-xs text-gray-500 block">{player.funcoes?.join(' • ') || player.posicao} | {player.time_nome}</span></td><td className="p-3 text-right font-mono text-xl text-green-400">{player.acoes[rankMetric] || 0}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'comparativo' && (
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
            <h2 className="text-2xl font-bold mb-6">Frente a Frente Global</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-3 bg-gray-950 p-5 rounded-xl border border-gray-800 shadow-inner">
                <h3 className="font-bold text-blue-400 text-lg border-b border-gray-800 pb-2">Seleção do Atleta A</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select value={filterTeamA} onChange={e => setFilterTeamA(e.target.value)} className="p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none">
                    <option value="">Todos os Clubes</option>{teams.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={filterCategoryA} onChange={e => setFilterCategoryA(e.target.value)} className="p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none">
                    <option value="">Todas as Categorias</option>{uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={filterSectorA} onChange={e => setFilterSectorA(e.target.value)} className="p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none">
                    <option value="">Todos os Setores</option>{Object.keys(SETORES).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <select value={compareA} onChange={e => setCompareA(e.target.value)} className="w-full p-3 bg-blue-900/20 border border-blue-900/50 text-blue-300 font-bold text-lg rounded-lg outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">Selecione o Atleta A...</option>
                  {filteredPlayersA.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.setor || 'S/ Setor'})</option>)}
                </select>
              </div>

              <div className="space-y-3 bg-gray-950 p-5 rounded-xl border border-gray-800 shadow-inner">
                <h3 className="font-bold text-orange-400 text-lg border-b border-gray-800 pb-2">Seleção do Atleta B</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select value={filterTeamB} onChange={e => setFilterTeamB(e.target.value)} className="p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none">
                    <option value="">Todos os Clubes</option>{teams.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={filterCategoryB} onChange={e => setFilterCategoryB(e.target.value)} className="p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none">
                    <option value="">Todas as Categorias</option>{uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={filterSectorB} onChange={e => setFilterSectorB(e.target.value)} className="p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none">
                    <option value="">Todos os Setores</option>{Object.keys(SETORES).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <select value={compareB} onChange={e => setCompareB(e.target.value)} className="w-full p-3 bg-orange-900/20 border border-orange-900/50 text-orange-300 font-bold text-lg rounded-lg outline-none focus:ring-1 focus:ring-orange-500">
                  <option value="">Selecione o Atleta B...</option>
                  {filteredPlayersB.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.setor || 'S/ Setor'})</option>)}
                </select>
              </div>
            </div>

            {compareA && compareB && (
              <div className="space-y-6 mt-8">
                {TODAS_ACOES.map(acao => {
                  const pA = players.find(p => p.id === compareA); const pB = players.find(p => p.id === compareB);
                  const valA = pA.acoes[acao.id] || 0; const valB = pB.acoes[acao.id] || 0; const max = Math.max(valA, valB, 1);
                  if (valA === 0 && valB === 0) return null; 

                  return (
                    <div key={acao.id} className="relative">
                      <div className="flex justify-between text-sm text-gray-400 mb-1 px-1">
                        <span className="font-mono text-blue-400 font-bold text-lg">{valA}</span>
                        <span className="uppercase tracking-widest text-xs font-bold text-gray-300">{acao.nome}</span>
                        <span className="font-mono text-orange-400 font-bold text-lg">{valB}</span>
                      </div>
                      <div className="flex h-4 bg-gray-950 rounded-full overflow-hidden shadow-inner border border-gray-800">
                        <div className="w-1/2 flex justify-end bg-gray-950 pr-1"><div className="h-full bg-blue-500 rounded-l-full transition-all duration-500" style={{ width: `${(valA / max) * 100}%` }}></div></div>
                        <div className="w-1/2 flex justify-start bg-gray-950 pl-1"><div className="h-full bg-orange-500 rounded-r-full transition-all duration-500" style={{ width: `${(valB / max) * 100}%` }}></div></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}