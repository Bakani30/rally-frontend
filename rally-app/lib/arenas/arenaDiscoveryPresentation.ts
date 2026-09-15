import type { ArenaEvent } from '@/types/arena'
import { getArenaEventDestination, type ArenaEventDestination } from './arenaNavigation'

export type ArenaDiscoveryItem = {
  arena: ArenaEvent
  destination: ArenaEventDestination
}

export type ArenaDiscoveryPresentation = {
  current: ArenaDiscoveryItem[]
  legacy: ArenaDiscoveryItem[]
}

export function getArenaDiscoveryPresentation(arenas: ArenaEvent[]): ArenaDiscoveryPresentation {
  const current: ArenaDiscoveryItem[] = []
  const legacy: ArenaDiscoveryItem[] = []

  for (const arena of arenas) {
    const item = { arena, destination: getArenaEventDestination(arena) }
    if (item.destination.kind === 'session') current.push(item)
    else legacy.push(item)
  }

  return { current, legacy }
}
