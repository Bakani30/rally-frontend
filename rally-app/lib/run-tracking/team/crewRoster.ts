/**
 * Pure presenter for the crew roster shown during a multiplayer run. Turns the
 * resolved per-member signals (identity + presence liveness + phase) into the
 * ordered, status-tagged rows the roster sheet renders. Formatting of distance
 * and pace is left to the component; this layer owns ordering and the single
 * status a member reads as.
 */
import type { TeamRunPhase } from './teamRunPresenceTypes'
import type { TeammateLiveness, TeammateView } from './teamRunPresenceState'

export type CrewMemberStatus = 'running' | 'paused' | 'weak'

export type CrewMemberInput = {
  userId: string
  name: string
  initials: string
  relation: 'self' | 'ally' | 'rival'
  distanceMeters: number
  paceSecondsPerKm: number | null
  /** Presence freshness. The self member is always passed 'live'. */
  liveness: Exclude<TeammateLiveness, 'lost'>
  phase: TeamRunPhase
  lastSeenSecondsAgo: number | null
}

export type CrewRosterRow = CrewMemberInput & {
  status: CrewMemberStatus
  /** Distance ahead (+) or behind (−) the local runner, in meters. Self is 0. */
  gapVsSelfMeters: number
}

function deriveStatus(member: CrewMemberInput): CrewMemberStatus {
  if (member.liveness === 'stale') return 'weak'
  if (member.liveness === 'paused' || member.phase === 'paused') return 'paused'
  return 'running'
}

export function buildCrewRoster(members: CrewMemberInput[]): CrewRosterRow[] {
  const selfDistance = members.find((member) => member.relation === 'self')?.distanceMeters ?? 0
  return members
    .map((member) => ({
      ...member,
      status: deriveStatus(member),
      gapVsSelfMeters: member.relation === 'self' ? 0 : member.distanceMeters - selfDistance,
    }))
    .sort((a, b) => {
      if (a.relation === 'self') return b.relation === 'self' ? 0 : -1
      if (b.relation === 'self') return 1
      if (a.distanceMeters !== b.distanceMeters) return b.distanceMeters - a.distanceMeters
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0
    })
}

type CrewProfile = { name: string; initials: string }

/**
 * Joins the local runner and each broadcasting teammate to their profile
 * (name/initials) into the member list the roster renders. Keeps identity
 * resolution and last-seen math out of the screen. Teammate views are already
 * lost-pruned upstream, so a stray 'lost' liveness is coerced to 'stale'.
 */
export function assembleCrewMembers(params: {
  self: {
    userId: string
    distanceMeters: number
    paceSecondsPerKm: number | null
    phase: TeamRunPhase
  }
  teammates: TeammateView[]
  relationForTeammates: 'ally' | 'rival'
  profiles: Record<string, CrewProfile>
  now: number
}): CrewMemberInput[] {
  const { self, teammates, relationForTeammates, profiles, now } = params
  const selfProfile = profiles[self.userId]

  const rows: CrewMemberInput[] = [
    {
      userId: self.userId,
      name: selfProfile?.name ?? 'คุณ',
      initials: selfProfile?.initials ?? 'ME',
      relation: 'self',
      distanceMeters: self.distanceMeters,
      paceSecondsPerKm: self.paceSecondsPerKm,
      liveness: 'live',
      phase: self.phase,
      lastSeenSecondsAgo: 0,
    },
  ]

  for (const view of teammates) {
    const profile = profiles[view.location.userId]
    rows.push({
      userId: view.location.userId,
      name: profile?.name ?? 'เพื่อน',
      initials: profile?.initials ?? '?',
      relation: relationForTeammates,
      distanceMeters: view.location.distanceMeters ?? 0,
      paceSecondsPerKm:
        typeof view.location.paceSecondsPerKm === 'number' ? view.location.paceSecondsPerKm : null,
      liveness: view.liveness === 'lost' ? 'stale' : view.liveness,
      phase: view.location.phase,
      lastSeenSecondsAgo: Math.max(0, Math.round((now - view.location.timestamp) / 1000)),
    })
  }

  return rows
}
