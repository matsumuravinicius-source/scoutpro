import { FIELD_ACTION_COLORS } from './fieldActionColors.js';

export const LIVE_ACTION_GROUPS = [
  { id: 'finalizacao', label: 'Finalização', icon: '◎', options: [
    { id: 'finalizacoes_certas', label: 'No gol' }, { id: 'finalizacoes_erradas', label: 'Para fora' }, { id: 'gols', label: 'Golo' }
  ] },
  { id: 'passes', label: 'Passes', icon: '↗', options: [
    { id: 'passes_certos', label: 'Passe completo' }, { id: 'erro_passe', label: 'Passe incompleto' },
    { id: 'passes_frente', label: 'Passe para frente' }, { id: 'passes_chave', label: 'Passe-chave' },
    { id: 'cruzamentos', label: 'Cruzamento' }, { id: 'assistencias', label: 'Assistência' }
  ] },
  { id: 'conducao', label: 'Condução', icon: '→', options: [{ id: 'conducoes', label: 'Condução' }] },
  { id: 'desarme', label: 'Desarme', icon: '◇', options: [{ id: 'desarmes', label: 'Desarme' }] },
  { id: 'bloqueio', label: 'Bloqueio', icon: '▥', options: [{ id: 'bloqueios', label: 'Bloqueio' }] },
  { id: 'duelo', label: 'Duelo', icon: '⇄', options: [
    { id: 'duelos_aereos', label: 'Duelo aéreo' }, { id: 'duelos_terrestres', label: 'Duelo terrestre' }
  ] },
  { id: 'defesa_meta', label: 'Defesa de meta', icon: '⊓', options: [
    { id: 'defesas', label: 'Defesa' }, { id: 'defesas_dificeis', label: 'Defesa difícil' }
  ] }
];

const actionIds = new Set(LIVE_ACTION_GROUPS.flatMap(group => group.options.map(option => option.id)));

const position = (id, label, shortLabel) => ({ id, label, shortLabel });
const goalkeeper = position('gk', 'Goleiro', 'GK');
const backFour = [position('rb', 'Lateral direito', 'LD'), position('rcb', 'Zagueiro direito', 'ZAD'), position('lcb', 'Zagueiro esquerdo', 'ZAE'), position('lb', 'Lateral esquerdo', 'LE')];
const backThree = [position('rcb', 'Zagueiro direito', 'ZAD'), position('cb', 'Zagueiro central', 'ZAC'), position('lcb', 'Zagueiro esquerdo', 'ZAE')];
const wingBacks = [position('rwb', 'Ala direito', 'AD'), position('lwb', 'Ala esquerdo', 'AE')];
const doublePivot = [position('rdm', 'Volante direito', 'VD'), position('ldm', 'Volante esquerdo', 'VE')];
const midfieldThree = [position('dm', 'Volante', 'VOL'), position('rcm', 'Meia direito', 'MD'), position('lcm', 'Meia esquerdo', 'ME')];
const midfieldFour = [position('rm', 'Meia pela direita', 'MD'), ...doublePivot, position('lm', 'Meia pela esquerda', 'ME')];
const frontThree = [position('rw', 'Ponta direita', 'PD'), position('st', 'Centroavante', 'CA'), position('lw', 'Ponta esquerda', 'PE')];
const frontTwo = [position('rs', 'Atacante direito', 'ATD'), position('ls', 'Atacante esquerdo', 'ATE')];
const playmaker = position('am', 'Meia central ofensivo', 'MCO');

export const LIVE_FORMATIONS = [
  { id: '4-3-3', label: '4-3-3', positions: [goalkeeper, ...backFour, ...midfieldThree, ...frontThree] },
  { id: '4-4-2', label: '4-4-2', positions: [goalkeeper, ...backFour, ...midfieldFour, ...frontTwo] },
  { id: '4-2-3-1', label: '4-2-3-1', positions: [goalkeeper, ...backFour, ...doublePivot, position('ram', 'Meia ofensivo direito', 'MOD'), playmaker, position('lam', 'Meia ofensivo esquerdo', 'MOE'), position('st', 'Centroavante', 'CA')] },
  { id: '4-1-4-1', label: '4-1-4-1', positions: [goalkeeper, ...backFour, position('dm', 'Volante', 'VOL'), position('rm', 'Meia pela direita', 'MD'), position('rcm', 'Meia central direito', 'MCD'), position('lcm', 'Meia central esquerdo', 'MCE'), position('lm', 'Meia pela esquerda', 'ME'), position('st', 'Centroavante', 'CA')] },
  { id: '4-3-1-2', label: '4-3-1-2 (losango)', positions: [goalkeeper, ...backFour, ...midfieldThree, playmaker, ...frontTwo] },
  { id: '4-2-2-2', label: '4-2-2-2', positions: [goalkeeper, ...backFour, ...doublePivot, position('ram', 'Meia ofensivo direito', 'MOD'), position('lam', 'Meia ofensivo esquerdo', 'MOE'), ...frontTwo] },
  { id: '3-5-2', label: '3-5-2', positions: [goalkeeper, ...backThree, ...wingBacks, ...midfieldThree, ...frontTwo] },
  { id: '3-4-3', label: '3-4-3', positions: [goalkeeper, ...backThree, ...wingBacks, ...doublePivot, ...frontThree] },
  { id: '3-4-2-1', label: '3-4-2-1', positions: [goalkeeper, ...backThree, ...wingBacks, ...doublePivot, position('ram', 'Meia ofensivo direito', 'MOD'), position('lam', 'Meia ofensivo esquerdo', 'MOE'), position('st', 'Centroavante', 'CA')] },
  { id: '5-3-2', label: '5-3-2', positions: [goalkeeper, ...backThree, ...backFour.filter(item => ['rb', 'lb'].includes(item.id)), ...midfieldThree, ...frontTwo] },
  { id: '5-4-1', label: '5-4-1', positions: [goalkeeper, ...backThree, ...backFour.filter(item => ['rb', 'lb'].includes(item.id)), ...midfieldFour, position('st', 'Centroavante', 'CA')] }
];

