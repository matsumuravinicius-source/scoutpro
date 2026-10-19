import React from 'react';

export const CORES_ACAO_CAMPO = {
  finalizacoes_erradas: '#ef4444',
  finalizacoes_certas: '#22c55e',
  gols: '#3b82f6',
  desarmes: '#a78bfa',
  duelos_aereos: '#f472b6',
  bloqueios: '#06b6d4',
  perdas_posse: '#f97316',
  erro_passe: '#e879f9',
  faltas_cometidas: '#facc15',
  adversario_finalizacao: '#eab308',
  adversario_gol: '#f97316'
};

export default function CampoFutebol({ events = [], onSelectPoint, title = 'Mapa de ações' }) {
  const interactive = Boolean(onSelectPoint);

  const handleFieldClick = event => {
    if (!interactive) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(105, (event.clientX - bounds.left) / bounds.width * 105));
    const y = Math.max(0, Math.min(68, (event.clientY - bounds.top) / bounds.height * 68));
    onSelectPoint({ x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) });
  };

  return (
    <div>
      {title && <h3 className="text-sm font-bold text-white mb-2">{title}</h3>}
      <svg viewBox="0 0 105 68" preserveAspectRatio="none" onClick={handleFieldClick} role={interactive ? 'button' : 'img'} aria-label={interactive ? 'Clique no campo para registrar a posição da ação' : 'Mapa do campo com ações registradas'} className={`w-full aspect-[105/68] rounded-lg border border-white/60 bg-emerald-800 ${interactive ? 'cursor-crosshair' : ''}`}>
        <rect x="0.5" y="0.5" width="104" height="67" fill="#166534" stroke="white" strokeWidth="0.5" />
        {/* Marcação tática referencial: funil defensivo entre a baliza e as extremidades da linha de meio-campo. */}
        <polygon points="0,30.3 52.5,0.5 52.5,67.5 0,37.7" fill="#facc15" fillOpacity="0.10" stroke="#fde047" strokeWidth="0.35" strokeDasharray="1.5 1" />
        <polygon points="105,30.3 52.5,0.5 52.5,67.5 105,37.7" fill="#facc15" fillOpacity="0.10" stroke="#fde047" strokeWidth="0.35" strokeDasharray="1.5 1" />
        <line x1="52.5" y1="0.5" x2="52.5" y2="67.5" stroke="white" strokeWidth="0.5" />
        <circle cx="52.5" cy="34" r="9.15" fill="none" stroke="white" strokeWidth="0.5" />
        <circle cx="52.5" cy="34" r="0.45" fill="white" />
        <rect x="0.5" y="13.84" width="16.5" height="40.32" fill="none" stroke="white" strokeWidth="0.5" />
        <rect x="0.5" y="24.84" width="5.5" height="18.32" fill="none" stroke="white" strokeWidth="0.5" />
        <rect x="88" y="13.84" width="16.5" height="40.32" fill="none" stroke="white" strokeWidth="0.5" />
        <rect x="99" y="24.84" width="5.5" height="18.32" fill="none" stroke="white" strokeWidth="0.5" />
        <circle cx="11" cy="34" r="0.4" fill="white" /><circle cx="94" cy="34" r="0.4" fill="white" />
        <path d="M17,27.4 A7.5,7.5 0 0 1 17,40.6" fill="none" stroke="white" strokeWidth="0.5" />
        <path d="M88,27.4 A7.5,7.5 0 0 0 88,40.6" fill="none" stroke="white" strokeWidth="0.5" />
        <path d="M0.5,1.5 Q2.5,1.5 2.5,0.5 M102.5,0.5 Q102.5,1.5 104.5,1.5 M0.5,66.5 Q2.5,66.5 2.5,67.5 M102.5,67.5 Q102.5,66.5 104.5,66.5" fill="none" stroke="white" strokeWidth="0.5" />
        {events.map((point, index) => <g key={point.id || index}>
          <circle cx={point.x} cy={point.y} r="1.35" fill={point.color || CORES_ACAO_CAMPO[point.actionId] || '#fff'} stroke="white" strokeWidth="0.35" />
          {!interactive && <title>{`${point.playerName || 'Adversário'} · ${point.label || point.actionId}`}</title>}
        </g>)}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-300">
        <span className="text-yellow-300">Zona de funil</span>
        <span><i className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />Finalização errada</span>
        <span><i className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />Finalização certa</span>
        <span><i className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1" />Golo</span>
        <span><i className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1" />Finalização adversária</span>
        <span><i className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-1" />Golo adversário</span>
        <span><i className="inline-block w-2 h-2 rounded-full bg-violet-400 mr-1" />Desarme</span>
        <span><i className="inline-block w-2 h-2 rounded-full bg-pink-400 mr-1" />Duelo aéreo</span>
        <span><i className="inline-block w-2 h-2 rounded-full bg-cyan-500 mr-1" />Bloqueio</span>
        <span><i className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-1" />Perda de posse</span>
        <span><i className="inline-block w-2 h-2 rounded-full bg-fuchsia-400 mr-1" />Erro de passe</span>
        <span><i className="inline-block w-2 h-2 rounded-full bg-yellow-300 mr-1" />Falta cometida</span>
      </div>
      {interactive && <p className="text-xs text-gray-400 mt-2">Clique no campo para registrar a posição. A zona amarela tracejada representa o funil defensivo.</p>}
    </div>
  );
}
