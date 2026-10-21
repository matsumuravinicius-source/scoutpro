import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

// Funções auxiliares de Vídeo e Tempo
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

export default function AbaLiveMatch({
  isMatchActive, matchTitle, setMatchTitle, 
  matchDate, setMatchDate,
  matchVideoUrl, setMatchVideoUrl, videoOffsetT1, setVideoOffsetT1, videoOffsetT2, setVideoOffsetT2,
  matchCompetition, setMatchCompetition, competitions,
  matchTeam, setMatchTeam, 
  matchCategory, setMatchCategory,
  matchSquad, setMatchSquad,
  handleAddToSquad, handleRemoveFromSquad, handleUpdateSquadPlayer, handlePerformSubstitution,
  teams, players, iniciarPartida, currentPeriod, formatTime, matchTime, 
  isTimerRunning, setIsTimerRunning, handleFinalizarTempo, 
  opponentGoals, opponentShots, opponentFinalThird, handleOpponentAction, 
  encerrarPartida, matchEventLog, setMatchEventLog, 
  ACOES_LINHA, ACOES_GOLEIRO, matchStats, handleSetLiveAction, handleLiveAction, getLivePlayerMinutes
}) {
  
  const [expandedLivePlayers, setExpandedLivePlayers] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [subPlayerOut, setSubPlayerOut] = useState(null); 

  // Estados do Leitor de Vídeo
  const [localVideoFileUrl, setLocalVideoFileUrl] = useState(null);
  const [ytStartSeconds, setYtStartSeconds] = useState(0);
  const [seekCounter, setSeekCounter] = useState(0); // Força o iframe a atualizar mesmo clicando no mesmo tempo
  const [preRollSeconds, setPreRollSeconds] = useState(3);
  const [youtubeAutoplay, setYoutubeAutoplay] = useState(false);
  const localVideoRef = useRef(null);
  const youtubeFrameRef = useRef(null);
  const [videoPopupWindow, setVideoPopupWindow] = useState(null);
  const videoPopupRef = useRef(null);
  const videoPlayerHostRef = useRef(null);
  const videoInlineSlotRef = useRef(null);
  const [videoPlayerHost, setVideoPlayerHost] = useState(null);

  const restoreVideoPlayer = () => {
    if (videoPlayerHostRef.current && videoInlineSlotRef.current) {
      videoInlineSlotRef.current.appendChild(videoPlayerHostRef.current);
    }
  };

  useEffect(() => {
    if (!videoPopupWindow) return undefined;
    const closePopupState = () => {
      restoreVideoPlayer();
      videoPopupRef.current = null;
      setVideoPopupWindow(null);
    };
    const closeCheck = window.setInterval(() => {
      if (videoPopupWindow.closed) closePopupState();
    }, 500);
    videoPopupWindow.addEventListener('beforeunload', closePopupState);
    return () => {
      window.clearInterval(closeCheck);
      videoPopupWindow.removeEventListener('beforeunload', closePopupState);
    };
  }, [videoPopupWindow]);

  useEffect(() => () => {
    if (videoPopupRef.current && !videoPopupRef.current.closed) videoPopupRef.current.close();
  }, []);

  const isActionDisabled = matchTime === 0 || currentPeriod > 4;
  const youtubeId = extractYouTubeId(matchVideoUrl);
  const youtubeOrigin = window.location.origin && window.location.origin !== 'null'
    ? `&origin=${encodeURIComponent(window.location.origin)}`
    : '';

  const sendYoutubeCommand = command => {
    youtubeFrameRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: command, args: '' }),
      'https://www.youtube.com'
    );
  };

  const startTimerAndVideo = () => {
    if (currentPeriod > 4) return;
    setIsTimerRunning(true);
    if (localVideoRef.current) localVideoRef.current.play().catch(() => {});
    if (youtubeId) sendYoutubeCommand('playVideo');
  };

  const pauseTimerAndVideo = () => {
    setIsTimerRunning(false);
    localVideoRef.current?.pause();
    if (youtubeId) sendYoutubeCommand('pauseVideo');
  };

  const teamCategories = matchTeam 
    ? [...new Set(players.filter(p => p.time_nome === matchTeam).map(p => p.categoria).filter(Boolean))]
    : [];

  const groupActionsByCategory = (acoesArray) => {
    return acoesArray.reduce((acc, acao) => {
      const catName = acao.categoria || 'Geral';
      if (!acc[catName]) acc[catName] = [];
      acc[catName].push(acao);
      return acc;
    }, {});
  };

  const toggleLivePlayer = (id) => {
    setExpandedLivePlayers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    if(subPlayerOut === id) setSubPlayerOut(null); 
  };

  const toggleCategory = (playerId, catName) => {
    const key = `${playerId}-${catName}`;
    setExpandedCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubstitution = (playerOutId, playerInId) => {
    if(!playerInId) return;
    const pOut = players.find(p => p.id === playerOutId);
    const pIn = players.find(p => p.id === playerInId);
    handlePerformSubstitution(playerOutId, playerInId);
    setMatchEventLog(prev => [`[T${currentPeriod} - ${formatTime(matchTime)}] 🔄 Substituição: SAIU ${pOut.nome} | ENTROU ${pIn.nome}`, ...prev]);
    setSubPlayerOut(null); 
  };

  const handleLocalFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLocalVideoFileUrl(url);
    }
  };

  const openVideoInWindow = () => {
    if (videoPopupWindow && !videoPopupWindow.closed) {
      videoPopupWindow.focus();
      return;
    }

    const popup = window.open('', 'scoutpro-live-match-video', 'popup=yes,width=1280,height=800,resizable=yes');
    if (!popup) return;

    popup.document.open();
    popup.document.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vídeo da partida</title><style>html,body,#scoutpro-video-root{width:100%;height:100%;margin:0;background:#030712}#scoutpro-video-root{display:flex;flex-direction:column;padding:12px;box-sizing:border-box;gap:8px}#scoutpro-video-header{display:flex;justify-content:space-between;align-items:center;color:#e5e7eb;font: bold 14px system-ui,sans-serif;flex-shrink:0}#scoutpro-video-header button{background:#1f2937;color:#f9fafb;border:1px solid #374151;border-radius:6px;padding:7px 12px;cursor:pointer;font-weight:bold}#scoutpro-video-stage{flex:1;min-height:0}</style></head><body><div id="scoutpro-video-root"><header id="scoutpro-video-header"><span id="scoutpro-video-title">Vídeo da partida</span><button id="scoutpro-video-return" type="button">Voltar para a partida</button></header><main id="scoutpro-video-stage"></main></div></body></html>');
    popup.document.close();

    document.querySelectorAll('link[rel="stylesheet"], style').forEach(styleNode => {
      popup.document.head.appendChild(styleNode.cloneNode(true));
    });
    const stage = popup.document.getElementById('scoutpro-video-stage');
    if (videoPlayerHostRef.current) stage.appendChild(videoPlayerHostRef.current);
    popup.document.getElementById('scoutpro-video-title').textContent = `📺 ${matchTitle || 'Vídeo da partida'}`;
    popup.document.getElementById('scoutpro-video-return').addEventListener('click', () => {
      restoreVideoPlayer();
      videoPopupRef.current = null;
      setVideoPopupWindow(null);
      popup.close();
    });
    videoPopupRef.current = popup;
    setVideoPopupWindow(popup);
  };

  const closeVideoPopup = () => {
    const popup = videoPopupRef.current;
    restoreVideoPlayer();
    videoPopupRef.current = null;
    setVideoPopupWindow(null);
    if (popup && !popup.closed) popup.close();
  };

  const renderVideoPlayer = () => {
    const wrapperClass = 'w-full h-full bg-black rounded-lg overflow-hidden border border-gray-800';
    if (localVideoFileUrl) {
      return <div className={`relative ${wrapperClass}`}>
        <video ref={localVideoRef} src={localVideoFileUrl} controls className="w-full h-full object-contain" />
        <button
          type="button"
          onClick={() => setLocalVideoFileUrl(null)}
          className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded"
        >Fechar Vídeo Local</button>
      </div>;
    }
    if (youtubeId) {
      return <div className={wrapperClass}>
        <iframe
          ref={youtubeFrameRef}
          key={`${youtubeId}-${ytStartSeconds}-${seekCounter}`}
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${youtubeId}?start=${ytStartSeconds}&autoplay=${youtubeAutoplay ? 1 : 0}&enablejsapi=1${youtubeOrigin}&rel=0`}
          onLoad={() => { if (isTimerRunning || youtubeAutoplay) sendYoutubeCommand('playVideo'); }}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>;
    }
    return <div className="text-center py-6 text-gray-500 text-xs bg-gray-950/50 rounded-lg border border-gray-800 border-dashed">
      Cole um link do YouTube acima ou carregue um ficheiro de vídeo do seu computador para analisar a partida com vídeo sincronizado.
    </div>;
  };

  // NOVA FUNÇÃO: Salta para qualquer segundo específico no vídeo
  const seekVideoToSeconds = (targetSec) => {
    const safeSec = Math.max(0, targetSec);
    if (localVideoFileUrl && localVideoRef.current) {
      localVideoRef.current.currentTime = safeSec;
      localVideoRef.current.play();
    } else if (youtubeId) {
      setYtStartSeconds(safeSec);
      setYoutubeAutoplay(true);
      setSeekCounter(prev => prev + 1);
    }
  };

  // Salto para o início exato do 1º ou 2º Tempo
  const jumpToPeriodStart = (periodNumber) => {
    const offsetStr = periodNumber === 1 ? videoOffsetT1 : videoOffsetT2;
    seekVideoToSeconds(timeToSeconds(offsetStr));
  };

  // Salto inteligente para o tempo do evento na Linha do Tempo
  const jumpToEventTime = (logString) => {
    const match = logString.match(/\[T(\d+)\s*-\s*(\d{2}:\d{2})\]/);
    if (!match) return;

    const period = parseInt(match[1]);
    const eventSeconds = timeToSeconds(match[2]);
    const offsetSeconds = period === 1 ? timeToSeconds(videoOffsetT1) : timeToSeconds(videoOffsetT2);
    
    const targetSecond = Math.max(0, offsetSeconds + eventSeconds - preRollSeconds);
    seekVideoToSeconds(targetSecond);
  };

  const renderSquadListItem = (sq) => {
    const p = players.find(player => player.id === sq.id);
    if(!p) return null;
    return (
      <div key={sq.id} className="flex flex-col sm:flex-row items-center bg-gray-900 border border-gray-800 p-2 rounded-lg gap-3">
        <input 
          type="number" placeholder="Nº" value={sq.numero} 
          onChange={e => handleUpdateSquadPlayer(sq.id, 'numero', e.target.value)} 
          className="w-16 p-2 bg-gray-950 rounded border border-gray-700 text-center font-bold outline-none focus:border-blue-500" 
        />
        <div className="flex-1 font-bold w-full text-center sm:text-left">
          {p.nome} <span className="text-xs text-gray-500 font-normal">({p.setor})</span>
        </div>
        <select 
          value={sq.titular ? 'titular' : 'reserva'} 
          onChange={e => handleUpdateSquadPlayer(sq.id, 'titular', e.target.value === 'titular')} 
          className="w-full sm:w-auto p-2 bg-gray-950 rounded border border-gray-700 text-sm outline-none font-bold"
        >
          <option value="titular">TITULAR</option>
          <option value="reserva">RESERVA</option>
        </select>
        <button onClick={() => handleRemoveFromSquad(sq.id)} className="w-full sm:w-auto text-red-500 hover:text-red-400 font-bold p-2 bg-red-900/20 rounded transition">
          ✕ Remover
        </button>
      </div>
    );
  };

  const emCampo = matchSquad.filter(s => s.inPitch);
  const noBanco = matchSquad.filter(s => !s.inPitch);

  return (
    <div className="space-y-6">
      
      {!isMatchActive ? (
        <div className="bg-gray-900 p-8 rounded-xl border border-gray-800 shadow-xl max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-2">Preparar Partida</h2>
          <p className="text-gray-400 mb-6">Defina a competição, título do jogo, link de vídeo (opcional) e a lista de convocados.</p>
          
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <select 
              required value={matchCompetition} onChange={e => setMatchCompetition(e.target.value)} 
              className="flex-1 p-4 bg-gray-950 rounded-lg border border-gray-700 text-lg outline-none focus:border-blue-500"
            >
              <option value="">Selecione a Competição...</option>
              {competitions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <input 
              type="text" placeholder="Título do Jogo (Ex: Final vs Flamengo)" required 
              value={matchTitle} onChange={e => setMatchTitle(e.target.value)} 
              className="flex-[2] p-4 bg-gray-950 rounded-lg border border-gray-700 text-lg outline-none focus:border-blue-500" 
            />

            <div className="flex flex-col justify-center bg-gray-950 px-4 py-2 rounded-lg border border-gray-700 focus-within:border-blue-500">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Data do Jogo (Opcional)</span>
              <input 
                type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} 
                className="bg-transparent text-blue-400 font-bold outline-none text-sm cursor-pointer"
              />
            </div>
          </div>

          <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 mb-6 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
              🎥 Vídeo da Partida & Sincronização (Opcional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Link do YouTube</label>
                <input 
                  type="text" placeholder="https://www.youtube.com/watch?v=..." 
                  value={matchVideoUrl} onChange={e => setMatchVideoUrl(e.target.value)} 
                  className="w-full p-2.5 bg-gray-900 rounded-lg border border-gray-700 text-sm outline-none focus:border-blue-500 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1" title="Minuto do vídeo em que o árbitro apita o início do 1º Tempo">Início 1ºT no Vídeo</label>
                <input 
                  type="text" placeholder="00:00" value={videoOffsetT1} onChange={e => setVideoOffsetT1(e.target.value)} 
                  className="w-full p-2.5 bg-gray-900 rounded-lg border border-gray-700 text-sm font-mono text-center text-blue-400 font-bold outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1" title="Minuto do vídeo em que o árbitro apita o início do 2º Tempo">Início 2ºT no Vídeo</label>
                <input 
                  type="text" placeholder="45:00" value={videoOffsetT2} onChange={e => setVideoOffsetT2(e.target.value)} 
                  className="w-full p-2.5 bg-gray-900 rounded-lg border border-gray-700 text-sm font-mono text-center text-blue-400 font-bold outline-none"
                />
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <select value={matchTeam} onChange={(e) => { setMatchTeam(e.target.value); setMatchCategory(''); setMatchSquad([]); }} className="flex-1 p-3 bg-gray-950 rounded-lg border border-gray-700 text-lg outline-none focus:border-blue-500">
              <option value="">1. Selecionar Clube...</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select disabled={!matchTeam} value={matchCategory} onChange={(e) => { setMatchCategory(e.target.value); setMatchSquad([]); }} className="flex-1 p-3 bg-gray-950 rounded-lg border border-gray-700 text-lg outline-none focus:border-blue-500 disabled:opacity-50">
              <option value="">{matchTeam ? "2. Selecionar Categoria..." : "Selecione o clube primeiro"}</option>
              {teamCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select disabled={!matchCategory} onChange={(e) => { if(e.target.value) handleAddToSquad(e.target.value); e.target.value = ""; }} className="flex-1 p-3 bg-blue-900/20 text-blue-400 font-bold rounded-lg border border-blue-900/50 text-lg outline-none focus:border-blue-500 disabled:opacity-50">
              <option value="">{matchCategory ? "+ Adicionar à Convocatória..." : "Selecione a categoria"}</option>
              {players
                .filter(p => p.time_nome === matchTeam && p.categoria === matchCategory && !matchSquad.find(s => s.id === p.id))
                .sort((a,b) => a.nome.localeCompare(b.nome))
                .map(p => <option key={p.id} value={p.id}>{p.nome} ({p.funcoes?.join(', ') || p.posicao})</option>)
              }
            </select>
          </div>
          
          <div className="flex flex-col gap-2 mb-8 p-4 bg-gray-950 rounded-lg border border-gray-800 max-h-[500px] overflow-y-auto">
            {matchSquad.length === 0 && <div className="text-center py-10 text-gray-500 font-bold">Nenhum jogador selecionado. Adicione no menu acima.</div>}
            
            {matchSquad.filter(s => s.titular).length > 0 && (
              <div className="text-sm font-black text-blue-400 mt-2 border-b border-gray-800 pb-2 uppercase tracking-widest">
                ⚽ Titulares ({matchSquad.filter(s => s.titular).length}/11)
              </div>
            )}
            {matchSquad.filter(s => s.titular).map(sq => renderSquadListItem(sq))}

            {matchSquad.filter(s => !s.titular).length > 0 && (
              <div className="text-sm font-black text-orange-400 mt-6 border-b border-gray-800 pb-2 uppercase tracking-widest">
                🪑 Reservas ({matchSquad.filter(s => !s.titular).length}/12)
              </div>
            )}
            {matchSquad.filter(s => !s.titular).map(sq => renderSquadListItem(sq))}
          </div>

          <button onClick={iniciarPartida} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl text-lg transition shadow-lg shadow-green-900/20">
            Iniciar Partida
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          <div className="xl:col-span-1 space-y-4">
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl sticky top-20 z-10 flex flex-col items-center">
              <h2 className="text-sm font-bold text-red-500 flex items-center justify-center gap-2 mb-2 uppercase tracking-widest text-center leading-tight">
                <span className="animate-pulse">🔴</span> 
                <div>
                  <div className="text-[10px] text-gray-400 tracking-normal">{matchCompetition}</div>
                  <div>{matchTitle}</div>
                  {matchDate && (
                    <div className="text-[10px] text-blue-400 font-mono mt-0.5">
                      📅 {matchDate.split('-').reverse().join('/')}
                    </div>
                  )}
                </div>
              </h2>
              <div className="text-gray-400 font-bold mb-1">{currentPeriod > 4 ? 'Fim de Jogo' : `${currentPeriod}º Tempo`}</div>
              <div className="text-6xl font-mono font-black text-white mb-6 tabular-nums">{formatTime(matchTime)}</div>
              
              <div className="flex gap-2 w-full mb-4">
                {!isTimerRunning ? (
                  <button 
                    disabled={currentPeriod > 4} onClick={startTimerAndVideo}
                    className={`flex-1 py-3 rounded-lg font-bold text-lg transition shadow-lg ${currentPeriod > 4 ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50' : 'bg-green-600 hover:bg-green-500 text-white'}`}
                  >
                    ▶ Iniciar
                  </button>
                ) : (
                  <button onClick={pauseTimerAndVideo} className="flex-1 bg-yellow-600 hover:bg-yellow-500 py-3 rounded-lg font-bold text-lg transition shadow-lg text-white">
                    ⏸ Pausar
                  </button>
                )}
              </div>

              <button 
                onClick={handleFinalizarTempo} disabled={currentPeriod > 4} 
                className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 py-2 rounded-lg font-bold mb-6 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentPeriod > 4 ? '⏹ Partida Encerrada' : `⏹ Finalizar ${currentPeriod}º Tempo`}
              </button>

              <div className="w-full bg-gray-950 rounded-lg p-4 border border-red-900/50 mb-6 space-y-2">
                <h4 className="text-red-400 font-bold text-sm mb-3 flex items-center gap-2">🛡️ Ações do Adversário</h4>
                
                <div className="flex justify-between items-center bg-gray-900 px-3 py-2 rounded border border-gray-800">
                  <span className="text-sm text-gray-300">Golos</span>
                  <div className="flex space-x-2 items-center">
                    <button onClick={() => handleOpponentAction('golo', -1)} disabled={isActionDisabled} className={`bg-gray-800 text-gray-400 w-8 h-8 rounded flex items-center justify-center font-bold transition ${isActionDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-900/50'}`}>-</button>
                    <span className="font-mono w-6 text-center text-red-400 font-bold text-lg">{opponentGoals}</span>
                    <button onClick={() => handleOpponentAction('golo', 1)} disabled={isActionDisabled} className={`bg-gray-800 text-gray-400 w-8 h-8 rounded flex items-center justify-center font-bold transition ${isActionDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-900/50'}`}>+</button>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-gray-900 px-3 py-2 rounded border border-gray-800">
                  <span className="text-sm text-gray-300">Finalizações</span>
                  <div className="flex space-x-2 items-center">
                    <button onClick={() => handleOpponentAction('finalizacao', -1)} disabled={isActionDisabled} className={`bg-gray-800 text-gray-400 w-8 h-8 rounded flex items-center justify-center font-bold transition ${isActionDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-900/50'}`}>-</button>
                    <span className="font-mono w-6 text-center text-red-400 font-bold text-lg">{opponentShots}</span>
                    <button onClick={() => handleOpponentAction('finalizacao', 1)} disabled={isActionDisabled} className={`bg-gray-800 text-gray-400 w-8 h-8 rounded flex items-center justify-center font-bold transition ${isActionDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-900/50'}`}>+</button>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-gray-900 px-3 py-2 rounded border border-gray-800">
                  <span className="text-xs text-gray-300 truncate pr-1">Entrada no 1/3 Final</span>
                  <div className="flex space-x-2 items-center">
                    <button onClick={() => handleOpponentAction('ultimo_terco', -1)} disabled={isActionDisabled} className={`bg-gray-800 text-gray-400 w-8 h-8 rounded flex items-center justify-center font-bold transition ${isActionDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-900/50'}`}>-</button>
                    <span className="font-mono w-6 text-center text-red-400 font-bold text-lg">{opponentFinalThird}</span>
                    <button onClick={() => handleOpponentAction('ultimo_terco', 1)} disabled={isActionDisabled} className={`bg-gray-800 text-gray-400 w-8 h-8 rounded flex items-center justify-center font-bold transition ${isActionDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-900/50'}`}>+</button>
                  </div>
                </div>
              </div>

              <button onClick={encerrarPartida} className="w-full px-6 py-3 bg-red-700 hover:bg-red-600 rounded-lg font-bold transition shadow-lg shadow-red-900/20">Terminar e Gravar</button>
            </div>

            <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 shadow-xl h-96 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-gray-300 flex items-center gap-2 text-sm">⏱️ Linha do Tempo</h3>
                <select 
                  value={preRollSeconds} onChange={e => setPreRollSeconds(Number(e.target.value))}
                  className="bg-gray-950 text-[10px] text-blue-400 font-bold p-1 rounded border border-gray-800 outline-none"
                  title="Segundos de antecedência ao clicar no lance"
                >
                  <option value={0}>Exato (0s)</option>
                  <option value={3}>Recuar -3s</option>
                  <option value={5}>Recuar -5s</option>
                  <option value={10}>Recuar -10s</option>
                </select>
              </div>
              <p className="text-[10px] text-gray-500 mb-2">Clique num evento abaixo para saltar diretamente para o lance no vídeo.</p>
              
              <div className="flex-1 bg-gray-950 rounded-lg border border-gray-800 p-2 overflow-y-auto space-y-1.5">
                {matchEventLog.length === 0 ? (
                  <div className="text-gray-600 text-xs text-center mt-10">Eventos e Ações aparecerão aqui.</div>
                ) : (
                  matchEventLog.map((log, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => jumpToEventTime(log)}
                      className="w-full text-left text-xs text-gray-300 border-l-2 border-blue-500 pl-2 py-1.5 bg-gray-900/60 hover:bg-blue-900/30 hover:text-white rounded-r transition flex justify-between items-center group"
                    >
                      <span>{log}</span>
                      <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 font-bold pr-2 transition">▶ Ver</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="xl:col-span-3 space-y-6 content-start">
            
            {/* ==========================================
                ECRÃ DE VÍDEO COM BOTÕES CLICÁVEIS DE 1ºT E 2ºT
                ========================================== */}
            <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 shadow-xl space-y-3">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2 w-full lg:w-auto flex-1">
                  <span className="text-lg">📺</span>
                  <input 
                    type="text" placeholder="Cole aqui o link do YouTube..." 
                    value={matchVideoUrl} onChange={e => setMatchVideoUrl(e.target.value)}
                    className="flex-1 p-2 bg-gray-950 rounded border border-gray-700 text-xs text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                  {/* BOTÃO + INPUT 1º TEMPO */}
                  <div className="flex items-center bg-gray-950 rounded border border-gray-800 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => jumpToPeriodStart(1)}
                      className="bg-blue-900/30 hover:bg-blue-600 text-blue-400 hover:text-white text-[10px] font-black px-2 py-1.5 transition flex items-center gap-1 border-r border-gray-800"
                      title="Clique para ir ao início do 1º Tempo no vídeo"
                    >
                      ▶ Início 1ºT
                    </button>
                    <input 
                      type="text" 
                      value={videoOffsetT1} 
                      onChange={e => setVideoOffsetT1(e.target.value)} 
                      className="w-14 bg-transparent text-xs font-mono text-blue-400 font-bold text-center outline-none py-1" 
                      title="Editar minuto de início do 1º Tempo no vídeo"
                    />
                  </div>

                  {/* BOTÃO + INPUT 2º TEMPO */}
                  <div className="flex items-center bg-gray-950 rounded border border-gray-800 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => jumpToPeriodStart(2)}
                      className="bg-blue-900/30 hover:bg-blue-600 text-blue-400 hover:text-white text-[10px] font-black px-2 py-1.5 transition flex items-center gap-1 border-r border-gray-800"
                      title="Clique para ir ao início do 2º Tempo no vídeo"
                    >
                      ▶ Início 2ºT
                    </button>
                    <input 
                      type="text" 
                      value={videoOffsetT2} 
                      onChange={e => setVideoOffsetT2(e.target.value)} 
                      className="w-14 bg-transparent text-xs font-mono text-blue-400 font-bold text-center outline-none py-1" 
                      title="Editar minuto de início do 2º Tempo no vídeo"
                    />
                  </div>

                  <label className="cursor-pointer bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-300 px-3 py-1.5 rounded border border-gray-700 transition">
                    📁 Ficheiro Local
                    <input type="file" accept="video/*" onChange={handleLocalFileUpload} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={videoPopupWindow ? () => videoPopupWindow.focus() : openVideoInWindow}
                    className="bg-blue-900/40 hover:bg-blue-800/70 text-xs font-bold text-blue-300 px-3 py-1.5 rounded border border-blue-800/70 transition"
                    title="Abre o vídeo numa janela que pode ser movida e maximizada noutro monitor"
                  >{videoPopupWindow ? '↗ Focar janela do vídeo' : '↗ Destacar vídeo'}</button>
                </div>
              </div>

              {videoPopupWindow ? (
                <div className="aspect-video w-full bg-gray-950 rounded-lg border border-gray-800 flex flex-col items-center justify-center gap-2 text-center p-4">
                  <span className="text-blue-300 font-bold">O vídeo está aberto numa janela separada.</span>
                  <span className="text-xs text-gray-500">Arraste a janela para outro monitor e maximize-a. O vídeo continua sincronizado com o cronómetro e a linha do tempo.</span>
                  <button type="button" onClick={() => videoPopupWindow.focus()} className="text-xs font-bold text-blue-400 hover:text-blue-300">Focar janela do vídeo</button>
                  <button type="button" onClick={closeVideoPopup} className="text-xs font-bold text-gray-400 hover:text-white">Voltar vídeo para esta tela</button>
                </div>
              ) : null}
              <div ref={videoInlineSlotRef} className={videoPopupWindow ? 'hidden' : 'aspect-video w-full'}>
                <div ref={node => {
                  videoPlayerHostRef.current = node;
                  if (node && node !== videoPlayerHost) setVideoPlayerHost(node);
                }} className="w-full h-full" />
              </div>
            </div>

            <div>
              <h3 className="text-xl font-black text-blue-400 mb-4 border-b border-gray-800 pb-2 flex justify-between">
                <span>⚽ Em Campo</span>
                <span className="text-sm bg-blue-900/30 text-blue-300 px-3 py-1 rounded-full">{emCampo.length} Atletas</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {emCampo.map(sq => {
                  const player = players.find(p => p.id === sq.id);
                  const isExpanded = expandedLivePlayers.includes(sq.id);
                  const playerAcoes = (player.setor === 'GOLEIRO (GK)' ? ACOES_GOLEIRO : ACOES_LINHA).filter(a => a.id !== 'partidas');
                  const categoriasAgrupadas = groupActionsByCategory(playerAcoes);

                  return (
                    <div key={sq.id} className="bg-gray-900 rounded-xl border border-gray-800 shadow-lg relative overflow-hidden h-fit transition-all">
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
                      
                      <div className="p-3 cursor-pointer hover:bg-gray-800/50 flex justify-between items-center transition" onClick={() => toggleLivePlayer(sq.id)}>
                        <div className="pl-2">
                          <h4 className="text-base font-bold leading-tight flex items-center gap-2">
                            <span className="bg-gray-800 text-blue-400 px-1.5 py-0.5 rounded font-mono text-xs border border-gray-700">{sq.numero ? sq.numero : '?'}</span> 
                            {player.nome}
                          </h4>
                          <p className="text-xs text-blue-400 mt-1">{player.setor} | {player.funcoes?.join(' • ') || player.posicao}</p>
                        </div>
                        <div className="text-gray-500 text-xs font-bold bg-gray-950 px-2 py-1 rounded-full border border-gray-800">
                          {isExpanded ? 'Ocultar ▲' : 'Ações ▼'}
                        </div>
                      </div>

                      {subPlayerOut === sq.id && (
                        <div className="p-3 bg-gray-950 border-t border-gray-800" onClick={(e) => e.stopPropagation()}>
                          <p className="text-xs text-orange-400 font-bold mb-2 uppercase tracking-wider">Quem entra no lugar de {player.nome}?</p>
                          <select 
                            onChange={(e) => handleSubstitution(sq.id, e.target.value)} 
                            className="w-full p-3 bg-gray-900 rounded border border-gray-700 text-sm font-bold outline-none mb-2 focus:border-orange-500"
                          >
                            <option value="">Escolha o reserva...</option>
                            {noBanco.map(s => {
                              const p = players.find(x => x.id === s.id);
                              return <option key={s.id} value={s.id}>Nº {s.numero} - {p.nome} ({p.setor})</option>;
                            })}
                          </select>
                          <button onClick={() => setSubPlayerOut(null)} className="w-full py-2 text-xs text-gray-400 font-bold bg-gray-800 rounded hover:bg-gray-700 transition">Cancelar Substituição</button>
                        </div>
                      )}

                      {isExpanded && subPlayerOut !== sq.id && (
                        <div className="p-3 border-t border-gray-800/50 bg-gray-900/50">
                          {isActionDisabled && currentPeriod <= 4 && <p className="text-[10px] text-red-500 text-center font-bold mb-2 bg-red-950/30 p-1 rounded">⏱️ Inicie o cronómetro para ativar ações.</p>}
                          {isActionDisabled && currentPeriod > 4 && <p className="text-[10px] text-gray-400 text-center font-bold mb-2 bg-gray-900 p-1 rounded">🛑 Partida Finalizada.</p>}
                          
                          <button 
                            disabled={currentPeriod > 4} 
                            onClick={(e) => { e.stopPropagation(); setSubPlayerOut(sq.id); }} 
                            className={`w-full mb-3 py-2 rounded text-sm font-bold flex items-center justify-center gap-2 transition ${currentPeriod > 4 ? 'bg-gray-900 text-gray-600 cursor-not-allowed' : 'bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300'}`}
                          >
                            🔄 Substituir Atleta
                          </button>
                          
                          <div className="space-y-2">
                            {Object.keys(categoriasAgrupadas).map(catName => {
                              const isCatExpanded = expandedCategories[`${sq.id}-${catName}`];
                              const totalCatActions = categoriasAgrupadas[catName].reduce((sum, acao) => {
                                if (acao.id === 'minutos') return sum;
                                return sum + (parseInt(matchStats[sq.id]?.[acao.id]) || 0);
                              }, 0);

                              return (
                                <div key={catName} className="bg-gray-950/60 rounded-lg border border-gray-800 overflow-hidden">
                                  <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); toggleCategory(sq.id, catName); }}
                                    className="w-full p-2.5 flex justify-between items-center bg-gray-950 hover:bg-gray-800/60 transition text-left"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] uppercase font-black text-blue-400 tracking-widest">{catName}</span>
                                      {totalCatActions > 0 && (
                                        <span className="bg-blue-900/40 text-blue-300 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full border border-blue-800/50">
                                          {totalCatActions}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-gray-500 text-[10px] font-bold">
                                      {isCatExpanded ? '▲' : '▼'}
                                    </span>
                                  </button>

                                  {isCatExpanded && (
                                    <div className="p-2 border-t border-gray-800/80 grid grid-cols-1 gap-1.5 bg-gray-900/30">
                                      {categoriasAgrupadas[catName].map(acao => (
                                        <div key={acao.id} className={`flex justify-between items-center bg-gray-900 px-2 py-1.5 rounded border border-gray-800/50 ${['gols', 'cartoes_amarelos', 'cartoes_vermelhos', 'passes_chave', 'defesas_dificeis', 'gols_sofridos'].includes(acao.id) ? 'border-l-2 border-l-blue-500/50' : ''}`}>
                                          <span className="text-xs text-gray-300 truncate pr-2">{acao.nome}</span>
                                          {acao.id === 'minutos' ? (
                                            <span className="w-16 text-center font-mono text-blue-400 font-bold text-sm">{getLivePlayerMinutes(sq.id)}'</span>
                                          ) : (
                                            <div className="flex space-x-1 items-center">
                                              <button disabled={isActionDisabled} onClick={(e) => { e.stopPropagation(); handleLiveAction(sq.id, acao.id, -1); }} className={`bg-gray-800 text-gray-400 w-7 h-7 rounded flex items-center justify-center font-bold transition ${isActionDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-900/50'}`}>-</button>
                                              <span className="font-mono w-6 text-center text-blue-400 font-bold text-sm">{matchStats[sq.id]?.[acao.id] || 0}</span>
                                              <button disabled={isActionDisabled} onClick={(e) => { e.stopPropagation(); handleLiveAction(sq.id, acao.id, 1); }} className={`bg-gray-800 text-gray-400 w-7 h-7 rounded flex items-center justify-center font-bold transition ${isActionDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-900/50'}`}>+</button>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {noBanco.length > 0 && (
              <div>
                <h3 className="text-xl font-black text-orange-400 mb-4 border-b border-gray-800 pb-2 flex justify-between mt-8">
                  <span>🪑 No Banco (Reservas/Substituídos)</span>
                  <span className="text-sm bg-orange-900/30 text-orange-300 px-3 py-1 rounded-full">{noBanco.length} Atletas</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-80">
                  {noBanco.map(sq => {
                    const player = players.find(p => p.id === sq.id);
                    const isExpanded = expandedLivePlayers.includes(sq.id);
                    const playerAcoes = (player.setor === 'GOLEIRO (GK)' ? ACOES_GOLEIRO : ACOES_LINHA).filter(a => a.id !== 'partidas');
                    const categoriasAgrupadas = groupActionsByCategory(playerAcoes);

                    return (
                      <div key={sq.id} className="bg-gray-900/80 rounded-xl border border-gray-800/50 shadow relative overflow-hidden h-fit transition-all">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gray-600"></div>
                        
                        <div className="p-3 cursor-pointer hover:bg-gray-800/50 flex justify-between items-center transition" onClick={() => toggleLivePlayer(sq.id)}>
                          <div className="pl-2">
                            <h4 className="text-base font-bold leading-tight flex items-center gap-2 text-gray-400">
                              <span className="bg-gray-900 text-gray-500 px-1.5 py-0.5 rounded font-mono text-xs border border-gray-800">{sq.numero ? sq.numero : '?'}</span> 
                              {player.nome}
                            </h4>
                            <p className="text-xs text-orange-500/70 mt-1">{player.setor}</p>
                          </div>
                          <div className="text-gray-600 text-xs font-bold">
                            {isExpanded ? 'Ocultar ▲' : 'Ações ▼'}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-3 border-t border-gray-800/50 bg-gray-900/30">
                            <p className="text-[10px] text-orange-500 font-bold mb-3 text-center bg-orange-950/20 p-1 rounded">🚫 Ações bloqueadas enquanto estiver no banco.</p>
                            
                            <div className="space-y-2 opacity-60">
                              {Object.keys(categoriasAgrupadas).map(catName => {
                                const isCatExpanded = expandedCategories[`${sq.id}-${catName}`];
                                const totalCatActions = categoriasAgrupadas[catName].reduce((sum, acao) => {
                                  if (acao.id === 'minutos') return sum;
                                  return sum + (parseInt(matchStats[sq.id]?.[acao.id]) || 0);
                                }, 0);

                                return (
                                  <div key={catName} className="bg-gray-950/40 rounded-lg border border-gray-800/50 overflow-hidden">
                                    <button 
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); toggleCategory(sq.id, catName); }}
                                      className="w-full p-2 flex justify-between items-center bg-gray-950 hover:bg-gray-800/40 transition text-left"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest">{catName}</span>
                                        {totalCatActions > 0 && (
                                          <span className="bg-gray-800 text-gray-300 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full">
                                            {totalCatActions}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-gray-600 text-[10px] font-bold">
                                        {isCatExpanded ? '▲' : '▼'}
                                      </span>
                                    </button>

                                    {isCatExpanded && (
                                      <div className="p-2 border-t border-gray-800/50 grid grid-cols-1 gap-1.5">
                                        {categoriasAgrupadas[catName].map(acao => (
                                          <div key={acao.id} className="flex justify-between items-center bg-gray-950 px-2 py-1.5 rounded border border-gray-800/50">
                                            <span className="text-xs text-gray-500 truncate pr-2">{acao.nome}</span>
                                            {acao.id === 'minutos' ? (
                                              <input type="number" min="0" placeholder="0" disabled={true} value={matchStats[sq.id]?.[acao.id] === '' ? '' : (matchStats[sq.id]?.[acao.id] || 0)} className="w-16 p-1 text-center bg-gray-800 text-gray-500 font-bold text-sm rounded border border-gray-700 outline-none cursor-not-allowed" />
                                            ) : (
                                              <div className="flex space-x-1 items-center">
                                                <button disabled={true} className="bg-gray-900 text-gray-600 w-7 h-7 rounded flex items-center justify-center font-bold cursor-not-allowed">-</button>
                                                <span className="font-mono w-6 text-center text-gray-500 font-bold text-sm">{matchStats[sq.id]?.[acao.id] || 0}</span>
                                                <button disabled={true} className="bg-gray-900 text-gray-600 w-7 h-7 rounded flex items-center justify-center font-bold cursor-not-allowed">+</button>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
      {videoPlayerHost && createPortal(renderVideoPlayer(), videoPlayerHost)}
    </div>
  );
}
