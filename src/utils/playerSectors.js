export const getPlayerSectors = player => {
  if (Array.isArray(player?.setores) && player.setores.length) return player.setores;
  return typeof player?.setor === 'string'
    ? player.setor.split(/\s*[|,]\s*/).map(sector => sector.trim()).filter(Boolean)
    : [];
};

export const getPlayerSectorLabel = player => getPlayerSectors(player).join(' • ') || 'Sem setor';

export const getPlayerActions = (player, lineActions, goalkeeperActions) => {
  const sectors = getPlayerSectors(player);
  if (sectors.includes('GOLEIRO (GK)') && sectors.some(sector => sector !== 'GOLEIRO (GK)')) {
    return [...new Map([...lineActions, ...goalkeeperActions].map(action => [action.id, action])).values()];
  }
  return sectors.includes('GOLEIRO (GK)') ? goalkeeperActions : lineActions;
};
