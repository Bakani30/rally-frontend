import { useQuery } from '@tanstack/react-query'
import { resolveCosmeticCatalogByCode } from '@/lib/cosmetics/cosmeticService'
import { RANK_FRAME_CODE_BY_TIER } from '@/lib/ranks/rankAssets'

const RANK_FRAME_CODES = Object.values(RANK_FRAME_CODE_BY_TIER)

// Resolves the 7 `rank_frame_<tier>` catalog rows (id + display fields) once.
// Rank frames have no per-user ownership rows, so the Locker's rank-frame
// picker needs this catalog lookup to get a real `cosmetics.id` to equip.
export function useRankFrameCatalog() {
  return useQuery({
    queryKey: ['cosmetics', 'rank-frame-catalog'],
    queryFn: () => resolveCosmeticCatalogByCode(RANK_FRAME_CODES),
    staleTime: Infinity,
  })
}
