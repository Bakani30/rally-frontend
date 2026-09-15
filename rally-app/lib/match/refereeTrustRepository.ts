import { supabase } from '@/lib/supabase'
import type { RefereeSportProfile } from '@/types/match'

export async function getRefereeSportProfileRecord(
  refereeUserId: string,
  activityType: string,
): Promise<RefereeSportProfile | null> {
  if (activityType !== 'basketball' && activityType !== 'badminton') return null

  const { data, error } = await supabase
    .from('referee_sport_profiles')
    .select(`
      user_id, activity_type, level, trust_tier, rating, trust_score,
      completed_matches, referee_verified_matches, clean_matches,
      corrected_matches, disputed_matches, latest_match_id, latest_settled_at,
      created_at, updated_at
    `)
    .eq('user_id', refereeUserId)
    .eq('activity_type', activityType)
    .maybeSingle()

  if (error) {
    if (error.code === '42P01' || error.message.includes('does not exist')) return null
    throw error
  }
  return data as RefereeSportProfile | null
}
