import React, { useState } from 'react';
import { getPlayerActions, getPlayerSectorLabel } from '../utils/playerSectors';

const toCount = value => Number.parseInt(value, 10) || 0;
const formatDate = value => {
  if (!value) return '—';
  const dateOnly = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  return new Date(value).toLocaleDateString('pt-BR');
};

const createEmptyCross = () => ({
  name: '',
  numerator: '',
  operator: 'ratio',
  denominator: ''
});

export default function AbaRelatorios({
  targetType,
  targetId,
  onClose,
  players = [],
  teamMetadata = {},
  matchHistory = [],
  uniqueCompetitions = [],
  TODAS_ACOES = [],
  ACOES_LINHA = [],
  ACOES_GOLEIRO = [],
  isDateInRange
}) {
  const isPlayerReport = targetType === 'atleta';
  const player = isPlayerReport ? players.find(item => String(item.id) === String(targetId)) : null;
  const teamName = isPlayerReport ? '' : targetId;
  const teamPlayers = players.filter(item => item.time_nome === teamName);
  const teamPlayerIds = new Set(teamPlayers.map(item => String(item.id)));
  const availableActions = player
    ? getPlayerActions(player, ACOES_LINHA, ACOES_GOLEIRO)
    : [...TODAS_ACOES, { id: 'finalizacoes_adversario', nome: 'Finalizações do adversário', categoria: 'Adversário' }];

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [competition, setCompetition] = useState('');
  const [showBio, setShowBio] = useState(true);
  const [showMatches, setShowMatches] = useState(true);
  const [notes, setNotes] = useState('');
  const [selectedActions, setSelectedActions] = useState(() => availableActions.map(action => action.id));
  const [crossDraft, setCrossDraft] = useState(createEmptyCross);
  const [reportCrosses, setReportCrosses] = useState([]);

  const filteredMatches = matchHistory.filter(match => {
    if (competition && match.dados?._meta?.competicao !== competition) return false;
    if (isDateInRange && !isDateInRange(match.criado_em, startDate, endDate)) return false;
    if (isPlayerReport) return Boolean(match.dados?.[player?.id]);
    return Boolean(match.dados?._meta?.equipes?.includes(teamName));
  });

  const hasFilters = Boolean(startDate || endDate || competition);
  const stats = {};
  availableActions.forEach(action => { stats[action.id] = 0; });

  if (isPlayerReport && player) {
    if (!hasFilters) {
      Object.entries(player.acoes || {}).forEach(([key, value]) => { stats[key] = toCount(value); });
    } else {
      filteredMatches.forEach(match => {
        Object.entries(match.dados?.[player.id] || {}).forEach(([key, value]) => {
          stats[key] = (stats[key] || 0) + toCount(value);
        });
      });
    }
    stats.partidas = filteredMatches.length;
  } else if (!isPlayerReport) {
    if (!hasFilters) {
      teamPlayers.forEach(teamPlayer => {
        Object.entries(teamPlayer.acoes || {}).forEach(([key, value]) => {
          stats[key] = (stats[key] || 0) + toCount(value);
        });
      });
    } else {
      filteredMatches.forEach(match => {
        Object.entries(match.dados || {}).forEach(([playerId, actions]) => {
          if (playerId === '_meta' || !teamPlayerIds.has(String(playerId))) return;
          Object.entries(actions || {}).forEach(([key, value]) => {
            stats[key] = (stats[key] || 0) + toCount(value);
          });
        });
      });
    }
    stats.partidas = filteredMatches.length;
    stats.gols_sofridos = filteredMatches.reduce((total, match) => total + toCount(match.dados?._meta?.gols_sofridos), 0);
    stats.finalizacoes_adversario = filteredMatches.reduce((total, match) => total + toCount(match.dados?._meta?.finalizacoes_adversario), 0);
  }

  const reportTitle = title.trim() || (isPlayerReport ? `Relatório de ${player?.nome || 'atleta'}` : `Relatório de ${teamName || 'clube'}`);
  const displayedActions = availableActions.filter(action => selectedActions.includes(action.id));
  const teamDetails = teamMetadata[teamName] || {};

  const toggleAction = actionId => {
    setSelectedActions(previous => previous.includes(actionId)
      ? previous.filter(id => id !== actionId)
      : [...previous, actionId]);
  };

  const addReportCross = event => {
    event.preventDefault();
    if (!crossDraft.name.trim() || !crossDraft.numerator || !crossDraft.denominator) return;
    setReportCrosses(previous => [...previous, { ...crossDraft, id: `${Date.now()}-${Math.random()}` }]);
    setCrossDraft(createEmptyCross());
  };

  const getCrossValue = cross => {
    const numerator = Number(stats[cross.numerator]) || 0;
    const denominator = Number(stats[cross.denominator]) || 0;
    if (cross.operator === 'difference') return (numerator - denominator).toFixed(1).replace(/\.0$/, '');
    if (cross.operator === 'percent') return denominator ? `${((numerator / denominator) * 100).toFixed(1)}%` : '—';
    return denominator ? (numerator / denominator).toFixed(2) : '—';
  };

  if ((isPlayerReport && !player) || (!isPlayerReport && !teamName)) return null;

  return (
    <div className="report-print-area fixed inset-0 z-[90] overflow-y-auto bg-black/80 backdrop-blur-sm p-3 md:p-6">
      <div className="report-modal-header max-w-[1500px] mx-auto flex items-center justify-between gap-4 mb-4 print:hidden">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-300">ScoutPro · Relatório de {isPlayerReport ? 'atleta' : 'clube'}</p>
          <h2 className="text-xl font-black text-white">{isPlayerReport ? player.nome : teamName}</h2>
        </div>
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-700 bg-gray-900 text-sm font-bold text-gray-200 hover:bg-gray-800">Fechar ✕</button>
      </div>

      <div className="report-layout max-w-[1500px] mx-auto grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-4 items-start">
        <aside className="report-builder bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4 print:hidden">
          <div>
            <h3 className="font-bold text-white">Configurar relatório</h3>
            <p className="text-xs text-gray-400 mt-1">Os filtros e cruzamentos valem apenas para este documento.</p>
          </div>

          <label className="block text-xs font-bold text-gray-400">Título
            <input value={title} onChange={event => setTitle(event.target.value)} placeholder={reportTitle} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 p-2.5 text-sm text-white outline-none focus:border-blue-500" />
          </label>

          <section className="space-y-2 border-t border-gray-800 pt-3">
            <h4 className="text-[11px] font-black uppercase tracking-wide text-gray-300">Período e competição</h4>
            <select value={competition} onChange={event => setCompetition(event.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-950 p-2 text-xs text-white">
              <option value="">Todas as competições</option>
              {uniqueCompetitions.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] text-gray-400">De
                <input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="mt-1 w-full rounded border border-gray-700 bg-gray-950 p-2 text-xs text-white" />
              </label>
              <label className="text-[10px] text-gray-400">Até
                <input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="mt-1 w-full rounded border border-gray-700 bg-gray-950 p-2 text-xs text-white" />
              </label>
            </div>
          </section>

          <section className="space-y-2 border-t border-gray-800 pt-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-[11px] font-black uppercase tracking-wide text-gray-300">Ações incluídas</h4>
              <button type="button" onClick={() => setSelectedActions(selectedActions.length === availableActions.length ? [] : availableActions.map(action => action.id))} className="text-[10px] font-bold text-blue-300 hover:text-white">
                {selectedActions.length === availableActions.length ? 'Limpar' : 'Todas'}
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-800 bg-gray-950 p-2 space-y-1">
              {availableActions.map(action => (
                <label key={action.id} className="flex items-center gap-2 text-xs text-gray-300">
                  <input type="checkbox" checked={selectedActions.includes(action.id)} onChange={() => toggleAction(action.id)} className="accent-blue-500" />
                  <span>{action.nome}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-2 border-t border-gray-800 pt-3">
            <h4 className="text-[11px] font-black uppercase tracking-wide text-gray-300">Cruzamento exclusivo deste relatório</h4>
            <form onSubmit={addReportCross} className="space-y-2">
              <input required value={crossDraft.name} onChange={event => setCrossDraft(previous => ({ ...previous, name: event.target.value }))} placeholder="Nome do indicador" className="w-full rounded-lg border border-gray-700 bg-gray-950 p-2 text-xs text-white" />
              <select required value={crossDraft.numerator} onChange={event => setCrossDraft(previous => ({ ...previous, numerator: event.target.value }))} className="w-full rounded-lg border border-gray-700 bg-gray-950 p-2 text-xs text-white">
                <option value="">Primeira ação</option>
                {availableActions.map(action => <option key={action.id} value={action.id}>{action.nome}</option>)}
              </select>
              <select value={crossDraft.operator} onChange={event => setCrossDraft(previous => ({ ...previous, operator: event.target.value }))} className="w-full rounded-lg border border-gray-700 bg-gray-950 p-2 text-xs text-white">
                <option value="ratio">Dividir A por B</option>
                <option value="percent">A como percentual de B</option>
                <option value="difference">Diferença A − B</option>
              </select>
              <select required value={crossDraft.denominator} onChange={event => setCrossDraft(previous => ({ ...previous, denominator: event.target.value }))} className="w-full rounded-lg border border-gray-700 bg-gray-950 p-2 text-xs text-white">
                <option value="">Segunda ação</option>
                {availableActions.map(action => <option key={action.id} value={action.id}>{action.nome}</option>)}
              </select>
              <button type="submit" className="w-full rounded-lg border border-blue-700 bg-blue-900/40 p-2 text-xs font-bold text-blue-200 hover:bg-blue-800/60">Adicionar cruzamento</button>
            </form>
            <p className="text-[10px] leading-relaxed text-gray-500">Exemplo: dividir finalizações certas por finalizações totais. O indicador existe apenas neste relatório.</p>
            {reportCrosses.length > 0 && <ul className="space-y-1">
              {reportCrosses.map(cross => <li key={cross.id} className="flex items-center justify-between gap-2 rounded bg-gray-950 px-2 py-1.5 text-[11px] text-gray-300">
                <span className="truncate">{cross.name}</span>
                <button type="button" onClick={() => setReportCrosses(previous => previous.filter(item => item.id !== cross.id))} aria-label={`Remover ${cross.name}`} className="text-red-300">Remover</button>
              </li>)}
            </ul>}
          </section>

          <section className="space-y-2 border-t border-gray-800 pt-3">
            {isPlayerReport && <label className="flex items-center gap-2 text-xs text-gray-300"><input type="checkbox" checked={showBio} onChange={event => setShowBio(event.target.checked)} className="accent-blue-500" /> Dados do atleta</label>}
            <label className="flex items-center gap-2 text-xs text-gray-300"><input type="checkbox" checked={showMatches} onChange={event => setShowMatches(event.target.checked)} className="accent-blue-500" /> Partidas consideradas</label>
            <label className="block text-[11px] font-bold text-gray-400">Observações
              <textarea rows="3" value={notes} onChange={event => setNotes(event.target.value)} placeholder="Observações para este relatório" className="mt-1 w-full resize-y rounded-lg border border-gray-700 bg-gray-950 p-2.5 text-xs text-white" />
            </label>
          </section>

          <button type="button" onClick={() => window.print()} className="w-full rounded-lg bg-blue-600 py-3 text-sm font-black text-white hover:bg-blue-500">Imprimir / Salvar em PDF</button>
        </aside>

        <article className="report-document min-h-[600px] rounded-xl border border-gray-200 bg-white p-5 text-gray-900 shadow-xl md:p-8">
          <header className="flex items-start justify-between gap-4 border-b border-gray-200 pb-4">
            <div className="flex items-center gap-3 min-w-0">
              {isPlayerReport && player.acoes?.foto_perfil && <img src={player.acoes.foto_perfil} alt="" className="h-12 w-12 rounded-full object-cover" />}
              {!isPlayerReport && teamDetails.shieldPhoto && <img src={teamDetails.shieldPhoto} alt="" className="h-12 w-12 rounded-lg object-cover" />}
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">ScoutPro · Relatório de {isPlayerReport ? 'atleta' : 'clube'}</p>
                <h1 className="truncate text-xl font-bold md:text-2xl">{reportTitle}</h1>
                <p className="mt-1 text-sm text-gray-600">{isPlayerReport ? `${player.nome} · ${player.time_nome || 'Sem clube'} · ${getPlayerSectorLabel(player)}` : teamName}</p>
              </div>
            </div>
            <div className="shrink-0 text-right text-[11px] text-gray-500">
              <div>Gerado em {new Date().toLocaleDateString('pt-BR')}</div>
              {competition && <div>{competition}</div>}
              {(startDate || endDate) && <div>{startDate ? formatDate(startDate) : 'Início'} – {endDate ? formatDate(endDate) : 'Hoje'}</div>}
            </div>
          </header>

          {isPlayerReport && showBio && <section className="mt-4 grid grid-cols-2 gap-x-5 gap-y-2 rounded-lg bg-gray-50 p-3 text-xs sm:grid-cols-4">
            <div><span className="block text-[10px] uppercase text-gray-500">Nascimento</span>{player.ano_nascimento || '—'}</div>
            <div><span className="block text-[10px] uppercase text-gray-500">Altura</span>{player.altura ? `${player.altura} m` : '—'}</div>
            <div><span className="block text-[10px] uppercase text-gray-500">Pé dominante</span>{player.pe_dominante || '—'}</div>
            <div><span className="block text-[10px] uppercase text-gray-500">Funções</span>{player.funcoes?.join(', ') || '—'}</div>
          </section>}

          {!isPlayerReport && (teamDetails.country || teamDetails.division || teamDetails.foundedYear) && <p className="mt-4 text-xs text-gray-600">{[teamDetails.country, teamDetails.division, teamDetails.foundedYear && `Fundado em ${teamDetails.foundedYear}`].filter(Boolean).join(' · ')}</p>}

          <section className="mt-5">
            <div className="mb-2 flex items-baseline justify-between border-b border-gray-200 pb-2">
              <h2 className="text-sm font-bold">Estatísticas</h2>
              <span className="text-[11px] text-gray-500">{filteredMatches.length} {filteredMatches.length === 1 ? 'partida' : 'partidas'}</span>
            </div>
            {displayedActions.length ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {displayedActions.map(action => <div key={action.id} className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-2">
                <span className="text-xs text-gray-600">{action.nome}</span>
                <strong className="font-mono text-sm">{stats[action.id] || 0}</strong>
              </div>)}
            </div> : <p className="text-xs text-gray-500">Nenhuma ação selecionada para exibição.</p>}
          </section>

          {reportCrosses.length > 0 && <section className="mt-5">
            <h2 className="mb-2 border-b border-gray-200 pb-2 text-sm font-bold">Cruzamentos do relatório</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {reportCrosses.map(cross => {
                const numeratorName = availableActions.find(action => action.id === cross.numerator)?.nome || cross.numerator;
                const denominatorName = availableActions.find(action => action.id === cross.denominator)?.nome || cross.denominator;
                const operationLabel = cross.operator === 'difference' ? '−' : cross.operator === 'percent' ? '% de' : '÷';
                return <div key={cross.id} className="rounded-md border border-gray-200 px-3 py-2">
                  <span className="block text-xs font-semibold">{cross.name}</span>
                  <span className="block text-[10px] text-gray-500">{numeratorName} {operationLabel} {denominatorName}</span>
                  <strong className="mt-1 block font-mono text-lg">{getCrossValue(cross)}</strong>
                </div>;
              })}
            </div>
          </section>}

          {showMatches && <section className="mt-5">
            <h2 className="mb-2 border-b border-gray-200 pb-2 text-sm font-bold">Partidas consideradas</h2>
            {filteredMatches.length ? <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[11px]">
                <thead><tr className="border-b border-gray-200 text-gray-500"><th className="py-2 pr-3">Data</th><th className="py-2 pr-3">Competição</th><th className="py-2">Partida</th></tr></thead>
                <tbody>{filteredMatches.map(match => <tr key={match.id} className="border-b border-gray-100">
                  <td className="py-2 pr-3">{formatDate(match.criado_em)}</td>
                  <td className="py-2 pr-3">{match.dados?._meta?.competicao || '—'}</td>
                  <td className="py-2">{match.titulo || 'Partida'}</td>
                </tr>)}</tbody>
              </table>
            </div> : <p className="text-xs text-gray-500">Não há partidas para os filtros selecionados.</p>}
          </section>}

          {notes.trim() && <section className="mt-5 border-t border-gray-200 pt-3">
            <h2 className="text-sm font-bold">Observações</h2>
            <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-gray-700">{notes}</p>
          </section>}

          <footer className="mt-6 border-t border-gray-200 pt-2 text-[10px] text-gray-400">Gerado pelo ScoutPro</footer>
        </article>
      </div>
    </div>
  );
}
