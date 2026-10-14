import React, { useState } from 'react';

export default function AbaClubes({ teams, players, matchHistory, newTeamName, setNewTeamName, handleAddTeam, uniqueCompetitions, isDateInRange }) {
  const [filterCompetition, setFilterCompetition] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl">
        <h2 className="text-2xl font-bold mb-2">Gestão de Clubes</h2>
        <p className="text-sm text-gray-400 mb-6">Adicione novos clubes ao sistema.</p>
        <form onSubmit={handleAddTeam} className="flex flex-col md:flex-row gap-4">
          <input type="text" placeholder="Nome do Novo Clube" required value={newTeamName} onChange={e => setNewTeamName(e.target.value)} className="flex-1 p-3 bg-gray-950 rounded-lg border border-gray-700 text-sm outline-none focus:border-blue-500" />
          <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition shadow-lg">Adicionar Clube</button>
        </form>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        
        <div className="flex flex-col lg:flex-row justify-end mb-4 gap-4">
           <div className="flex items-center gap-2 bg-gray-950 p-1 rounded border border-gray-700">
             <span className="text-gray-500 text-xs font-bold px-2 uppercase">De:</span>
             <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent outline-none text-sm text-blue-400 font-bold" />
             <span className="text-gray-500 text-xs font-bold px-2 uppercase border-l border-gray-700">Até:</span>
             <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent outline-none text-sm text-blue-400 font-bold" />
           </div>
           <div className="flex items-center gap-2">
             <span className="text-gray-400 font-bold text-sm">🏆 Competição:</span>
             <select value={filterCompetition} onChange={e => setFilterCompetition(e.target.value)} className="p-2 bg-gray-950 rounded-lg border border-gray-700 text-sm outline-none text-blue-400 font-bold">
               <option value="">Todas as Competições</option>
               {uniqueCompetitions?.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-sm">
                <th className="p-3 sticky left-0 bg-gray-900 shadow-[1px_0_0_#1f2937]">Clube</th>
                <th className="p-3 text-center" title="Partidas">Partidas</th>
                <th className="p-3 text-center text-blue-400">Golos</th>
                <th className="p-3 text-center text-red-400">Golos Sofridos</th>
                <th className="p-3 text-center">Assistências</th>
                <th className="p-3 text-center text-green-400">Fin. Certas</th>
                <th className="p-3 text-center text-orange-400">Fin. Erradas</th>
                <th className="p-3 text-center">Desarmes</th>
                <th className="p-3 text-center">Cruzamentos</th>
                <th className="p-3 text-center text-yellow-400">Cartões Amarelos</th>
                <th className="p-3 text-center text-red-500">Cartões Vermelhos</th>
              </tr>
            </thead>
            <tbody>
              {teams.length === 0 ? (
                <tr><td colSpan="11" className="p-6 text-center text-gray-500">Nenhum clube registado.</td></tr>
              ) : (
                teams.map(team => {
                  
                  const teamMatches = matchHistory.filter(m => {
                    if (filterCompetition && m.dados?._meta?.competicao !== filterCompetition) return false;
                    if (!isDateInRange(m.criado_em, startDate, endDate)) return false;
                    return m.dados?._meta?.equipes?.includes(team);
                  });

                  const teamPlayerIds = players.filter(p => p.time_nome === team).map(p => p.id);
                  let tGolos = 0, tAssist = 0, tFinCertas = 0, tFinErradas = 0, tDes = 0, tCruz = 0, tCA = 0, tCV = 0;
                  
                  if (filterCompetition || startDate || endDate) {
                     teamMatches.forEach(m => {
                       Object.keys(m.dados).forEach(pId => {
                         if (pId !== '_meta' && teamPlayerIds.includes(pId)) {
                           const st = m.dados[pId];
                           tGolos += parseInt(st.gols || 0); tAssist += parseInt(st.assistencias || 0);
                           tFinCertas += parseInt(st.finalizacoes_certas || 0); tFinErradas += parseInt(st.finalizacoes_erradas || 0);
                           tDes += parseInt(st.desarmes || 0); tCruz += parseInt(st.cruzamentos || 0);
                           tCA += parseInt(st.cartoes_amarelos || 0); tCV += parseInt(st.cartoes_vermelhos || 0);
                         }
                       });
                     });
                  } else {
                     const teamPlayers = players.filter(p => p.time_nome === team);
                     tGolos = teamPlayers.reduce((sum, p) => sum + (p.acoes.gols || 0), 0);
                     tAssist = teamPlayers.reduce((sum, p) => sum + (p.acoes.assistencias || 0), 0);
                     tFinCertas = teamPlayers.reduce((sum, p) => sum + (p.acoes.finalizacoes_certas || 0), 0);
                     tFinErradas = teamPlayers.reduce((sum, p) => sum + (p.acoes.finalizacoes_erradas || 0), 0);
                     tDes = teamPlayers.reduce((sum, p) => sum + (p.acoes.desarmes || 0), 0);
                     tCruz = teamPlayers.reduce((sum, p) => sum + (p.acoes.cruzamentos || 0), 0);
                     tCA = teamPlayers.reduce((sum, p) => sum + (p.acoes.cartoes_amarelos || 0), 0);
                     tCV = teamPlayers.reduce((sum, p) => sum + (p.acoes.cartoes_vermelhos || 0), 0);
                  }
                  
                  const tPartidas = teamMatches.length;
                  const tSofridos = teamMatches.reduce((sum, m) => sum + (m.dados?._meta?.gols_sofridos || 0), 0);

                  return (
                    <tr key={team} className="border-b border-gray-800/50 hover:bg-gray-800/20 text-sm">
                      <td className="p-3 font-bold sticky left-0 bg-gray-900 shadow-[1px_0_0_#1f2937]">{team}</td>
                      <td className="p-3 text-center font-mono text-gray-300">{tPartidas}</td>
                      <td className="p-3 text-center font-mono text-blue-400 font-bold">{tGolos}</td>
                      <td className="p-3 text-center font-mono text-red-400 font-bold">{tSofridos}</td>
                      <td className="p-3 text-center font-mono text-gray-300">{tAssist}</td>
                      <td className="p-3 text-center font-mono text-green-400">{tFinCertas}</td>
                      <td className="p-3 text-center font-mono text-orange-400">{tFinErradas}</td>
                      <td className="p-3 text-center font-mono text-gray-300">{tDes}</td>
                      <td className="p-3 text-center font-mono text-gray-300">{tCruz}</td>
                      <td className="p-3 text-center font-mono text-yellow-400">{tCA}</td>
                      <td className="p-3 text-center font-mono text-red-500">{tCV}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}