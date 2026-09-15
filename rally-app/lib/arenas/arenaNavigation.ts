import type { ArenaEvent } from '@/types/arena'

export type ArenaEventDestination =
  | {
      kind: 'session'
      route: string
      badge: null
      actionLabel: 'ดู Arena Session'
      readOnly: false
    }
  | {
      kind: 'legacy'
      route: string
      badge: 'LEGACY · ดูได้เท่านั้น'
      actionLabel: 'ดูสนามเดิม'
      readOnly: true
    }

export function getArenaEventDestination(
  arena: Pick<ArenaEvent, 'id' | 'session_context'>,
): ArenaEventDestination {
  if (arena.session_context) {
    return {
      kind: 'session',
      route: `/arena-session/${arena.id}`,
      badge: null,
      actionLabel: 'ดู Arena Session',
      readOnly: false,
    }
  }

  return {
    kind: 'legacy',
    route: `/arena/${arena.id}`,
    badge: 'LEGACY · ดูได้เท่านั้น',
    actionLabel: 'ดูสนามเดิม',
    readOnly: true,
  }
}

export function getArenaEventRoute(arena: Pick<ArenaEvent, 'id' | 'session_context'>): string {
  return getArenaEventDestination(arena).route
}
