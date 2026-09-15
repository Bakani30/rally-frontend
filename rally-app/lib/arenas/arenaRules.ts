import type { ArenaEvent, ArenaReferee, ArenaRound, ArenaTeam } from '@/types/arena'

export const ARENA_SPORT_DEFAULTS = {
  basketball: { targetScore: 11, timeLimitSeconds: 10 * 60, teamSizePerSide: 3 },
  badminton: { targetScore: 21, timeLimitSeconds: 15 * 60, teamSizePerSide: 2 },
} as const

const ACTIVE_ROUND_STATUSES = ['stake_acceptance', 'in_progress', 'result_pending'] as const

export function getArenaTeams(arena: ArenaEvent | undefined | null): ArenaTeam[] {
  return [...(arena?.arena_teams ?? [])]
}

export function getArenaRounds(arena: ArenaEvent | undefined | null): ArenaRound[] {
  return [...(arena?.arena_rounds ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function getActiveArenaRound(arena: ArenaEvent | undefined | null): ArenaRound | null {
  return getArenaRounds(arena).find((round) => ACTIVE_ROUND_STATUSES.some((status) => status === round.status)) ?? null
}

export function getArenaChampion(arena: ArenaEvent | undefined | null): ArenaTeam | null {
  if (!arena?.current_champion_team_id) return null
  return getArenaTeams(arena).find((team) => team.id === arena.current_champion_team_id) ?? null
}

export function getArenaQueue(arena: ArenaEvent | undefined | null): ArenaTeam[] {
  return getArenaTeams(arena)
    .filter((team) => team.status === 'queued')
    .sort((a, b) => (a.queue_position ?? Number.MAX_SAFE_INTEGER) - (b.queue_position ?? Number.MAX_SAFE_INTEGER))
}

export function getArenaStandings(arena: ArenaEvent | undefined | null): ArenaTeam[] {
  return getArenaTeams(arena)
    .filter((team) => team.status !== 'removed')
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      if (b.best_streak !== a.best_streak) return b.best_streak - a.best_streak
      const pointDiffA = a.points_for - a.points_against
      const pointDiffB = b.points_for - b.points_against
      if (pointDiffB !== pointDiffA) return pointDiffB - pointDiffA
      return a.created_at.localeCompare(b.created_at)
    })
}

export function getActiveArenaReferees(arena: ArenaEvent | undefined | null): ArenaReferee[] {
  return [...(arena?.arena_referees ?? [])]
    .filter((referee) => referee.status === 'active')
    .sort((a, b) => {
      if (a.rotation_index !== b.rotation_index) return a.rotation_index - b.rotation_index
      return a.created_at.localeCompare(b.created_at)
    })
}

export function findMyArenaTeam(arena: ArenaEvent | undefined | null, userId: string | undefined | null): ArenaTeam | null {
  if (!userId) return null
  return getArenaTeams(arena).find((team) =>
    team.arena_team_members?.some((member) => member.user_id === userId && member.is_active),
  ) ?? null
}

export function isArenaOrganizer(arena: ArenaEvent | undefined | null, userId: string | undefined | null): boolean {
  return Boolean(arena && userId && arena.created_by === userId)
}

export function isRoundPlayer(round: ArenaRound | undefined | null, team: ArenaTeam | undefined | null): boolean {
  if (!round || !team) return false
  return team.id === round.champion_team_id || team.id === round.challenger_team_id
}

export function isArenaUserInRound(
  arena: ArenaEvent | undefined | null,
  round: ArenaRound | undefined | null,
  userId: string | undefined | null,
): boolean {
  if (!arena || !round || !userId) return false
  return getArenaTeams(arena)
    .filter((team) => team.id === round.champion_team_id || team.id === round.challenger_team_id)
    .some((team) => team.arena_team_members?.some((member) => member.user_id === userId && member.is_active))
}

export function isActiveArenaReferee(arena: ArenaEvent | undefined | null, userId: string | undefined | null): boolean {
  if (!userId) return false
  return getActiveArenaReferees(arena).some((referee) => referee.user_id === userId)
}

export function isAssignedRoundReferee(round: ArenaRound | undefined | null, userId: string | undefined | null): boolean {
  return Boolean(round?.referee_user_id && userId && round.referee_user_id === userId)
}

export function canUserRefereeArenaRound(
  arena: ArenaEvent | undefined | null,
  round: ArenaRound | undefined | null,
  userId: string | undefined | null,
): boolean {
  return isActiveArenaReferee(arena, userId) && !isArenaUserInRound(arena, round, userId)
}

export function canAssignArenaReferee(
  arena: ArenaEvent | undefined | null,
  round: ArenaRound | undefined | null,
  userId: string | undefined | null,
): boolean {
  return Boolean(round && isArenaOrganizer(arena, userId))
}

export function canActAsArenaReferee(
  arena: ArenaEvent | undefined | null,
  round: ArenaRound | undefined | null,
  userId: string | undefined | null,
): boolean {
  if (!arena || !round || !userId || isArenaUserInRound(arena, round, userId)) return false
  return isArenaOrganizer(arena, userId) || isAssignedRoundReferee(round, userId)
}

export function getTeamReadyCount(team: ArenaTeam | undefined | null): { ready: number; total: number } {
  const active = team?.arena_team_members?.filter((member) => member.is_active) ?? []
  return {
    ready: active.filter((member) => member.accepted_at).length,
    total: active.length,
  }
}

export function getRoundStakeForTeam(round: ArenaRound | undefined | null, team: ArenaTeam | undefined | null): number | null {
  if (!round || !team) return null
  if (team.id === round.champion_team_id) return round.champion_stake_per_player
  if (team.id === round.challenger_team_id) return round.challenger_stake_per_player
  return null
}

export function formatArenaTimer(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}:${remainder.toString().padStart(2, '0')}`
}

export function canSubmitArenaScore(championScore: number, challengerScore: number): boolean {
  return championScore >= 0 && challengerScore >= 0 && championScore !== challengerScore
}
