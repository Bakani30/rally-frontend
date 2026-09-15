import { getArenaMapDetail, getArenaMapSummary, setArenaVenueFavorite } from './arenaMapRepository'
import type { ArenaMapBbox } from '@/types/arenaMap'

export const arenaMapService = {
  getSummary: (bbox: ArenaMapBbox) => getArenaMapSummary(bbox),
  getDetail: (pinId: string) => getArenaMapDetail(pinId),
  setFavorite: (venueId: string, favorite: boolean) => setArenaVenueFavorite(venueId, favorite),
}
