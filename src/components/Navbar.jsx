import React from 'react';
import { supabase } from '../supabaseClient';

export default function Navbar({ session, activeTab, setActiveTab }) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const tabs = [
    { id: 'scout', label: 'Base de Dados' }, 
    { id: 'clubes', label: 'Clubes' }, 
    { id: 'live', label: '🔴 Modo Jogo' }, 
    { id: 'historico', label: 'Histórico' }, 
    { id: 'leaderboard', label: 'Ranking' }, 
    { id: 'analise', label: 'Análise Avançada' }, 
    { id: 'comparativo', label: 'Comparativo' }
  ];

  return (
    <nav className="bg-gray-900 border-b border-gray-800 p-4 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-black text-blue-500 tracking-tighter">SCOUT<span className="text-white">PRO</span></h1>
        <div className="flex flex-wrap justify-center gap-2">
          {tabs.map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={`px-3 py-2 rounded font-bold transition text-sm ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 border-t lg:border-t-0 lg:border-l border-gray-800 pt-4 lg:pt-0 lg:pl-4">
          <span className="text-sm text-gray-400 truncate max-w-[150px]">{session?.user?.email}</span>
          <button onClick={handleLogout} className="px-4 py-2 bg-red-900/40 text-red-400 hover:bg-red-900/60 rounded text-sm font-bold border border-red-900/50 transition">Sair</button>
        </div>
      </div>
    </nav>
  );
}