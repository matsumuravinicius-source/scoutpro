import React from 'react';

export default function AbaClubes({ teams, players, matchHistory, newTeamName, setNewTeamName, handleAddTeam }) {
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

      <div className="overflow-x-auto bg-gray-900 rounded-xl border border-gray-800 p-4">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-sm">
              <th className="p-3 sticky left-0 bg-gray-900 shadow-[1px_0_0_#1f2937]">Clube</th>
              <th className="p-3 text-center" title="Partidas">Partidas</th>
              <th className="p-3 text-center text-blue-400">Golos</th>
              <th className="p-3 text-center text-red-400">Golos Sofridos</th>
              <th className="p-3 text-center">Assistências</th>
              <th className="p-3 text-center">Finalizações</th>
              <th className="p-3 text-center">Desarmes</th>
              <th className="p-3 text-center">Cruzamentos</th>
              <th className="p-3 text-center text-yellow-400">Cartões Amarelos</th>
              <th className="p-3 text-center text-red-500">Cartões Vermelhos</th>
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 ? (
              <tr><td colSpan="10" className="p-6 text-center text-gray-500">Nenhum clube registado.</td></tr>
            ) : (
              teams.map(team => {
                const teamPlayers = players.filter(p => p.time_nome === team);
                const teamMatches = matchHistory.filter(m => m.dados._meta?.equipes?.includes(team));
                
                const tGolos = teamPlayers.reduce((sum, p) => sum + (p.acoes.gols || 0), 0);
                const tAssist = teamPlayers.reduce((sum, p) => sum + (p.acoes.assistencias || 0), 0);
                const tFin = teamPlayers.reduce((sum, p) => sum + (p.acoes.finalizacoes || 0), 0);
                const tDes = teamPlayers.reduce((sum, p) => sum + (p.acoes.desarmes || 0), 0);
                const tCruz = teamPlayers.reduce((sum, p) => sum + (p.acoes.cruzamentos || 0), 0);
                const tCA = teamPlayers.reduce((sum, p) => sum + (p.acoes.cartoes_amarelos || 0), 0);
                const tCV = teamPlayers.reduce((sum, p) => sum + (p.acoes.cartoes_vermelhos || 0), 0);
                
                const tPartidas = teamMatches.length;
                const tSofridos = teamMatches.reduce((sum, m) => sum + (m.dados._meta?.gols_sofridos || 0), 0);

                return (
                  <tr key={team} className="border-b border-gray-800/50 hover:bg-gray-800/20 text-sm">
                    <td className="p-3 font-bold sticky left-0 bg-gray-900 shadow-[1px_0_0_#1f2937]">{team}</td>
                    <td className="p-3 text-center font-mono text-gray-300">{tPartidas}</td>
                    <td className="p-3 text-center font-mono text-blue-400 font-bold">{tGolos}</td>
                    <td className="p-3 text-center font-mono text-red-400 font-bold">{tSofridos}</td>
                    <td className="p-3 text-center font-mono text-gray-300">{tAssist}</td>
                    <td className="p-3 text-center font-mono text-gray-300">{tFin}</td>
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
  );
}