import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LIVE_ACTION_GROUPS, LIVE_FORMATIONS, getFormationPositions } from '../utils/liveMatchActions.js';

const fieldClass = 'w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-3 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50';
const buttonClass = 'rounded-xl px-4 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-50';
const uniqueValues = values => [...new Set(values.filter(Boolean))];
const choiceClass = selected => `rounded-xl border px-3 py-2 text-left text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm ${selected ? 'border-blue-400 bg-blue-600/25 text-blue-100 ring-1 ring-blue-400' : 'border-gray-700 bg-gray-950 text-gray-200 hover:border-blue-500 hover:bg-blue-950/30'}`;

function FormationSelector({ id, label, value, onChange, disabled }) {
  const positions = getFormationPositions(value);
  return <div className="mt-4">
    <label htmlFor={id} className="mb-2 block text-sm font-medium text-gray-300">{label}</label>
    <select id={id} required value={value || ''} onChange={event => onChange(event.target.value)} disabled={disabled} className={fieldClass} aria-describedby={positions.length ? `${id}-positions` : undefined}>
      <option value="">Selecione a formação</option>
      {LIVE_FORMATIONS.map(formation => <option key={formation.id} value={formation.id}>{formation.label}</option>)}
    </select>
    {positions.length > 0 && <p id={`${id}-positions`} className="mt-2 text-xs leading-relaxed text-gray-400">{positions.map(position => position.label).join(' · ')}</p>}
  </div>;
}

