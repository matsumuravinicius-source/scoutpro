import React from 'react';
import { supabase } from '../supabaseClient';

export default function Navbar({ session, activeTab, setActiveTab }) {
  const tabs = [
    { id: 'clubes', label: '🛡️ Clubes' },
    { id: 'scout', label: '🗂️ Base de Dados' },
    { id: 'live', label: '🔴 Live Match' },
    { id: 'historico', label: '📜 Histórico' },
    { id: 'analise', label: '📐 Análise Avançada' },
    { id: 'leaderboard', label: '🏆 Ranking' },
    { id: 'comparativo', label: '⚔️ Comparativo' },
    { id: 'relatorios', label: '📋 Relatórios' } // NOVA ABA AQUI
  ];

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40 print:hidden">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black bg-gradient-to-r from-blue-500 to-green-400 bg-clip-text text-transparent">
            SCOUTPRO
          </span>
          <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-mono uppercase">
            Analytics
          </span>
        </div>

        <nav className="flex flex-wrap justify-center gap-1.5">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === t.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'bg-gray-950 text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 hidden xl:inline">{session?.user?.email}</span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white px-3 py-1.5 rounded-lg border border-red-900/50 transition font-bold"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}