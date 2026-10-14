import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import Navbar from './components/Navbar';
import AbaClubes from './components/AbaClubes';
import AbaBaseDados from './components/AbaBaseDados';
import AbaLiveMatch from './components/AbaLiveMatch';
import AbaHistorico from './components/AbaHistorico';
import AbaAnalise from './components/AbaAnalise';
import AbaRanking from './components/AbaRanking';
import AbaComparativo from './components/AbaComparativo';

export const SETORES = {
  'GOLEIRO (GK)': ['GOLEIRO (GK)'],
  'DEFENSORES (DEF)': ['ZAGUEIRO (ZAG)', 'LATERAL DIREITO (LD)', 'LATERAL ESQUERDO (LE)'],
  'MÉDIOS (MEI)': ['VOLANTE (VOL)', 'MEIA CENTRAL (MC)', '2º VOLANTE (2ºV)', 'MEIA ATACANTE (MEI)'],
  'ATACANTES (ATA)': ['EXTREMO (EX)', 'CENTRO AVANTE (CA)', 'FALSO 9 (F9)']
};

// === NOVA CATEGORIZAÇÃO DE AÇÕES ===
export const ACOES_LINHA = [
  { id: 'partidas', nome: 'Partidas', categoria: 'Geral' }, { id: 'minutos', nome: 'Minutos', categoria: 'Geral' },
  { id: 'finalizacoes_certas', nome: 'Fin. Certas', categoria: 'Finalizações' }, { id: 'finalizacoes_erradas', nome: 'Fin. Erradas', categoria: 'Finalizações' }, { id: 'gols', nome: 'Golos', categoria: 'Finalizações' },
  { id: 'cruzamentos', nome: 'Cruzamentos', categoria: 'Passes' }, { id: 'passes_chave', nome: 'Passes Chave', categoria: 'Passes' }, { id: 'passes_frente', nome: 'Passes p/ Frente', categoria: 'Passes' }, { id: 'assistencias', nome: 'Assistências', categoria: 'Passes' },
  { id: 'desarmes', nome: 'Desarmes', categoria: 'Defensivo' }, { id: 'duelos_aereos', nome: 'Duelos Aéreos', categoria: 'Defensivo' }, { id: 'bloqueios', nome: 'Bloqueios', categoria: 'Defensivo' },
  { id: 'cartoes_amarelos', nome: 'Cartões Amarelos', categoria: 'Disciplinares' }, { id: 'cartoes_vermelhos', nome: 'Cartões Vermelhos', categoria: 'Disciplinares' }, { id: 'faltas_cometidas', nome: 'Faltas Cometidas', categoria: 'Disciplinares' },
  { id: 'perdas_posse', nome: 'Perdas de Posse', categoria: 'Erros' }, { id: 'erros_passe', nome: 'Erros de Passe', categoria: 'Erros' }
];

export const ACOES_GOLEIRO = [
  { id: 'partidas', nome: 'Partidas', categoria: 'Geral' }, { id: 'minutos', nome: 'Minutos', categoria: 'Geral' },
  { id: 'defesas', nome: 'Defesas', categoria: 'Defensivo' }, { id: 'defesas_dificeis', nome: 'Defesas difíceis', categoria: 'Defensivo' }, { id: 'saida_meta', nome: 'Saída de meta', categoria: 'Defensivo' }, { id: 'confrontos', nome: 'Confrontos', categoria: 'Defensivo' }, { id: 'gols_sofridos', nome: 'Gols Sofridos', categoria: 'Defensivo' },
  { id: 'tiros_meta', nome: 'Tiros de meta', categoria: 'Passes' }, { id: 'acoes_pes', nome: 'Ações com os pés', categoria: 'Passes' },
  { id: 'cartoes_amarelos', nome: 'Cartões Amarelos', categoria: 'Disciplinares' }, { id: 'cartoes_vermelhos', nome: 'Cartões Vermelhos', categoria: 'Disciplinares' }, { id: 'faltas_cometidas', nome: 'Faltas Cometidas', categoria: 'Disciplinares' },
  { id: 'erros_passe', nome: 'Erros de Passe', categoria: 'Erros' }
];

export const TODAS_ACOES = [...new Map([...ACOES_LINHA, ...ACOES_GOLEIRO].map(item => [item.id, item])).values()];

