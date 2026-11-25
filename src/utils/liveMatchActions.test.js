import test from 'node:test';
import assert from 'node:assert/strict';
import { LIVE_FORMATIONS, getFormationPositions, validateLiveMatchSetup, prepareLiveAction, collectLiveTeamStats, collectPositionTeamStats, formatPositionActionLog, getPositionActionColor } from './liveMatchActions.js';
import { getLiveTeamStats, getTeamGoalsConceded } from './matchTeams.js';

const setup = { competition: 'Liga', date: '2026-11-25', homeTeam: 'Casa', awayTeam: 'Visitante', category: 'Principal', homeFormation: '4-3-3', awayFormation: '3-5-2' };
const players = [
  { id: 'a', nome: 'Atleta da casa', time_nome: 'Casa', categoria: 'Principal' },
  { id: 'b', nome: 'Atleta visitante', time_nome: 'Visitante', categoria: 'Principal' },
  { id: 'c', nome: 'Outra categoria', time_nome: 'Casa', categoria: 'Sub-20' }
];

test('a match needs both formations but no squad or registered athletes', () => {
  assert.doesNotThrow(() => validateLiveMatchSetup(setup));
  assert.throws(() => validateLiveMatchSetup({ ...setup, awayTeam: 'Casa' }), /diferentes/);
  assert.throws(() => validateLiveMatchSetup({ ...setup, date: '2026-02-30' }), /data válida/);
  for (const field of ['competition', 'date', 'homeTeam', 'awayTeam', 'category', 'homeFormation', 'awayFormation']) {
    assert.throws(() => validateLiveMatchSetup({ ...setup, [field]: '' }));
  }
});

test('formations expose eleven distinct positions including a goalkeeper', () => {
  LIVE_FORMATIONS.forEach(formation => {
    assert.equal(formation.positions.length, 11, formation.id);
    assert.equal(new Set(formation.positions.map(position => position.id)).size, 11, formation.id);
    assert.equal(formation.positions.filter(position => position.id === 'gk').length, 1);
  });
  assert.deepEqual(getFormationPositions('unknown'), []);
});

test('a position action preserves its instant and validates the selected team formation', () => {
  const request = { positionId: 'rwb', team: 'Visitante', actionId: 'gols', period: 2, seconds: 60 };
  const event = prepareLiveAction(request, setup);
  assert.equal(event.teamSide, 'away');
  assert.equal(event.playerId, null);
  assert.equal(event.positionLabel, 'Ala direito');
  assert.equal(event.formation, '3-5-2');
  assert.equal(event.period, 2);
  assert.equal(event.seconds, 60);
  assert.throws(() => prepareLiveAction({ ...request, team: 'Outro' }, setup), /equipe/);
  assert.throws(() => prepareLiveAction({ ...request, team: 'Casa' }, setup), /posição/);
  assert.throws(() => prepareLiveAction({ ...request, actionId: 'minutos' }, setup), /ações/);
  assert.throws(() => prepareLiveAction({ ...request, period: 5 }, setup), /momento/);
  assert.throws(() => prepareLiveAction({ ...request, seconds: -1 }, setup), /momento/);
  assert.throws(() => prepareLiveAction({ ...request, positionId: '' }, setup), /posição/);
  assert.equal(getPositionActionColor(event), '#f97316');
  assert.equal(getPositionActionColor({ ...event, actionId: 'finalizacoes_certas' }), '#eab308');
  assert.equal(getPositionActionColor({ ...event, teamSide: 'home', actionId: 'finalizacoes_certas' }), '#22c55e');
  assert.equal(formatPositionActionLog(event), '[T2 - 01:00] Visitante · Ala direito • Golo');
});

test('position totals follow match sides through renames without assigning athlete statistics', () => {
  const events = [prepareLiveAction({ positionId: 'st', team: 'Casa', actionId: 'gols', period: 1, seconds: 30 }, setup),
    prepareLiveAction({ positionId: 'rwb', team: 'Visitante', actionId: 'passes_certos', period: 1, seconds: 45 }, setup)];
  const totals = collectPositionTeamStats(events, 'Casa renomeada', 'Visitante');
  assert.deepEqual(totals, { 'Casa renomeada': { gols: 1 }, Visitante: { passes_certos: 1 } });
  assert.deepEqual(collectPositionTeamStats([], 'Casa', 'Visitante'), { Casa: {}, Visitante: {} });
  assert.deepEqual(getLiveTeamStats({ equipes: ['Casa renomeada', 'Visitante'], homeTeam: 'Casa', awayTeam: 'Visitante', teamStats: { Casa: { gols: 1 } } }, 'Casa renomeada'), { gols: 1 });
  assert.ok(events.every(event => event.playerId === null));
});

test('both clubs receive their own totals, with no assumed minutes or appearances', () => {
  const stats = collectLiveTeamStats({ a: { gols: 1, conducoes: 2, minutos: 90, partidas: 1 },
    b: { gols: 2, passes_certos: 4 }, _meta: {} }, players, 'Casa', 'Visitante');
  assert.deepEqual(stats.Casa, { gols: 1, conducoes: 2 });
  assert.deepEqual(stats.Visitante, { gols: 2, passes_certos: 4 });
  assert.deepEqual(collectLiveTeamStats({}, [], 'Casa', 'Visitante'), { Casa: {}, Visitante: {} });
  const meta = { homeTeam: 'Casa', awayTeam: 'Visitante', teamStats: stats, equipes: ['Casa', 'Visitante'] };
  assert.equal(getTeamGoalsConceded(meta, 'Casa'), 2);
  assert.equal(getTeamGoalsConceded(meta, 'Visitante'), 1);
  assert.equal(getTeamGoalsConceded(meta, 'Outro'), 0);
  assert.equal(getTeamGoalsConceded({ gols_sofridos: '3' }, 'Casa'), 3);
  assert.equal(getTeamGoalsConceded({ ...meta, equipes: ['Casa renomeada', 'Visitante'] }, 'Casa renomeada'), 2);
});
