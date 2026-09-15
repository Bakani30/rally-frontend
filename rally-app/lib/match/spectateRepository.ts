import { supabase } from '@/lib/supabase'

export type SpectatableMatch = {
  matchId: string
  activityType: string
  teamSizePerSide: number
  startedAt: string | null
  side0Score: number
  side1Score: number
  hostName: string | null
  hostAvatar: string | null
}

export type LiveScoreboardPlayer = {
  side: number
  displayName: string | null
  avatarUrl: string | null
  jerseyNumber: number | null
}

export type LiveScoreboard = {
  matchId: string
  status: string
  startedAt: string | null
  activityType: string
  teamSizePerSide: number
  side0Score: number
  side1Score: number
  players: LiveScoreboardPlayer[]
}

export async function listSpectatableLiveMatchesRecord(): Promise<SpectatableMatch[]> {
  const { data, error } = await supabase.rpc('list_spectatable_live_matches')
  if (error) throw error
  return (data ?? []) as SpectatableMatch[]
}

export async function getLiveScoreboardRecord(matchId: string): Promise<LiveScoreboard> {
  const { data, error } = await supabase.rpc('get_live_scoreboard', { p_match_id: matchId })
  if (error) throw error
  return data as LiveScoreboard
}

export async function setMatchSpectatorsRecord(matchId: string, allow: boolean): Promise<boolean> {
  const { data, error } = await supabase.rpc('set_match_spectators', { p_match_id: matchId, p_allow: allow })
  if (error) throw error
  return data as boolean
}
