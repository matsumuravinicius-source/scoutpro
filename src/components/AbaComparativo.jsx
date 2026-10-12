import React from 'react';

export default function AbaComparativo({
  filterYearA, setFilterYearA, uniqueMatchYears, filterTeamA, setFilterTeamA, teams, filterCategoryA, setFilterCategoryA, uniqueCategories, filterSectorA, setFilterSectorA, SETORES, compareA, setCompareA, filteredPlayersA,
  filterYearB, setFilterYearB, filterTeamB, setFilterTeamB, filterCategoryB, setFilterCategoryB, filterSectorB, setFilterSectorB, compareB, setCompareB, filteredPlayersB,
  TODAS_ACOES, players, getComputedStats
}) {
  return (
    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
      <h2 className="text-2xl font-bold mb-6">Frente a Frente Global</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="space-y-3 bg-gray-950 p-5 rounded-xl border border-gray-800 shadow-inner">
          <h3 className="font-bold text-blue-400 text-lg border-b border-gray-800 pb-2">Seleção do Atleta A</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <select value={filterYearA} onChange={e => setFilterYearA(e.target.value)} className="p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none">
              <option value="">Todos os Anos</option>{uniqueMatchYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={filterTeamA} onChange={e => setFilterTeamA(e.target.value)} className="p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none">
              <option value="">Todos os Clubes</option>{teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterCategoryA} onChange={e => setFilterCategoryA(e.target.value)} className="p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none">
              <option value="">Todas as Categorias</option>{uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterSectorA} onChange={e => setFilterSectorA(e.target.value)} className="p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none">
              <option value="">Todos os Setores</option>{Object.keys(SETORES).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <select value={compareA} onChange={e => setCompareA(e.target.value)} className="w-full p-3 bg-blue-900/20 border border-blue-900/50 text-blue-300 font-bold text-lg rounded-lg outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">Selecione o Atleta A...</option>
            {filteredPlayersA.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.setor || 'S/ Setor'})</option>)}
          </select>
        </div>

        <div className="space-y-3 bg-gray-950 p-5 rounded-xl border border-gray-800 shadow-inner">
          <h3 className="font-bold text-orange-400 text-lg border-b border-gray-800 pb-2">Seleção do Atleta B</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <select value={filterYearB} onChange={e => setFilterYearB(e.target.value)} className="p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none">
              <option value="">Todos os Anos</option>{uniqueMatchYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={filterTeamB} onChange={e => setFilterTeamB(e.target.value)} className="p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none">
              <option value="">Todos os Clubes</option>{teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterCategoryB} onChange={e => setFilterCategoryB(e.target.value)} className="p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none">
              <option value="">Todas as Categorias</option>{uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterSectorB} onChange={e => setFilterSectorB(e.target.value)} className="p-2 bg-gray-900 rounded border border-gray-700 text-sm outline-none">
              <option value="">Todos os Setores</option>{Object.keys(SETORES).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <select value={compareB} onChange={e => setCompareB(e.target.value)} className="w-full p-3 bg-orange-900/20 border border-orange-900/50 text-orange-300 font-bold text-lg rounded-lg outline-none focus:ring-1 focus:ring-orange-500">
            <option value="">Selecione o Atleta B...</option>
            {filteredPlayersB.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.setor || 'S/ Setor'})</option>)}
          </select>
        </div>
      </div>

      {compareA && compareB && (
        <div className="space-y-6 mt-8">
          {TODAS_ACOES.map(acao => {
            const pA = players.find(p => p.id === compareA); const pB = players.find(p => p.id === compareB);
            
            const statsA = pA ? getComputedStats(pA, filterYearA) : {};
            const statsB = pB ? getComputedStats(pB, filterYearB) : {};
            
            const valA = statsA[acao.id] || 0; 
            const valB = statsB[acao.id] || 0; 
            const max = Math.max(valA, valB, 1);
            if (valA === 0 && valB === 0) return null; 

            return (
              <div key={acao.id} className="relative">
                <div className="flex justify-between text-sm text-gray-400 mb-1 px-1">
                  <span className="font-mono text-blue-400 font-bold text-lg">{valA}</span>
                  <span className="uppercase tracking-widest text-xs font-bold text-gray-300">{acao.nome}</span>
                  <span className="font-mono text-orange-400 font-bold text-lg">{valB}</span>
                </div>
                <div className="flex h-4 bg-gray-950 rounded-full overflow-hidden shadow-inner border border-gray-800">
                  <div className="w-1/2 flex justify-end bg-gray-950 pr-1"><div className="h-full bg-blue-500 rounded-l-full transition-all duration-500" style={{ width: `${(valA / max) * 100}%` }}></div></div>
                  <div className="w-1/2 flex justify-start bg-gray-950 pl-1"><div className="h-full bg-orange-500 rounded-r-full transition-all duration-500" style={{ width: `${(valB / max) * 100}%` }}></div></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}