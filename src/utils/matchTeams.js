export const getLiveTeamStats = (meta, teamName) => {
  const side = meta?.equipes?.indexOf(teamName);
  const originalTeam = side === 0 ? meta.homeTeam : side === 1 ? meta.awayTeam : teamName;
  return meta?.teamStats?.[teamName] || meta?.teamStats?.[originalTeam] || {};
};

export const getTeamGoalsConceded = (meta, teamName) => {
  const homeTeam = meta?.homeTeam;
  const awayTeam = meta?.awayTeam;
  const teamStats = meta?.teamStats;

  if (homeTeam && awayTeam && homeTeam !== awayTeam && teamStats && typeof teamStats === 'object') {
    const side = teamName === homeTeam ? 0 : teamName === awayTeam ? 1 : meta.equipes?.indexOf(teamName);
    if (side !== 0 && side !== 1) return 0;
    const opponent = side === 0 ? awayTeam : homeTeam;
    return Number(teamStats[opponent]?.gols) || 0;
  }

  return Number(meta?.gols_sofridos) || 0;
};
