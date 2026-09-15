import type { MatchHistoryImpact, MatchHistoryImpactRpcRow } from './matchHistoryImpactTypes'
import { fetchMatchHistoryImpactRows } from './matchHistoryImpactRepository'

export const MAX_MATCH_HISTORY_IMPACT_IDS = 100

/** Normalize the one bulk request without changing any server-provided values. */
export function normalizeMatchHistoryImpactIds(
  matchIds: readonly string[] | null | undefined,
): string[] {
  if (!matchIds?.length) return []

  return [...new Set(matchIds.map((matchId) => matchId.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
}

export async function getMatchHistoryImpacts(
  matchIds: readonly string[],
): Promise<Map<string, MatchHistoryImpact>> {
  const normalizedIds = normalizeMatchHistoryImpactIds(matchIds)
  if (normalizedIds.length === 0) return new Map()

  const batches = Array.from(
    { length: Math.ceil(normalizedIds.length / MAX_MATCH_HISTORY_IMPACT_IDS) },
    (_, index) => normalizedIds.slice(
      index * MAX_MATCH_HISTORY_IMPACT_IDS,
      (index + 1) * MAX_MATCH_HISTORY_IMPACT_IDS,
    ),
  )
  const rows = (await Promise.all(
    batches.map((batch) => fetchMatchHistoryImpactRows(batch)),
  )).flat()
  const impactsById = new Map(rows.map((row) => [row.match_id, mapMatchHistoryImpact(row)]))

  // Iterate over the normalized request so Map order is deterministic even if
  // PostgREST returns rows in a different order or omits an inaccessible ID.
  return new Map(
    normalizedIds.flatMap((matchId) => {
      const impact = impactsById.get(matchId)
      return impact ? [[matchId, impact] as const] : []
    }),
  )
}

export function mapMatchHistoryImpact(row: MatchHistoryImpactRpcRow): MatchHistoryImpact {
  return {
    matchId: row.match_id,
    activityType: row.activity_type,
    settledAt: row.settled_at,
    mySide: row.my_side === 1 ? 1 : 0,
    myStakeAmount: row.my_stake_amount,
    myStakeCurrency: parseStakeCurrency(row.my_stake_currency),
    scoreDelta: row.score_delta,
    ratingBefore: row.rating_before,
    ratingAfter: row.rating_after,
    ratingDelta: row.rating_delta,
  }
}

function parseStakeCurrency(value: string | null) {
  return value === 'leaderboard_point' || value === 'credit' ? value : null
}