export const getFormationPositions = formationId => LIVE_FORMATIONS.find(formation => formation.id === formationId)?.positions || [];

export const validateLiveMatchSetup = ({ competition, date, homeTeam, awayTeam, category, homeFormation, awayFormation }) => {
  if (!competition?.trim()) throw new Error('Selecione a competição.');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00`)) ||
      new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error('Informe uma data válida para o jogo.');
  if (!homeTeam || !awayTeam) throw new Error('Selecione a equipe de casa e a equipe visitante.');
  if (homeTeam === awayTeam) throw new Error('As equipes de casa e visitante devem ser diferentes.');
  if (!category?.trim()) throw new Error('Selecione a categoria.');
  if (!getFormationPositions(homeFormation).length || !getFormationPositions(awayFormation).length) throw new Error('Selecione a formação de cada equipe.');
};

export const prepareLiveAction = (request, { homeTeam, awayTeam, homeFormation, awayFormation }) => {
  if (!request || !actionIds.has(request.actionId)) throw new Error('Escolha uma das ações disponíveis.');
  if (![homeTeam, awayTeam].includes(request.team)) throw new Error('Escolha uma equipe desta partida.');
  const teamSide = request.team === homeTeam ? 'home' : 'away';
  const formation = teamSide === 'home' ? homeFormation : awayFormation;
  const selectedPosition = getFormationPositions(formation).find(item => item.id === request.positionId);
  if (!selectedPosition) throw new Error('Escolha uma posição da formação desta equipe.');
  if (!Number.isInteger(request.period) || request.period < 1 || request.period > 4 ||
      !Number.isInteger(request.seconds) || request.seconds < 0) throw new Error('O momento da ação é inválido.');
  return { playerId: null, positionId: selectedPosition.id, positionLabel: selectedPosition.label, formation, teamName: request.team,
    teamSide, actionId: request.actionId,
    period: request.period, seconds: request.seconds };
};

export const collectPositionTeamStats = (events, homeTeam, awayTeam) => {
  const totals = { [homeTeam]: {}, [awayTeam]: {} };
  (events || []).forEach(event => {
    const team = event.teamSide === 'home' ? homeTeam : event.teamSide === 'away' ? awayTeam : null;
    if (!team || !actionIds.has(event.actionId)) return;
    totals[team][event.actionId] = (totals[team][event.actionId] || 0) + 1;
  });
  return totals;
};

export const formatPositionActionLog = event => {
  const minutes = Math.floor(event.seconds / 60).toString().padStart(2, '0');
  const seconds = (event.seconds % 60).toString().padStart(2, '0');
  const label = LIVE_ACTION_GROUPS.flatMap(group => group.options).find(option => option.id === event.actionId)?.label;
  return `[T${event.period} - ${event.time || `${minutes}:${seconds}`}] ${event.teamName} · ${event.positionLabel} • ${event.label || label || event.actionId}`;
};

export const getPositionActionColor = event => {
  const awayShot = event.teamSide === 'away' && ['gols', 'finalizacoes_certas', 'finalizacoes_erradas'].includes(event.actionId);
  return awayShot ? (event.actionId === 'gols' ? '#f97316' : '#eab308') : FIELD_ACTION_COLORS[event.actionId];
};

export const collectLiveTeamStats = (stats, players, homeTeam, awayTeam) => {
  const totals = { [homeTeam]: {}, [awayTeam]: {} };
  Object.entries(stats).forEach(([playerId, actions]) => {
    const team = players.find(player => String(player.id) === playerId)?.time_nome;
    if (!Object.hasOwn(totals, team)) return;
    Object.entries(actions).forEach(([actionId, value]) => {
      if (['partidas', 'minutos'].includes(actionId)) return;
      totals[team][actionId] = (totals[team][actionId] || 0) + (Number(value) || 0);
    });
  });
  return totals;
};
