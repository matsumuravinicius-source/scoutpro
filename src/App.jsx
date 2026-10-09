import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const ACOES_TATICAS = [
  { id: 'partidas', nome: 'Partidas' },
  { id: 'minutos', nome: 'Minutos Jogados' },
  { id: 'gols', nome: 'Golos' },
  { id: 'assistencias', nome: 'Assistências' },
  { id: 'finalizacoes', nome: 'Finalizações' },
  { id: 'passes_chave', nome: 'Passes Chave' },
  { id: 'cruzamentos', nome: 'Cruzamentos' },
  { id: 'desarmes', nome: 'Desarmes' },
  { id: 'duelos_aereos', nome: 'Duelos Aéreos' },
  { id: 'progressoes', nome: 'Progressões' },
  { id: 'perdas_posse', nome: 'Perdas de Posse' },
  { id: 'cartoes_amarelos', nome: 'Cartões Amarelos' },
  { id: 'cartoes_vermelhos', nome: 'Cartões Vermelhos' }
];

export default function App() {
  // === ESTADOS DE AUTENTICAÇÃO ===
  const [session, setSession] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // === ESTADOS DO SISTEMA ===
  const [activeTab, setActiveTab] = useState('scout');
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [matchHistory, setMatchHistory] = useState([]);
  
  // === ESTADOS DE FILTROS GLOBAIS ===
  const [filterTeam, setFilterTeam] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  
  // === ESTADOS DE GESTÃO ===
  const [newTeamName, setNewTeamName] = useState('');
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [novoJogador, setNovoJogador] = useState({ 
    nome: '', time_nome: '', categoria: '', posicao: '', 
    altura: '', pe_dominante: 'Destro', percentual_gordura: '', velocidade_maxima: '', ano_nascimento: '' 
  });

  // === ESTADOS DO MODO JOGO (LIVE) ===
  const [matchSquadIds, setMatchSquadIds] = useState([]);
  const [isMatchActive, setIsMatchActive] = useState(false);
  const [matchTitle, setMatchTitle] = useState('');
  const [matchStats, setMatchStats] = useState({});
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [matchTime, setMatchTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState(1);
  const [periodLogs, setPeriodLogs] = useState([]);
  const [matchEventLog, setMatchEventLog] = useState([]);
  const [opponentGoals, setOpponentGoals] = useState(0); // Novo: Golos do Adversário

  // === ESTADOS DE EDIÇÃO (HISTÓRICO) ===
  const [editingMatchId, setEditingMatchId] = useState(null);
  const [editMatchData, setEditMatchData] = useState(null);

  // === ESTADOS DE ANÁLISE ===
  const [rankMetric, setRankMetric] = useState('gols');
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');
  const [savedMetrics, setSavedMetrics] = useState(() => {
    const localData = localStorage.getItem('scoutpro_custom_metrics');
    return localData ? JSON.parse(localData) : [
      { id: 'gols_por_minuto', nome: 'Golos por Minuto Jog.', numerador: 'gols', denominador: 'minutos' }
    ];
  });
  const [novaMetrica, setNovaMetrica] = useState({ nome: '', numerador: '', denominador: '' });
  const [selectedMetricId, setSelectedMetricId] = useState(savedMetrics[0]?.id || null);

  // Derivar categorias únicas para o Datalist e Filtros
  const uniqueCategories = [...new Set(players.map(p => p.categoria).filter(Boolean))];
  if (!uniqueCategories.includes('Principal')) uniqueCategories.push('Principal');
  if (!uniqueCategories.includes('Sub-20')) uniqueCategories.push('Sub-20');

  // Aplicar Filtros aos Jogadores
  const displayedPlayers = players.filter(p => {
    if (filterTeam && p.time_nome !== filterTeam) return false;
    if (filterCategory && p.categoria !== filterCategory) return false;
    return true;
  });

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

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true); setAuthError(null);
    let error;
    if (isLoginMode) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      error = signInError;
    } else {
      const { error: signUpError } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
      error = signUpError;
      if (!error) alert("Conta criada com sucesso!");
    }
    if (error) setAuthError(error.message);
    setAuthLoading(false);
  };
  const handleLogout = async () => await supabase.auth.signOut();

  async function buscarDados() {
    const { data: timesData } = await supabase.from('times').select('nome').order('nome');
    if (timesData) setTeams(timesData.map(t => t.nome));

    const { data: jogadoresData } = await supabase.from('jogadores').select('*');
    if (jogadoresData) {
      const jogadoresFormatados = jogadoresData.map(j => {
        const acoesBase = {};
        ACOES_TATICAS.forEach(a => acoesBase[a.id] = j.acoes?.[a.id] || 0);
        return { ...j, acoes: acoesBase };
      });
      setPlayers(jogadoresFormatados);
    }
    const { data: partidasData } = await supabase.from('partidas').select('*').order('criado_em', { ascending: false });
    if (partidasData) setMatchHistory(partidasData);
  }

  // === GESTÃO DE CLUBES E ATLETAS ===
  const handleAddTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim() || teams.includes(newTeamName.trim())) return alert("Clube inválido ou já existe.");
    const { error } = await supabase.from('times').insert([{ nome: newTeamName.trim() }]);
    if (!error) {
      setTeams([...teams, newTeamName.trim()].sort());
      setNewTeamName('');
    }
  };

  const handleSavePlayer = async (e) => {
    e.preventDefault();
    const payload = {
      nome: novoJogador.nome, time_nome: novoJogador.time_nome, categoria: novoJogador.categoria || 'Sem Categoria',
      posicao: novoJogador.posicao, pe_dominante: novoJogador.pe_dominante,
      altura: parseFloat(novoJogador.altura) || 0, percentual_gordura: parseFloat(novoJogador.percentual_gordura) || 0, 
      velocidade_maxima: parseFloat(novoJogador.velocidade_maxima) || 0, ano_nascimento: parseInt(novoJogador.ano_nascimento) || null,
    };
    if (editingPlayerId) {
      const { data, error } = await supabase.from('jogadores').update(payload).eq('id', editingPlayerId).select();
      if (!error && data) {
        setPlayers(players.map(p => p.id === editingPlayerId ? { ...p, ...payload } : p));
        cancelarEdicao();
      }
    } else {
      const acoesIniciais = {};
      ACOES_TATICAS.forEach(a => acoesIniciais[a.id] = 0);
      payload.acoes = acoesIniciais;
      const { data, error } = await supabase.from('jogadores').insert([payload]).select();
      if (!error && data) {
        setPlayers([...players, data[0]]);
        cancelarEdicao();
      }
    }
  };

  const handleEditClick = (player) => {
    setEditingPlayerId(player.id);
    setNovoJogador({
      nome: player.nome, time_nome: player.time_nome, categoria: player.categoria, posicao: player.posicao,
      altura: player.altura, pe_dominante: player.pe_dominante, percentual_gordura: player.percentual_gordura, 
      velocidade_maxima: player.velocidade_maxima, ano_nascimento: player.ano_nascimento || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const cancelarEdicao = () => {
    setEditingPlayerId(null);
    setNovoJogador({ nome: '', time_nome: '', categoria: '', posicao: '', altura: '', pe_dominante: 'Destro', percentual_gordura: '', velocidade_maxima: '', ano_nascimento: '' });
  };

  const handleDeletePlayer = async (playerId, playerName) => {
    if (window.confirm(`Excluir permanentemente o atleta "${playerName}"?`)) {
      const { error } = await supabase.from('jogadores').delete().eq('id', playerId);
      if (!error) {
        setPlayers(players.filter(p => p.id !== playerId));
        setMatchSquadIds(matchSquadIds.filter(id => id !== playerId));
      }
    }
  };

  const handleSetGlobalAction = async (playerId, actionId, value) => {
    const rawValue = value === '' ? '' : Math.max(0, parseInt(value) || 0);
    const player = players.find(p => p.id === playerId);
    const novasAcoesGlobais = { ...player.acoes, [actionId]: rawValue };
    setPlayers(players.map(p => p.id === playerId ? { ...p, acoes: novasAcoesGlobais } : p));
    if (typeof rawValue === 'number') await supabase.from('jogadores').update({ acoes: novasAcoesGlobais }).eq('id', playerId);
  };
  const handleUpdateGlobalActions = async (playerId, actionId, incrementValue) => {
    const player = players.find(p => p.id === playerId);
    const currentVal = parseInt(player.acoes[actionId]) || 0;
    const novoValor = Math.max(0, currentVal + incrementValue);
    const novasAcoesGlobais = { ...player.acoes, [actionId]: novoValor };
    setPlayers(players.map(p => p.id === playerId ? { ...p, acoes: novasAcoesGlobais } : p));
    await supabase.from('jogadores').update({ acoes: novasAcoesGlobais }).eq('id', playerId);
  };

  // === MODO JOGO (LIVE) ===
  const toggleMatchSquad = (playerId) => {
    if (matchSquadIds.includes(playerId)) setMatchSquadIds(matchSquadIds.filter(id => id !== playerId));
    else {
      if (matchSquadIds.length >= 23) return alert("Limite de 23 atletas atingido.");
      setMatchSquadIds([...matchSquadIds, playerId]);
    }
  };

  const iniciarPartida = () => {
    if (matchSquadIds.length === 0) return alert("Selecione pelo menos 1 atleta.");
    if (!matchTitle.trim()) return alert("Dê um nome para a partida.");
    setIsMatchActive(true);
    setMatchTime(0); setIsTimerRunning(true); setCurrentPeriod(1);
    setPeriodLogs([]); setMatchEventLog([]); setOpponentGoals(0);
  };

  const handleFinalizarTempo = () => {
    if (currentPeriod > 4) return alert("Limite máximo de 4 tempos atingido.");
    const log = `${currentPeriod}º Tempo: ${formatTime(matchTime)}`;
    setPeriodLogs(prev => [...prev, log]);
    setIsTimerRunning(false); setMatchTime(0);
    if (currentPeriod < 4) setCurrentPeriod(prev => prev + 1);
  };

  const handleOpponentGoal = (increment) => {
    setOpponentGoals(prev => {
      const newVal = Math.max(0, prev + increment);
      if (increment > 0) setMatchEventLog(logs => [`[T${currentPeriod} - ${formatTime(matchTime)}] Adversário • Golo Marcado`, ...logs]);
      return newVal;
    });
  };

  const handleLiveAction = async (playerId, actionId, incrementValue) => {
    const currentMatchVal = parseInt(matchStats[playerId]?.[actionId]) || 0;
    if (incrementValue < 0 && currentMatchVal === 0) return;
    
    const player = players.find(p => p.id === playerId);
    if (incrementValue > 0 && ['gols', 'cartoes_amarelos', 'cartoes_vermelhos', 'passes_chave'].includes(actionId)) {
      const acaoNome = ACOES_TATICAS.find(a => a.id === actionId).nome;
      setMatchEventLog(prev => [`[T${currentPeriod} - ${formatTime(matchTime)}] ${player.nome} • ${acaoNome}`, ...prev]);
    }

    const newMatchVal = currentMatchVal + incrementValue;
    const prevPlayerStats = matchStats[playerId] || {};
    const newPlayerStats = { ...prevPlayerStats, [actionId]: newMatchVal };

    const wasActive = Object.entries(prevPlayerStats).some(([k, v]) => k !== 'partidas' && Number(v) > 0);
    const isNowActive = Object.entries(newPlayerStats).some(([k, v]) => k !== 'partidas' && Number(v) > 0);
    let partidasIncrement = 0;
    if (!wasActive && isNowActive) partidasIncrement = 1;
    else if (wasActive && !isNowActive) partidasIncrement = -1;

    if (partidasIncrement !== 0) newPlayerStats.partidas = (prevPlayerStats.partidas || 0) + partidasIncrement;
    setMatchStats(prev => ({ ...prev, [playerId]: newPlayerStats }));

    const novasAcoesGlobais = { ...player.acoes };
    novasAcoesGlobais[actionId] = Math.max(0, (parseInt(novasAcoesGlobais[actionId]) || 0) + incrementValue);
    if (partidasIncrement !== 0) novasAcoesGlobais.partidas = Math.max(0, (parseInt(novasAcoesGlobais.partidas) || 0) + partidasIncrement);

    setPlayers(players.map(p => p.id === playerId ? { ...p, acoes: novasAcoesGlobais } : p));
    await supabase.from('jogadores').update({ acoes: novasAcoesGlobais }).eq('id', playerId);
  };

  const handleSetLiveAction = async (playerId, actionId, value) => {
    const rawValue = value === '' ? '' : Math.max(0, parseInt(value) || 0);
    const currentMatchVal = matchStats[playerId]?.[actionId];
    const numericCurrent = (currentMatchVal === '' || currentMatchVal === undefined) ? 0 : parseInt(currentMatchVal);
    const diferenca = (typeof rawValue === 'number' ? rawValue : 0) - numericCurrent;
    
    const prevPlayerStats = matchStats[playerId] || {};
    const newPlayerStats = { ...prevPlayerStats, [actionId]: rawValue };
    const wasActive = Object.entries(prevPlayerStats).some(([k, v]) => k !== 'partidas' && Number(v) > 0);
    const isNowActive = Object.entries(newPlayerStats).some(([k, v]) => k !== 'partidas' && Number(v) > 0);

    let partidasIncrement = 0;
    if (!wasActive && isNowActive) partidasIncrement = 1;
    else if (wasActive && !isNowActive) partidasIncrement = -1;

    if (partidasIncrement !== 0) newPlayerStats.partidas = (prevPlayerStats.partidas || 0) + partidasIncrement;
    setMatchStats(prev => ({ ...prev, [playerId]: newPlayerStats }));

    if (diferenca !== 0 || partidasIncrement !== 0) {
      const player = players.find(p => p.id === playerId);
      const novasAcoesGlobais = { ...player.acoes };
      if (diferenca !== 0) novasAcoesGlobais[actionId] = Math.max(0, (parseInt(novasAcoesGlobais[actionId]) || 0) + diferenca);
      if (partidasIncrement !== 0) novasAcoesGlobais.partidas = Math.max(0, (parseInt(novasAcoesGlobais.partidas) || 0) + partidasIncrement);
      setPlayers(players.map(p => p.id === playerId ? { ...p, acoes: novasAcoesGlobais } : p));
      await supabase.from('jogadores').update({ acoes: novasAcoesGlobais }).eq('id', playerId);
    }
  };

  const encerrarPartida = async () => {
    if (!window.confirm("Salvar o relatório e finalizar esta partida?")) return;
    setIsTimerRunning(false);

    const dadosTratados = { ...matchStats };
    Object.keys(dadosTratados).forEach(pId => {
      if (dadosTratados[pId].minutos === '') dadosTratados[pId].minutos = 0;
    });

    const squadTeams = [...new Set(matchSquadIds.map(id => players.find(p => p.id === id)?.time_nome).filter(Boolean))];
    
    dadosTratados._meta = { 
      eventLog: matchEventLog, 
      periodLogs: periodLogs, 
      gols_sofridos: opponentGoals,
      equipes: squadTeams // Relacionamento com as equipas para extrair stats
    };

    const { data, error } = await supabase.from('partidas').insert([{ titulo: matchTitle, dados: dadosTratados }]).select();
    if (!error && data) {
      setMatchHistory([data[0], ...matchHistory]);
      setIsMatchActive(false); setMatchTitle(''); setMatchStats({}); setMatchSquadIds([]);
      setActiveTab('historico');
    }
  };

  // === HISTÓRICO: EDIÇÃO/EXCLUSÃO ===
  const handleEditMatchClick = (partida) => {
    setEditingMatchId(partida.id);
    setEditMatchData({ titulo: partida.titulo, dados: JSON.parse(JSON.stringify(partida.dados)) });
    setExpandedMatch(partida.id);
  };
  const cancelMatchEdit = () => { setEditingMatchId(null); setEditMatchData(null); };

  const handleUpdateMatchEditAction = (playerId, actionId, incrementValue) => {
    if(playerId === '_meta') return;
    setEditMatchData(prev => {
      const currentVal = parseInt(prev.dados[playerId]?.[actionId]) || 0;
      return { ...prev, dados: { ...prev.dados, [playerId]: { ...(prev.dados[playerId] || {}), [actionId]: Math.max(0, currentVal + incrementValue) } } };
    });
  };
  const handleSetMatchEditAction = (playerId, actionId, value) => {
    if(playerId === '_meta') return;
    const rawValue = value === '' ? '' : Math.max(0, parseInt(value) || 0);
    setEditMatchData(prev => ({ ...prev, dados: { ...prev.dados, [playerId]: { ...(prev.dados[playerId] || {}), [actionId]: rawValue } } }));
  };

  const saveMatchEdit = async (partidaId) => {
    const originalMatch = matchHistory.find(m => m.id === partidaId);
    if (!originalMatch) return;

    const dadosTratados = { ...editMatchData.dados };
    Object.keys(dadosTratados).forEach(pId => {
      if (pId !== '_meta' && dadosTratados[pId].minutos === '') dadosTratados[pId].minutos = 0;
    });

    const diffs = {};
    const allPlayerIds = new Set([...Object.keys(originalMatch.dados).filter(id => id !== '_meta'), ...Object.keys(dadosTratados).filter(id => id !== '_meta')]);
    allPlayerIds.forEach(pId => {
      const oldStats = originalMatch.dados[pId] || {};
      const newStats = dadosTratados[pId] || {};
      diffs[pId] = {};
      ACOES_TATICAS.forEach(acao => {
        const dif = (parseInt(newStats[acao.id]) || 0) - (parseInt(oldStats[acao.id]) || 0);
        if (dif !== 0) diffs[pId][acao.id] = dif;
      });
    });

    const { error } = await supabase.from('partidas').update({ titulo: editMatchData.titulo, dados: dadosTratados }).eq('id', partidaId);
    if (error) return alert("Erro ao salvar.");

    let updatedPlayers = [...players];
    for (const pId of Object.keys(diffs)) {
      const playerDiffs = diffs[pId];
      if (Object.keys(playerDiffs).length > 0) {
        const pIndex = updatedPlayers.findIndex(p => p.id === pId);
        if (pIndex !== -1) {
          const player = updatedPlayers[pIndex];
          const novasAcoesGlobais = { ...player.acoes };
          Object.keys(playerDiffs).forEach(actionId => {
            novasAcoesGlobais[actionId] = Math.max(0, (parseInt(novasAcoesGlobais[actionId]) || 0) + playerDiffs[actionId]);
          });
          updatedPlayers[pIndex] = { ...player, acoes: novasAcoesGlobais };
          await supabase.from('jogadores').update({ acoes: novasAcoesGlobais }).eq('id', pId);
        }
      }
    }
    setPlayers(updatedPlayers);
    setMatchHistory(matchHistory.map(m => m.id === partidaId ? { ...m, titulo: editMatchData.titulo, dados: dadosTratados } : m));
    cancelMatchEdit();
  };

  const handleDeleteMatch = async (partidaId, partidaTitulo) => {
    if (window.confirm(`Excluir a partida "${partidaTitulo}" e subtrair dados globais?`)) {
      const originalMatch = matchHistory.find(m => m.id === partidaId);
      if (originalMatch) {
        let updatedPlayers = [...players];
        for (const pId of Object.keys(originalMatch.dados).filter(id => id !== '_meta')) {
          const oldStats = originalMatch.dados[pId] || {};
          const pIndex = updatedPlayers.findIndex(p => p.id === pId);
          if (pIndex !== -1) {
            const player = updatedPlayers[pIndex];
            const novasAcoesGlobais = { ...player.acoes };
            ACOES_TATICAS.forEach(acao => {
              const oldVal = parseInt(oldStats[acao.id]) || 0;
              if (oldVal > 0) novasAcoesGlobais[acao.id] = Math.max(0, (parseInt(novasAcoesGlobais[acao.id]) || 0) - oldVal);
            });
            updatedPlayers[pIndex] = { ...player, acoes: novasAcoesGlobais };
            await supabase.from('jogadores').update({ acoes: novasAcoesGlobais }).eq('id', pId);
          }
        }
        setPlayers(updatedPlayers);
      }
      await supabase.from('partidas').delete().eq('id', partidaId);
      setMatchHistory(matchHistory.filter(m => m.id !== partidaId));
    }
  };

  // === ANÁLISE ===
  const handleSaveCustomMetric = (e) => {
    e.preventDefault();
    if (!novaMetrica.nome || !novaMetrica.numerador || !novaMetrica.denominador) return;
    const id = Date.now().toString();
    const metricList = [...savedMetrics, { id, ...novaMetrica }];
    setSavedMetrics(metricList);
    localStorage.setItem('scoutpro_custom_metrics', JSON.stringify(metricList));
    setSelectedMetricId(id); setNovaMetrica({ nome: '', numerador: '', denominador: '' });
  };
  const handleDeleteCustomMetric = (id) => {
    if(!window.confirm("Remover métrica?")) return;
    const metricList = savedMetrics.filter(m => m.id !== id);
    setSavedMetrics(metricList);
    localStorage.setItem('scoutpro_custom_metrics', JSON.stringify(metricList));
    if (selectedMetricId === id) setSelectedMetricId(metricList[0]?.id || null);
  };
  const calculateCustomMetric = (player, metricObj) => {
    if (!metricObj) return 0;
    const num = parseFloat(player.acoes[metricObj.numerador]) || 0;
    const den = parseFloat(player.acoes[metricObj.denominador]) || 0;
    return den === 0 ? 0 : (num / den).toFixed(3);
  };
  
  const getAnalyzedPlayers = () => {
    const selectedMetricObj = savedMetrics.find(m => m.id === selectedMetricId);
    if(!selectedMetricObj) return [];
    return [...displayedPlayers].sort((a, b) => calculateCustomMetric(b, selectedMetricObj) - calculateCustomMetric(a, selectedMetricObj));
  };
  const getRankedPlayers = () => [...displayedPlayers].sort((a, b) => b.acoes[rankMetric] - a.acoes[rankMetric]);
  const getIdade = (anoNasc) => anoNasc ? `${new Date().getFullYear() - anoNasc} anos | ` : '';

  // Componente de Filtro Reutilizável
  const GlobalFilters = () => (
    <div className="flex flex-col md:flex-row gap-3 mb-6 bg-gray-900 p-4 rounded-xl border border-gray-800">
      <div className="flex items-center gap-2 text-gray-400 font-bold mr-2">🔎 Filtros:</div>
      <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} className="p-2 bg-gray-950 rounded border border-gray-700 outline-none text-sm flex-1">
        <option value="">Todos os Clubes</option>
        {teams.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="p-2 bg-gray-950 rounded border border-gray-700 outline-none text-sm flex-1">
        <option value="">Todas as Categorias</option>
        {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  );

  // === RENDERIZAÇÃO DE AUTENTICAÇÃO ===
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col justify-center items-center p-4 font-sans text-white">
        <div className="w-full max-w-md bg-gray-900 rounded-xl border border-gray-800 shadow-2xl p-8">
          <h1 className="text-4xl font-black text-center text-blue-500 tracking-tighter mb-2">SCOUT<span className="text-white">PRO</span></h1>
          <p className="text-center text-gray-400 mb-8">{isLoginMode ? "Insira as suas credenciais para aceder ao sistema." : "Crie uma nova conta."}</p>
          {authError && <div className="bg-red-900/50 border border-red-900 text-red-300 p-3 rounded mb-4 text-sm">{authError}</div>}
          <form onSubmit={handleAuth} className="space-y-4">
            <div><label className="block text-sm text-gray-400 mb-1">E-mail</label><input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full p-3 bg-gray-950 border border-gray-700 rounded-lg outline-none focus:border-blue-500" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Palavra-passe</label><input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full p-3 bg-gray-950 border border-gray-700 rounded-lg outline-none focus:border-blue-500" /></div>
            <button type="submit" disabled={authLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 mt-4">{authLoading ? "Aguarde..." : (isLoginMode ? "Entrar" : "Registar e Entrar")}</button>
          </form>
          <div className="mt-6 text-center border-t border-gray-800 pt-6"><button onClick={() => { setIsLoginMode(!isLoginMode); setAuthError(null); }} className="text-sm text-gray-400 hover:text-white">{isLoginMode ? "Criar nova conta." : "Já tem conta? Fazer Login."}</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans pb-10">
      <nav className="bg-gray-900 border-b border-gray-800 p-4 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-black text-blue-500 tracking-tighter">SCOUT<span className="text-white">PRO</span></h1>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { id: 'scout', label: 'Base de Dados' }, 
              { id: 'clubes', label: 'Clubes' }, 
              { id: 'live', label: '🔴 Modo Jogo' }, 
              { id: 'historico', label: 'Histórico' }, 
              { id: 'leaderboard', label: 'Ranking' }, 
              { id: 'analise', label: 'Análise Avançada' }, 
              { id: 'comparativo', label: 'Comparativo' }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-3 py-2 rounded font-bold transition text-sm ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>{tab.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-4 border-t lg:border-t-0 lg:border-l border-gray-800 pt-4 lg:pt-0 lg:pl-4">
            <span className="text-sm text-gray-400 truncate max-w-[150px]">{session.user.email}</span>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-900/40 text-red-400 hover:bg-red-900/60 rounded text-sm font-bold border border-red-900/50 transition">Sair</button>
          </div>
        </div>
      </nav>

      {/* DATALIST para Categorias (Reutilizável nos inputs) */}
      <datalist id="categorias-list">
        {uniqueCategories.map(c => <option key={c} value={c} />)}
      </datalist>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        
        {/* ABA: CLUBES (ESTATÍSTICAS) */}
        {activeTab === 'clubes' && (
          <div className="space-y-6">
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl">
              <h2 className="text-2xl font-bold mb-2">Gestão de Clubes</h2>
              <p className="text-sm text-gray-400 mb-6">Adicione novos clubes ao sistema. As estatísticas são processadas automaticamente agrupando os dados dos seus jogadores e relatórios de partidas.</p>
              
              <form onSubmit={handleAddTeam} className="flex flex-col md:flex-row gap-4">
                <input type="text" placeholder="Nome do Novo Clube" required value={newTeamName} onChange={e => setNewTeamName(e.target.value)} className="flex-1 p-3 bg-gray-950 rounded-lg border border-gray-700 text-sm outline-none focus:border-blue-500" />
                <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition shadow-lg">Adicionar Clube</button>
              </form>
            </div>

            <div className="overflow-x-auto bg-gray-900 rounded-xl border border-gray-800 p-4">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-sm">
                    <th className="p-3 sticky left-0 bg-gray-900 shadow-[1px_0_0_#1f2937]">Clube</th>
                    <th className="p-3 text-center" title="Partidas (Soma das partidas do clube no histórico)">Partidas</th>
                    <th className="p-3 text-center text-blue-400">Golos</th>
                    <th className="p-3 text-center text-red-400">Golos Sofridos</th>
                    <th className="p-3 text-center">Assistências</th>
                    <th className="p-3 text-center">Finalizações</th>
                    <th className="p-3 text-center">Desarmes</th>
                    <th className="p-3 text-center">Cruzamentos</th>
                    <th className="p-3 text-center text-yellow-400">Cartões Amarelos</th>
                    <th className="p-3 text-center text-red-500">Cartões Vermelhos</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.length === 0 ? (
                    <tr><td colSpan="10" className="p-6 text-center text-gray-500">Nenhum clube registado.</td></tr>
                  ) : (
                    teams.map(team => {
                      const teamPlayers = players.filter(p => p.time_nome === team);
                      const teamMatches = matchHistory.filter(m => m.dados._meta?.equipes?.includes(team));
                      
                      const tGolos = teamPlayers.reduce((sum, p) => sum + (p.acoes.gols || 0), 0);
                      const tAssist = teamPlayers.reduce((sum, p) => sum + (p.acoes.assistencias || 0), 0);
                      const tFin = teamPlayers.reduce((sum, p) => sum + (p.acoes.finalizacoes || 0), 0);
                      const tDes = teamPlayers.reduce((sum, p) => sum + (p.acoes.desarmes || 0), 0);
                      const tCruz = teamPlayers.reduce((sum, p) => sum + (p.acoes.cruzamentos || 0), 0);
                      const tCA = teamPlayers.reduce((sum, p) => sum + (p.acoes.cartoes_amarelos || 0), 0);
                      const tCV = teamPlayers.reduce((sum, p) => sum + (p.acoes.cartoes_vermelhos || 0), 0);
                      
                      const tPartidas = teamMatches.length;
                      const tSofridos = teamMatches.reduce((sum, m) => sum + (m.dados._meta?.gols_sofridos || 0), 0);

                      return (
                        <tr key={team} className="border-b border-gray-800/50 hover:bg-gray-800/20 text-sm">
                          <td className="p-3 font-bold sticky left-0 bg-gray-900 shadow-[1px_0_0_#1f2937]">{team}</td>
                          <td className="p-3 text-center font-mono text-gray-300">{tPartidas}</td>
                          <td className="p-3 text-center font-mono text-blue-400 font-bold">{tGolos}</td>
                          <td className="p-3 text-center font-mono text-red-400 font-bold">{tSofridos}</td>
                          <td className="p-3 text-center font-mono text-gray-300">{tAssist}</td>
                          <td className="p-3 text-center font-mono text-gray-300">{tFin}</td>
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
        )}

        {/* ABA: BASE DE DADOS */}
        {activeTab === 'scout' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <form onSubmit={handleSavePlayer} className="bg-gray-900 p-6 rounded-xl border border-gray-800 h-fit sticky top-24">
              <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-blue-400">{editingPlayerId ? 'Editar Atleta' : 'Adicionar Atleta'}</h3></div>
              <div className="space-y-3">
                <input type="text" placeholder="Nome Completo" required value={novoJogador.nome} onChange={e => setNovoJogador({...novoJogador, nome: e.target.value})} className="w-full p-2 bg-gray-950 rounded border border-gray-700" />
                <div className="grid grid-cols-2 gap-2">
                  <select required value={novoJogador.time_nome} onChange={e => setNovoJogador({...novoJogador, time_nome: e.target.value})} className="p-2 bg-gray-950 rounded border border-gray-700">
                    <option value="">Equipa/Clube...</option>
                    {teams.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {/* Categoria passou a ser texto livre com Datalist */}
                  <input type="text" list="categorias-list" placeholder="Categoria (Ex: Sub-17)" required value={novoJogador.categoria} onChange={e => setNovoJogador({...novoJogador, categoria: e.target.value})} className="p-2 bg-gray-950 rounded border border-gray-700" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Posição (Ex: MEI)" required value={novoJogador.posicao} onChange={e => setNovoJogador({...novoJogador, posicao: e.target.value})} className="p-2 bg-gray-950 rounded border border-gray-700" />
                  <select required value={novoJogador.pe_dominante} onChange={e => setNovoJogador({...novoJogador, pe_dominante: e.target.value})} className="p-2 bg-gray-950 rounded border border-gray-700">
                    <option value="Destro">Destro</option><option value="Canhoto">Canhoto</option><option value="Ambidestro">Ambidestro</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <input type="number" placeholder="Ano Nasc." value={novoJogador.ano_nascimento} onChange={e => setNovoJogador({...novoJogador, ano_nascimento: e.target.value})} className="p-2 bg-gray-950 rounded border border-gray-700 text-sm" />
                  <input type="number" step="0.01" placeholder="Alt (m)" value={novoJogador.altura} onChange={e => setNovoJogador({...novoJogador, altura: e.target.value})} className="p-2 bg-gray-950 rounded border border-gray-700 text-sm" />
                  <input type="number" step="0.1" placeholder="Gord (%)" value={novoJogador.percentual_gordura} onChange={e => setNovoJogador({...novoJogador, percentual_gordura: e.target.value})} className="p-2 bg-gray-950 rounded border border-gray-700 text-sm" />
                  <input type="number" step="0.1" placeholder="Vel (km/h)" value={novoJogador.velocidade_maxima} onChange={e => setNovoJogador({...novoJogador, velocidade_maxima: e.target.value})} className="p-2 bg-gray-950 rounded border border-gray-700 text-sm" />
                </div>
                <div className="flex space-x-2 mt-4">
                  <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded font-bold transition">{editingPlayerId ? 'Salvar Edição' : 'Gravar Atleta'}</button>
                  {editingPlayerId && <button type="button" onClick={cancelarEdicao} className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded font-bold transition">Cancelar</button>}
                </div>
              </div>
            </form>
            
            <div className="lg:col-span-2">
              <GlobalFilters />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedPlayers.length === 0 ? (
                  <div className="col-span-2 text-center text-gray-500 py-10 bg-gray-900 rounded-xl">Nenhum jogador encontrado com os filtros selecionados.</div>
                ) : (
                  displayedPlayers.map(player => (
                    <div key={player.id} className={`bg-gray-900 p-4 rounded-xl border transition ${editingPlayerId === player.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-800'}`}>
                      <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-800/50">
                        <div>
                          <h4 className="text-lg font-bold flex items-center gap-2">
                            {player.nome}
                            <button onClick={() => handleEditClick(player)} className="text-blue-500 hover:text-blue-400 p-1">✏️</button>
                            <button onClick={() => handleDeletePlayer(player.id, player.nome)} className="text-red-500 hover:text-red-400 p-1">🗑️</button>
                          </h4>
                          <p className="text-xs text-blue-400">{player.time_nome} • {player.categoria} • {player.posicao}</p>
                        </div>
                        <div className="text-right text-xs text-gray-400">
                          <p>{getIdade(player.ano_nascimento)}{player.altura}m | {player.pe_dominante}</p>
                          <p>Fat: {player.percentual_gordura}% | Max: {player.velocidade_maxima}km/h</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-1">
                        {ACOES_TATICAS.map(acao => (
                          <div key={acao.id} className="flex justify-between items-center bg-gray-950 px-2 py-1.5 rounded border border-gray-800/50">
                            <span className="text-xs text-gray-300 truncate pr-2">{acao.nome}</span>
                            {['minutos', 'partidas'].includes(acao.id) ? (
                              <input type="number" min="0" placeholder="0" value={player.acoes[acao.id] === '' ? '' : (player.acoes[acao.id] || 0)} onChange={(e) => handleSetGlobalAction(player.id, acao.id, e.target.value)} onBlur={(e) => { if (e.target.value === '') handleSetGlobalAction(player.id, acao.id, '0'); }} className="w-16 p-1 text-center bg-gray-800 text-blue-400 font-bold text-sm rounded border border-gray-700 outline-none" />
                            ) : (
                              <div className="flex space-x-1 items-center">
                                <button onClick={() => handleUpdateGlobalActions(player.id, acao.id, -1)} className="bg-gray-800 text-gray-400 w-7 h-7 rounded hover:bg-red-900/50 flex items-center justify-center font-bold">-</button>
                                <span className="font-mono w-6 text-center text-blue-400 font-bold text-sm">{player.acoes[acao.id] || 0}</span>
                                <button onClick={() => handleUpdateGlobalActions(player.id, acao.id, 1)} className="bg-gray-800 text-gray-400 w-7 h-7 rounded hover:bg-green-900/50 flex items-center justify-center font-bold">+</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ABA: MODO JOGO (LIVE) */}
        {activeTab === 'live' && (
          <div className="space-y-6">
            {!isMatchActive ? (
              <div className="bg-gray-900 p-8 rounded-xl border border-gray-800 shadow-xl max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold mb-2">Preparar Partida</h2>
                <p className="text-gray-400 mb-6">Convoque os jogadores. Ações cruciais e estatísticas do adversário serão guardadas na linha do tempo.</p>
                <input type="text" placeholder="Ex: Final do Campeonato vs Flamengo" required value={matchTitle} onChange={e => setMatchTitle(e.target.value)} className="w-full p-4 bg-gray-950 rounded-lg border border-gray-700 text-lg mb-4" />
                
                <div className="flex flex-col gap-4 mb-6">
                  {/* Select com Clube/Categoria visível para facilitar convocação */}
                  <select onChange={(e) => { if(e.target.value) toggleMatchSquad(e.target.value); e.target.value = ""; }} className="p-3 bg-gray-950 rounded-lg border border-gray-700 text-lg outline-none">
                    <option value="">+ Selecionar atleta para o jogo...</option>
                    {players.filter(p => !matchSquadIds.includes(p.id)).sort((a,b) => a.time_nome.localeCompare(b.time_nome)).map(p => <option key={p.id} value={p.id}>{p.nome} ({p.posicao} - {p.time_nome} / {p.categoria})</option>)}
                  </select>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-8 min-h-[50px] p-4 bg-gray-950 rounded-lg border border-gray-800">
                  {matchSquadIds.length === 0 && <span className="text-gray-500">Nenhum jogador convocado (0/23).</span>}
                  {matchSquadIds.map(id => {
                    const p = players.find(player => player.id === id);
                    if(!p) return null;
                    return (
                      <div key={id} className="flex items-center bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-full text-sm">
                        <span className="font-bold mr-2">{p.nome}</span>
                        <button onClick={() => toggleMatchSquad(id)} className="text-gray-500 hover:text-red-400 font-bold border-l border-gray-600 pl-2 ml-1">✕</button>
                      </div>
                    )
                  })}
                </div>
                <button onClick={iniciarPartida} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl text-lg transition shadow-lg shadow-green-900/20">Iniciar Partida</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                
                <div className="xl:col-span-1 space-y-4">
                  <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl sticky top-20 z-10 flex flex-col items-center">
                    <h2 className="text-sm font-bold text-red-500 flex items-center gap-2 mb-2 uppercase tracking-widest text-center"><span className="animate-pulse">🔴</span> {matchTitle}</h2>
                    <div className="text-gray-400 font-bold mb-1">{currentPeriod}º Tempo</div>
                    <div className="text-6xl font-mono font-black text-white mb-6 tabular-nums">{formatTime(matchTime)}</div>
                    
                    <div className="flex gap-2 w-full mb-4">
                      {!isTimerRunning ? (
                        <button onClick={() => setIsTimerRunning(true)} className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded-lg font-bold text-lg transition shadow-lg">▶ Iniciar</button>
                      ) : (
                        <button onClick={() => setIsTimerRunning(false)} className="flex-1 bg-yellow-600 hover:bg-yellow-500 py-3 rounded-lg font-bold text-lg transition shadow-lg">⏸ Pausar</button>
                      )}
                    </div>
                    <button onClick={handleFinalizarTempo} disabled={currentPeriod > 4} className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 py-2 rounded-lg font-bold mb-6 transition disabled:opacity-50">⏹ Finalizar {currentPeriod}º Tempo</button>

                    {/* NOVO: Painel de Controlo do Adversário */}
                    <div className="w-full bg-gray-950 rounded-lg p-4 border border-red-900/50 mb-6">
                      <h4 className="text-red-400 font-bold text-sm mb-3 flex items-center gap-2">🛡️ Ações do Adversário</h4>
                      <div className="flex justify-between items-center bg-gray-900 px-3 py-2 rounded border border-gray-800">
                        <span className="text-sm text-gray-300">Golos (Sofridos)</span>
                        <div className="flex space-x-2 items-center">
                          <button onClick={() => handleOpponentGoal(-1)} className="bg-gray-800 text-gray-400 w-8 h-8 rounded flex items-center justify-center font-bold hover:bg-red-900/50">-</button>
                          <span className="font-mono w-6 text-center text-red-400 font-bold text-lg">{opponentGoals}</span>
                          <button onClick={() => handleOpponentGoal(1)} className="bg-gray-800 text-gray-400 w-8 h-8 rounded flex items-center justify-center font-bold hover:bg-green-900/50">+</button>
                        </div>
                      </div>
                    </div>

                    <button onClick={encerrarPartida} className="w-full px-6 py-3 bg-red-700 hover:bg-red-600 rounded-lg font-bold transition shadow-lg shadow-red-900/20">Terminar e Gravar</button>
                  </div>

                  <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 shadow-xl h-96 flex flex-col">
                    <h3 className="font-bold text-gray-300 mb-3 flex items-center gap-2">⏱️ Linha do Tempo</h3>
                    <div className="flex-1 bg-gray-950 rounded-lg border border-gray-800 p-3 overflow-y-auto space-y-2">
                      {matchEventLog.length === 0 ? <div className="text-gray-600 text-xs text-center mt-10">Os Golos, Cartões e Passes aparecerão aqui.</div> : matchEventLog.map((log, i) => <div key={i} className="text-xs text-gray-300 border-l-2 border-blue-500 pl-2 py-1 bg-gray-900/50 rounded-r">{log}</div>)}
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
                  {players.filter(p => matchSquadIds.includes(p.id)).map(player => (
                    <div key={player.id} className="bg-gray-900 p-4 rounded-xl border border-gray-800 shadow-lg relative overflow-hidden h-fit">
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
                      <div className="mb-3 pb-3 border-b border-gray-800/50 pl-2">
                        <h4 className="text-base font-bold leading-tight">{player.nome}</h4>
                        <p className="text-xs text-blue-400 mt-1">{player.posicao} • {player.time_nome}</p>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 pl-2">
                        {ACOES_TATICAS.filter(a => a.id !== 'partidas').map(acao => (
                          <div key={acao.id} className={`flex justify-between items-center bg-gray-950 px-2 py-1.5 rounded border border-gray-800/50 ${['gols', 'cartoes_amarelos', 'cartoes_vermelhos', 'passes_chave'].includes(acao.id) ? 'border-l-2 border-l-blue-500/30' : ''}`}>
                            <span className="text-xs text-gray-300 truncate pr-2">{acao.nome}</span>
                            {acao.id === 'minutos' ? (
                              <input type="number" min="0" placeholder="0" value={matchStats[player.id]?.[acao.id] === '' ? '' : (matchStats[player.id]?.[acao.id] || 0)} onChange={(e) => handleSetLiveAction(player.id, acao.id, e.target.value)} onBlur={(e) => { if (e.target.value === '') handleSetLiveAction(player.id, acao.id, '0'); }} className="w-16 p-1 text-center bg-gray-800 text-blue-400 font-bold text-sm rounded border border-gray-700 outline-none" />
                            ) : (
                              <div className="flex space-x-1 items-center">
                                <button onClick={() => handleLiveAction(player.id, acao.id, -1)} className="bg-gray-800 text-gray-400 w-7 h-7 rounded hover:bg-red-900/50 flex items-center justify-center font-bold">-</button>
                                <span className="font-mono w-6 text-center text-blue-400 font-bold text-sm">{matchStats[player.id]?.[acao.id] || 0}</span>
                                <button onClick={() => handleLiveAction(player.id, acao.id, 1)} className="bg-gray-800 text-gray-400 w-7 h-7 rounded hover:bg-green-900/50 flex items-center justify-center font-bold">+</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA: ANÁLISE AVANÇADA */}
        {activeTab === 'analise' && (
          <div className="space-y-6">
            <GlobalFilters />
            
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl">
              <h2 className="text-2xl font-bold mb-2">Criar Cruzamento de Dados</h2>
              <form onSubmit={handleSaveCustomMetric} className="flex flex-col md:flex-row gap-4 items-center">
                <input type="text" placeholder="Nome (Ex: Golos/Minuto)" required value={novaMetrica.nome} onChange={e => setNovaMetrica({...novaMetrica, nome: e.target.value})} className="flex-1 p-3 bg-gray-950 rounded-lg border border-gray-700 text-sm w-full" />
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <select required value={novaMetrica.numerador} onChange={e => setNovaMetrica({...novaMetrica, numerador: e.target.value})} className="p-3 bg-gray-950 rounded-lg border border-gray-700 text-sm outline-none"><option value="">Numerador (X)...</option>{ACOES_TATICAS.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}</select>
                  <span className="font-black text-xl text-gray-600">÷</span>
                  <select required value={novaMetrica.denominador} onChange={e => setNovaMetrica({...novaMetrica, denominador: e.target.value})} className="p-3 bg-gray-950 rounded-lg border border-gray-700 text-sm outline-none"><option value="">Denominador (Y)...</option>{ACOES_TATICAS.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}</select>
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
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400 text-sm"><th className="p-3">#</th><th className="p-3">Atleta</th><th className="p-3 text-right">Fórmula</th><th className="p-3 text-right font-black text-blue-400">Resultado (Índice)</th></tr>
                  </thead>
                  <tbody>
                    {getAnalyzedPlayers().map((player, idx) => {
                      const metricObj = savedMetrics.find(m => m.id === selectedMetricId);
                      return (
                        <tr key={player.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                          <td className="p-3 font-mono text-gray-500">{idx + 1}</td>
                          <td className="p-3 font-bold">{player.nome} <span className="text-xs text-gray-500 block">{player.posicao} | {player.time_nome}</span></td>
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

        {/* ABA: HISTÓRICO DE PARTIDAS */}
        {activeTab === 'historico' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-6">Relatórios de Partidas Salvas</h2>
            {matchHistory.length === 0 ? <div className="text-center py-20 text-gray-500 bg-gray-900 rounded-xl border border-gray-800">Nenhum relatório de partida encontrado.</div> : (
              matchHistory.map(partida => (
                <div key={partida.id} className={`bg-gray-900 rounded-xl border transition ${editingMatchId === partida.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-800'}`}>
                  <div className="p-4 bg-gray-800/50 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800/50 gap-4">
                    {editingMatchId === partida.id ? (
                      <div className="flex-1 w-full"><input type="text" value={editMatchData.titulo} onChange={e => setEditMatchData({...editMatchData, titulo: e.target.value})} className="w-full p-2 bg-gray-950 rounded border border-gray-700 text-blue-400 font-bold outline-none" /></div>
                    ) : (
                      <div><h3 className="font-bold text-lg text-blue-400">{partida.titulo}</h3><p className="text-sm text-gray-400">Criado em: {new Date(partida.criado_em).toLocaleDateString()} às {new Date(partida.criado_em).toLocaleTimeString()}</p></div>
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
                      {partida.dados._meta && (
                         <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {partida.dados._meta.periodLogs?.length > 0 && (
                               <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                                 <h4 className="text-gray-400 font-bold text-sm mb-2">Duração (Tempos):</h4>
                                 {partida.dados._meta.periodLogs.map((l, i) => <div key={i} className="text-blue-400 font-mono text-sm">{l}</div>)}
                               </div>
                            )}
                            <div className="bg-gray-950 p-3 rounded-lg border border-red-900/30">
                              <h4 className="text-red-400 font-bold text-sm mb-2">🛡️ Golos Sofridos (Adversário):</h4>
                              {editingMatchId === partida.id ? (
                                <input type="number" min="0" value={editMatchData.dados._meta?.gols_sofridos ?? 0} onChange={e => setEditMatchData({...editMatchData, dados: {...editMatchData.dados, _meta: {...editMatchData.dados._meta, gols_sofridos: parseInt(e.target.value)||0}}})} className="w-16 p-1 text-center bg-gray-900 text-red-400 font-bold text-sm rounded border border-gray-700 outline-none" />
                              ) : (
                                <div className="text-red-400 font-mono text-xl font-bold">{partida.dados._meta?.gols_sofridos ?? 0}</div>
                              )}
                            </div>
                         </div>
                      )}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-max">
                          <thead><tr className="border-b border-gray-800 text-gray-400 text-sm"><th className="p-2 sticky left-0 bg-gray-900 shadow-[1px_0_0_#1f2937]">Atleta</th>{ACOES_TATICAS.map(a => <th key={a.id} className="p-2 text-center" title={a.nome}>{a.nome.substring(0,3)}.</th>)}</tr></thead>
                          <tbody>
                            {Object.keys(editingMatchId === partida.id ? editMatchData.dados : partida.dados).filter(id => id !== '_meta').map(playerId => {
                              const p = players.find(x => x.id === playerId) || { nome: 'Removido' };
                              if (editingMatchId === partida.id) {
                                return (
                                  <tr key={playerId} className="border-b border-gray-800/50 hover:bg-gray-800/20 text-sm">
                                    <td className="p-2 font-bold sticky left-0 bg-gray-900 shadow-[1px_0_0_#1f2937]">{p.nome}</td>
                                    {ACOES_TATICAS.map(a => (
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
                                    ))}
                                  </tr>
                                );
                              }
                              return (
                                <tr key={playerId} className="border-b border-gray-800/50 hover:bg-gray-800/20 text-sm">
                                  <td className="p-2 font-bold sticky left-0 bg-gray-900 shadow-[1px_0_0_#1f2937]">{p.nome}</td>
                                  {ACOES_TATICAS.map(a => <td key={a.id} className="p-2 text-center font-mono text-gray-300">{partida.dados[playerId]?.[a.id] || 0}</td>)}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ABA: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            <GlobalFilters />
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Ranking de Atletas</h2>
                <select value={rankMetric} onChange={e => setRankMetric(e.target.value)} className="p-2 bg-gray-800 rounded border border-gray-700 font-bold text-blue-400 outline-none">
                  {ACOES_TATICAS.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="border-b border-gray-800 text-gray-400"><th className="p-3">#</th><th className="p-3">Atleta</th><th className="p-3 text-right">Métrica</th></tr></thead>
                  <tbody>
                    {getRankedPlayers().map((player, idx) => (
                      <tr key={player.id} className="border-b border-gray-800/50 hover:bg-gray-800/20"><td className="p-3 font-mono text-gray-500">{idx + 1}</td><td className="p-3 font-bold">{player.nome} <span className="text-xs text-gray-500 block">{player.posicao} | {player.time_nome}</span></td><td className="p-3 text-right font-mono text-xl text-green-400">{player.acoes[rankMetric]}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ABA: COMPARATIVO (mantida base) */}
        {activeTab === 'comparativo' && (
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
            <h2 className="text-2xl font-bold mb-6">Frente a Frente</h2>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <select value={compareA} onChange={e => setCompareA(e.target.value)} className="p-3 bg-gray-950 rounded border border-gray-700 text-lg outline-none">
                <option value="">Selecione o Atleta A...</option>{players.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.time_nome})</option>)}
              </select>
              <select value={compareB} onChange={e => setCompareB(e.target.value)} className="p-3 bg-gray-950 rounded border border-gray-700 text-lg outline-none">
                <option value="">Selecione o Atleta B...</option>{players.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.time_nome})</option>)}
              </select>
            </div>
            {compareA && compareB && (
              <div className="space-y-6">
                {ACOES_TATICAS.map(acao => {
                  const pA = players.find(p => p.id === compareA); const pB = players.find(p => p.id === compareB);
                  const valA = pA.acoes[acao.id] || 0; const valB = pB.acoes[acao.id] || 0; const max = Math.max(valA, valB, 1);
                  return (
                    <div key={acao.id} className="relative">
                      <div className="flex justify-between text-sm text-gray-400 mb-1 px-1"><span className="font-mono text-blue-400 font-bold">{valA}</span><span className="uppercase tracking-widest text-xs">{acao.nome}</span><span className="font-mono text-orange-400 font-bold">{valB}</span></div>
                      <div className="flex h-3 bg-gray-950 rounded overflow-hidden">
                        <div className="w-1/2 flex justify-end bg-gray-950 pr-1"><div className="h-full bg-blue-500 rounded-l" style={{ width: `${(valA / max) * 100}%` }}></div></div>
                        <div className="w-1/2 flex justify-start bg-gray-950 pl-1"><div className="h-full bg-orange-500 rounded-r" style={{ width: `${(valB / max) * 100}%` }}></div></div>
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