export default function AbaLiveMatch({
  isMatchActive, matchTitle, matchDate, setMatchDate,
  matchCompetition, setMatchCompetition, competitions = [],
  matchTeam, setMatchTeam, matchAwayTeam, setMatchAwayTeam,
  matchHomeFormation, setMatchHomeFormation, matchAwayFormation, setMatchAwayFormation,
  matchCategory, setMatchCategory, uniqueCategories = [],
  teams = [], players = [], iniciarPartida,
  currentPeriod, formatTime, matchTime, isTimerRunning, setIsTimerRunning,
  handleFinalizarTempo, encerrarPartida, liveActionEvents = [], handleRegisterLiveAction,
}) {
  const [selection, setSelection] = useState(null);
  const [team, setTeam] = useState('');
  const [positionId, setPositionId] = useState('');
  const [actionId, setActionId] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const dialogRef = useRef(null);
  const firstTeamButtonRef = useRef(null);
  const registeringRef = useRef(false);
  const startingRef = useRef(false);
  const savingRef = useRef(false);
  const isDialogOpen = Boolean(selection);
  const isActionDisabled = currentPeriod > 4 || (!isTimerRunning && matchTime === 0) || isSaving;
  const categories = uniqueValues([...uniqueCategories, ...players.map(player => player.categoria), matchCategory, 'Principal', 'Sub-20']);
  const teamNames = uniqueValues(teams);
  const teamFormation = team === matchTeam ? matchHomeFormation : team === matchAwayTeam ? matchAwayFormation : '';
  const positions = getFormationPositions(teamFormation);

  useEffect(() => {
    if (!isDialogOpen) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    firstTeamButtonRef.current?.focus();
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!registeringRef.current) setSelection(null);
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = [...(dialogRef.current?.querySelectorAll('button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex="0"]') || [])];
      if (!elements.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [isDialogOpen]);

  const startMatch = async event => {
    event.preventDefault();
    if (startingRef.current) return;
    startingRef.current = true;
    setIsStarting(true);
    setFeedback(null);
    try {
      await iniciarPartida();
    } catch (error) {
      setFeedback({ error: true, message: error?.message || 'Não foi possível iniciar a partida.' });
    } finally {
      startingRef.current = false;
      setIsStarting(false);
    }
  };

  const saveMatch = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    setFeedback(null);
    try {
      await encerrarPartida();
    } catch (error) {
      setFeedback({ error: true, message: error?.message || 'Não foi possível salvar a partida. Tente novamente.' });
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const openAction = group => {
    if (isActionDisabled || registeringRef.current) return;
    setSelection({ group, period: currentPeriod, seconds: matchTime });
    setTeam('');
    setPositionId('');
    setActionId(group.options.length === 1 ? group.options[0].id : '');
    setDialogError('');
    setFeedback(null);
  };
  const closeAction = () => { if (!registeringRef.current) setSelection(null); };

  const registerAction = async event => {
    event.preventDefault();
    if (registeringRef.current || !selection) return;
    if (!team || !positions.some(position => position.id === positionId) || !selection.group.options.some(option => option.id === actionId)) {
      setDialogError('Selecione o time, a posição e a ação para continuar.');
      return;
    }
    registeringRef.current = true;
    setIsRegistering(true);
    setDialogError('');
    try {
      const result = await handleRegisterLiveAction({ positionId, team, actionId, period: selection.period, seconds: selection.seconds });
      setSelection(null);
      setFeedback({ message: result?.pendingLocation ? 'Marque no campo a posição da ação para concluir o registro.' : 'Ação registrada.' });
    } catch (error) {
      setDialogError(error?.message || 'Não foi possível registrar a ação. Tente novamente.');
    } finally {
      registeringRef.current = false;
      setIsRegistering(false);
    }
  };

  const countGroupActions = group => liveActionEvents.filter(event => group.options.some(option => option.id === event.actionId)).length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      {!isMatchActive ? (
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-xl sm:p-7">
          <h2 className="text-xl font-bold text-white">Nova partida ao vivo</h2>
          <p className="mt-1 text-sm text-gray-400">Selecione os dados da partida para começar.</p>
          <form onSubmit={startMatch} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="live-competition" className="mb-2 block text-sm font-medium text-gray-300">Competição</label>
              <select id="live-competition" required value={matchCompetition || ''} onChange={event => setMatchCompetition(event.target.value)} className={fieldClass} disabled={isStarting}>
                <option value="">Selecione a competição</option>
                {uniqueValues(competitions).map(competition => <option key={competition} value={competition}>{competition}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="live-date" className="mb-2 block text-sm font-medium text-gray-300">Data do jogo</label>
              <input id="live-date" type="date" required value={matchDate || ''} onChange={event => setMatchDate(event.target.value)} className={fieldClass} disabled={isStarting} />
            </div>
            <div>
              <label htmlFor="live-home-team" className="mb-2 block text-sm font-medium text-gray-300">Equipe da casa</label>
              <select id="live-home-team" required value={matchTeam || ''} onChange={event => setMatchTeam(event.target.value)} className={fieldClass} disabled={isStarting}>
                <option value="">Selecione a equipe</option>
                {teamNames.map(value => <option key={value} value={value} disabled={value === matchAwayTeam}>{value}</option>)}
              </select>
              <FormationSelector id="live-home-formation" label="Formação da equipe da casa" value={matchHomeFormation} onChange={setMatchHomeFormation} disabled={isStarting} />
            </div>
            <div>
              <label htmlFor="live-away-team" className="mb-2 block text-sm font-medium text-gray-300">Equipe visitante</label>
              <select id="live-away-team" required value={matchAwayTeam || ''} onChange={event => setMatchAwayTeam(event.target.value)} className={fieldClass} disabled={isStarting}>
                <option value="">Selecione a equipe</option>
                {teamNames.map(value => <option key={value} value={value} disabled={value === matchTeam}>{value}</option>)}
              </select>
              <FormationSelector id="live-away-formation" label="Formação da equipe visitante" value={matchAwayFormation} onChange={setMatchAwayFormation} disabled={isStarting} />
            </div>
            <div>
              <label htmlFor="live-category" className="mb-2 block text-sm font-medium text-gray-300">Categoria</label>
              <select id="live-category" required value={matchCategory || ''} onChange={event => setMatchCategory(event.target.value)} className={fieldClass} disabled={isStarting}>
                <option value="">Selecione a categoria</option>
                {categories.map(category => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={isStarting} className={`${buttonClass} w-full bg-blue-600 text-white hover:bg-blue-500`}>{isStarting ? 'Iniciando…' : 'Iniciar partida'}</button>
            </div>
          </form>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-400">Partida ao vivo</p>
                <h2 className="mt-1 break-words text-xl font-bold text-white">{matchTeam && matchAwayTeam ? `${matchTeam} × ${matchAwayTeam}` : matchTitle}</h2>
                <p className="mt-1 text-sm text-gray-400">{[matchCompetition, matchDate ? matchDate.split('-').reverse().join('/') : '', matchCategory].filter(Boolean).join(' · ')}</p>
                <p className="mt-1 text-xs text-gray-400">{matchTeam}: {LIVE_FORMATIONS.find(formation => formation.id === matchHomeFormation)?.label} · {matchAwayTeam}: {LIVE_FORMATIONS.find(formation => formation.id === matchAwayFormation)?.label}</p>
              </div>
              <div className="rounded-xl border border-gray-700 bg-gray-950 px-6 py-3 text-center" aria-label={`Cronômetro, ${currentPeriod > 4 ? 'partida encerrada' : `${currentPeriod}º tempo`}`}>
                <p className="text-xs font-medium text-gray-400">{currentPeriod > 4 ? 'Partida encerrada' : `${currentPeriod}º tempo`}</p>
                <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-white">{formatTime(matchTime)}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 border-t border-gray-800 pt-5">
              <button type="button" onClick={() => setIsTimerRunning(!isTimerRunning)} disabled={currentPeriod > 4 || isSaving} className={`${buttonClass} min-w-32 ${isTimerRunning ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>{isTimerRunning ? 'Pausar' : 'Iniciar'}</button>
              <button type="button" onClick={handleFinalizarTempo} disabled={currentPeriod > 4 || isSaving} className={`${buttonClass} border border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700`}>{currentPeriod > 4 ? 'Tempos encerrados' : `Finalizar ${currentPeriod}º tempo`}</button>
              <button type="button" onClick={saveMatch} disabled={isSaving} className={`${buttonClass} border border-red-900/70 bg-red-950/40 text-red-300 hover:bg-red-900/40 sm:ml-auto`}>{isSaving ? 'Salvando…' : 'Terminar e salvar'}</button>
            </div>
          </section>
          <section aria-label="Ações da partida" className="rounded-2xl border border-gray-800 bg-gray-900 p-5 sm:p-6">
            {isActionDisabled && currentPeriod <= 4 && !isSaving && <p className="mb-4 text-sm text-gray-400">Inicie o cronômetro para registrar as ações.</p>}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {LIVE_ACTION_GROUPS.map(group => {
                const count = countGroupActions(group);
                return (
                  <button key={group.id} type="button" onClick={() => openAction(group)} disabled={isActionDisabled} className="flex min-h-28 flex-col items-start justify-between gap-4 rounded-xl border border-gray-700 bg-gray-950 p-4 text-left text-white transition hover:border-blue-500 hover:bg-blue-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-32 sm:p-5">
                    <span className="flex w-full items-center justify-between gap-2"><span className="text-2xl" aria-hidden="true">{group.icon}</span><span className="rounded-lg bg-gray-800 px-2 py-1 text-xs font-bold tabular-nums text-gray-300" aria-label={`${count} registros`}>{count}</span></span>
                    <span className="text-sm font-bold sm:text-base">{group.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}
      {feedback && <p role={feedback.error ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm ${feedback.error ? 'border-red-900 bg-red-950/30 text-red-300' : 'border-blue-900 bg-blue-950/30 text-blue-200'}`}>{feedback.message}</p>}
      {selection && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4" onClick={event => { if (event.target === event.currentTarget) closeAction(); }}>
          <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="live-action-title" aria-describedby="live-action-moment" aria-busy={isRegistering} tabIndex={-1} className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-700 bg-gray-900 p-5 shadow-2xl outline-none sm:p-6">
            <h2 id="live-action-title" className="text-lg font-bold text-white">{selection.group.label}</h2>
            <p id="live-action-moment" className="mt-1 text-sm text-gray-400">{selection.period}º tempo · {formatTime(selection.seconds)}</p>
            <form onSubmit={registerAction} className="mt-5 space-y-4">
              <fieldset disabled={isRegistering}>
                <legend className="mb-2 text-sm font-medium text-gray-300">Time que realizou a ação</legend>
                <div className="grid grid-cols-2 gap-3">
                  {[matchTeam, matchAwayTeam].map((value, index) => <button ref={index === 0 ? firstTeamButtonRef : undefined} key={value} type="button" aria-pressed={team === value} onClick={() => { setTeam(value); if (value !== team) setPositionId(''); setDialogError(''); }} className={choiceClass(team === value)}>
                    <span className="block text-[10px] font-medium uppercase tracking-wide opacity-70">{index === 0 ? 'Casa' : 'Visitante'}</span>
                    <span className="mt-1 block break-words">{value}</span>
                  </button>)}
                </div>
              </fieldset>
              <fieldset disabled={!team || isRegistering}>
                <legend className="mb-2 text-sm font-medium text-gray-300">Posição {team && <span className="font-normal text-gray-400">· {LIVE_FORMATIONS.find(formation => formation.id === teamFormation)?.label}</span>}</legend>
                {!team ? <p className="rounded-xl border border-dashed border-gray-700 px-4 py-3 text-sm text-gray-400">Escolha um time para mostrar as posições da formação.</p> : <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {positions.map(position => <button key={position.id} type="button" aria-pressed={positionId === position.id} onClick={() => { setPositionId(position.id); setDialogError(''); }} className={choiceClass(positionId === position.id)}>{position.label}</button>)}
                </div>}
              </fieldset>
              {selection.group.options.length > 1 && (
                <fieldset disabled={isRegistering}>
                  <legend className="mb-2 text-sm font-medium text-gray-300">Tipo de ação</legend>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {selection.group.options.map(option => <button key={option.id} type="button" aria-pressed={actionId === option.id} onClick={() => { setActionId(option.id); setDialogError(''); }} className={choiceClass(actionId === option.id)}>{option.label}</button>)}
                  </div>
                </fieldset>
              )}
              {dialogError && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">{dialogError}</p>}
              <div className="flex gap-3 border-t border-gray-800 pt-4">
                <button type="button" disabled={isRegistering} onClick={closeAction} className={`${buttonClass} flex-1 border border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700`}>Cancelar</button>
                <button type="submit" disabled={isRegistering || !team || !positionId || !actionId} className={`${buttonClass} flex-1 bg-blue-600 text-white hover:bg-blue-500`}>{isRegistering ? 'Registrando…' : 'Registrar ação'}</button>
              </div>
            </form>
          </section>
        </div>, document.body,
      )}
    </div>
  );
}
