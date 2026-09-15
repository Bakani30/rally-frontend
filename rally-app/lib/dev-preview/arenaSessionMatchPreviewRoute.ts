import { createArenaMatchPreviewState, serializeArenaMatchPreviewRoute } from '@/lib/dev-preview/arenaMatchLifecyclePreview'

export function getArenaSessionMatchPreviewRoute(matchId: string): string | null {
  return serializeArenaMatchPreviewRoute({
    matchId,
    preview: createArenaMatchPreviewState('ready_to_submit', 'a', { sideA: 0, sideB: 0 }),
    captain: 'a',
  })
}
