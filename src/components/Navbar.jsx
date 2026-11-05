import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Navbar({ session, activeTab, setActiveTab }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const tabs = [
    { id: 'clubes', label: '🛡️ Clubes' },
    { id: 'scout', label: '🗂️ Base de Dados' },
    { id: 'live', label: '🔴 Live Match' },
    { id: 'historico', label: '📜 Histórico' },
    { id: 'analise', label: '📐 Análise Avançada' },
    { id: 'leaderboard', label: '🏆 Ranking' },
    { id: 'comparativo', label: '⚔️ Comparativo' }
  ];

  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const closeOnEscape = event => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isMenuOpen]);

  return (
    <>
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black bg-gradient-to-r from-blue-500 to-green-400 bg-clip-text text-transparent">
            SCOUTPRO
          </span>
          <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-mono uppercase">
            Analytics
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 hidden xl:inline">{session?.user?.email}</span>
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Abrir menu de navegação"
            aria-expanded={isMenuOpen}
            aria-controls="navigation-drawer"
            className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-xs font-bold text-gray-200 transition hover:border-blue-500 hover:text-white"
          >
            <span className="text-base leading-none">☰</span>
            <span>Menu</span>
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white px-3 py-1.5 rounded-lg border border-red-900/50 transition font-bold"
          >
            Sair
          </button>
        </div>
      </div>
      </header>

      {isMenuOpen && <div className="fixed inset-0 z-[60] print:hidden">
        <button type="button" aria-label="Fechar menu" onClick={() => setIsMenuOpen(false)} className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-[1px]" />
        <aside id="navigation-drawer" role="dialog" aria-modal="true" aria-label="Menu de navegação" className="absolute right-0 top-0 flex h-full w-[min(85vw,340px)] flex-col border-l border-gray-800 bg-gray-950 p-5 shadow-2xl animate-fadeIn">
          <div className="mb-5 flex items-center justify-between border-b border-gray-800 pb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-400">Navegação</p>
              <h2 className="mt-1 text-lg font-black text-white">ScoutPro</h2>
            </div>
            <button type="button" onClick={() => setIsMenuOpen(false)} aria-label="Fechar menu" className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white">✕</button>
          </div>
          <nav className="flex-1 space-y-2 overflow-y-auto" aria-label="Abas principais">
            {tabs.map(tab => <button
              key={tab.id}
              type="button"
              onClick={() => { setActiveTab(tab.id); setIsMenuOpen(false); }}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`w-full rounded-lg border px-4 py-3 text-left text-sm font-bold transition ${activeTab === tab.id
                ? 'border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-950/30'
                : 'border-gray-800 bg-gray-900 text-gray-300 hover:border-gray-600 hover:bg-gray-800 hover:text-white'
              }`}
            >{tab.label}</button>)}
          </nav>
          <p className="mt-5 border-t border-gray-800 pt-4 text-[11px] text-gray-500">{session?.user?.email}</p>
        </aside>
      </div>}
    </>
  );
}