export default function App() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('scout');
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [matchHistory, setMatchHistory] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  
  const [newTeamName, setNewTeamName] = useState('');
  const [newCompetitionName, setNewCompetitionName] = useState('');
  
  // === FILTROS GLOBAIS ===
  const [filterTeam, setFilterTeam] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [globalDateStart, setGlobalDateStart] = useState('');
  const [globalDateEnd, setGlobalDateEnd] = useState('');
  
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [expandedPlayers, setExpandedPlayers] = useState([]); 
  const [novoJogador, setNovoJogador] = useState({ nome: '', time_nome: '', categoria: '', setor: '', funcoes: [''], altura: '', pe_dominante: 'Destro', percentual_gordura: '', velocidade_maxima: '', ano_nascimento: '' });

  // === ESTADOS DO MODO JOGO ===
  const [matchCompetition, setMatchCompetition] = useState(''); 
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
  const [opponentGoals, setOpponentGoals] = useState(0);
  const [opponentShots, setOpponentShots] = useState(0);
  const [opponentFinalThird, setOpponentFinalThird] = useState(0);

  const [editingMatchId, setEditingMatchId] = useState(null);
  const [editMatchData, setEditMatchData] = useState(null);

  // === PROTEÇÃO DE DADOS ===
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

  // === FUNÇÃO DE FILTRO POR DATA ===
  const isMatchInDateRange = (matchDateStr, start, end) => {
    if (!start && !end) return true;
    const mDate = new Date(matchDateStr);
    if (start && mDate < new Date(`${start}T00:00:00`)) return false;
    if (end && mDate > new Date(`${end}T23:59:59`)) return false;
    return true;
  };

  const getComputedStats = (player, startD, endD) => {
    if (!startD && !endD) return player.acoes; 
    const playerMatches = safeMatchHistory.filter(m => isMatchInDateRange(m.criado_em, startD, endD) && m.dados && m.dados[player.id]);
    
    const computed = {};
    TODAS_ACOES.forEach(a => computed[a.id] = 0);
    
    playerMatches.forEach(m => {
      const st = m.dados[player.id];
      Object.keys(st).forEach(k => { computed[k] = (computed[k] || 0) + (parseInt(st[k]) || 0); });
    });
    return computed;
  };

  const playersWithCalculatedStats = displayedPlayers.map(p => ({
    ...p, acoes_calc: getComputedStats(p, globalDateStart, globalDateEnd)
  }));

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
    const { data: compData } = await supabase.from('competicoes').select('nome').order('nome');
    if (compData) setCompetitions(compData.map(c => c.nome));
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

  const handleAddCompetition = async (e) => {
    e.preventDefault();
    if (!newCompetitionName.trim() || competitions.includes(newCompetitionName.trim())) return alert("Competição inválida ou já existe.");
    const { error } = await supabase.from('competicoes').insert([{ nome: newCompetitionName.trim() }]);
    if (error) alert("Erro: " + error.message);
    else { setCompetitions([...competitions, newCompetitionName.trim()].sort()); setNewCompetitionName(''); }
  };

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
    const payload = { ...novoJogador, funcoes: funcoesLimpas, altura: parseFloat(novoJogador.altura) || 0, percentual_gordura: parseFloat(novoJogador.percentual_gordura) || 0, velocidade_maxima: parseFloat(novoJogador.velocidade_maxima) || 0, ano_nascimento: parseInt(novoJogador.ano_nascimento) || null };
    
    if (editingPlayerId) {
      const { data, error } = await supabase.from('jogadores').update(payload).eq('id', editingPlayerId).select();
      if (!error && data) { setPlayers(safePlayers.map(p => p.id === editingPlayerId ? { ...p, ...payload } : p)); cancelarEdicao(); }
    } else {
      const acoesIniciais = {}; const listaBase = novoJogador.setor === 'GOLEIRO (GK)' ? ACOES_GOLEIRO : ACOES_LINHA;
      listaBase.forEach(a => acoesIniciais[a.id] = 0); payload.acoes = acoesIniciais;
      const { data, error } = await supabase.from('jogadores').insert([payload]).select();
      if (!error && data) { setPlayers([...safePlayers, data[0]]); cancelarEdicao(); }
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
      await supabase.from('jogadores').delete().eq('id', playerId); 
      setPlayers(safePlayers.filter(p => p.id !== playerId)); setMatchSquad(prev => prev.filter(s => s.id !== playerId)); 
    } 
  };
  const toggleExpandPlayer = (id) => { setExpandedPlayers(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]); };

  const handleSetGlobalAction = async (playerId, actionId, value) => {
    const rawValue = value === '' ? '' : Math.max(0, parseInt(value) || 0); const player = safePlayers.find(p => p.id === playerId); const novasAcoesGlobais = { ...player.acoes, [actionId]: rawValue };
    setPlayers(safePlayers.map(p => p.id === playerId ? { ...p, acoes: novasAcoesGlobais } : p));
    if (typeof rawValue === 'number') await supabase.from('jogadores').update({ acoes: novasAcoesGlobais }).eq('id', playerId);
  };
  const handleUpdateGlobalActions = async (playerId, actionId, incrementValue) => {
    const player = safePlayers.find(p => p.id === playerId); const novoValor = Math.max(0, (parseInt(player.acoes[actionId]) || 0) + incrementValue); const novasAcoesGlobais = { ...player.acoes, [actionId]: novoValor };
    setPlayers(safePlayers.map(p => p.id === playerId ? { ...p, acoes: novasAcoesGlobais } : p));
    await supabase.from('jogadores').update({ acoes: novasAcoesGlobais }).eq('id', playerId);
  };

  // --- Funções do Live Match e Histórico Omitidas para Poupar Espaço, MANTENHA AS SUAS ORIGINAIS ---
  // (Inicie Partida, Encerre Partida, Substituições, etc... MANTENHA O SEU CÓDIGO)

  const renderGlobalFilters = (showDates = false) => (
    <div className="flex flex-col md:flex-row gap-3 mb-6 bg-gray-900 p-4 rounded-xl border border-gray-800">
      <div className="flex items-center gap-2 text-gray-400 font-bold mr-2">🔎 Filtros:</div>
      {showDates && (
        <div className="flex gap-2 flex-1 items-center">
          <input type="date" value={globalDateStart} onChange={e => setGlobalDateStart(e.target.value)} className="p-2 bg-gray-950 rounded border border-gray-700 outline-none text-sm w-full text-blue-400" />
          <span className="text-gray-500 font-bold">até</span>
          <input type="date" value={globalDateEnd} onChange={e => setGlobalDateEnd(e.target.value)} className="p-2 bg-gray-950 rounded border border-gray-700 outline-none text-sm w-full text-blue-400" />
        </div>
      )}
      <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} className="p-2 bg-gray-950 rounded border border-gray-700 outline-none text-sm flex-1"><option value="">Todos os Clubes</option>{teams.map(t => <option key={t} value={t}>{t}</option>)}</select>
      <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="p-2 bg-gray-950 rounded border border-gray-700 outline-none text-sm flex-1"><option value="">Todas as Categorias</option>{uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}</select>
    </div>
  );

  if (!session) return <Login />;

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans pb-10">
      <Navbar session={session} activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        
        {/* COMPONENTES INJETADOS COM AS NOVAS PROPS */}
        {activeTab === 'scout' && <AbaBaseDados novoJogador={novoJogador} setNovoJogador={setNovoJogador} teams={teams} handleSavePlayer={handleSavePlayer} editingPlayerId={editingPlayerId} cancelarEdicao={cancelarEdicao} FilterComponent={renderGlobalFilters(true)} displayedPlayers={playersWithCalculatedStats} toggleExpandPlayer={toggleExpandPlayer} handleEditClick={handleEditClick} handleDeletePlayer={handleDeletePlayer} expandedPlayers={expandedPlayers} SETORES={SETORES} ACOES_LINHA={ACOES_LINHA} ACOES_GOLEIRO={ACOES_GOLEIRO} handleSetGlobalAction={handleSetGlobalAction} handleUpdateGlobalActions={handleUpdateGlobalActions} competitions={competitions} newCompetitionName={newCompetitionName} setNewCompetitionName={setNewCompetitionName} handleAddCompetition={handleAddCompetition} />}
        
        {activeTab === 'analise' && <AbaAnalise FilterComponent={renderGlobalFilters(true)} TODAS_ACOES={TODAS_ACOES} playersWithCalculatedStats={playersWithCalculatedStats} safeMatchHistory={safeMatchHistory} teams={teams} startD={globalDateStart} endD={globalDateEnd} isMatchInDateRange={isMatchInDateRange} />}
        
        {activeTab === 'comparativo' && <AbaComparativo teams={teams} uniqueCategories={uniqueCategories} SETORES={SETORES} safePlayers={safePlayers} safeMatchHistory={safeMatchHistory} TODAS_ACOES={TODAS_ACOES} getComputedStats={getComputedStats} uniqueCompetitionsHistory={uniqueCompetitionsHistory} isMatchInDateRange={isMatchInDateRange} />}
        
      </main>
    </div>
  );
}