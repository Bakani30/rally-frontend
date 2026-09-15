/**
 * Local type bridge for quest_spots table rows.
 *
 * TODO(types): replace with generated Database type after gen:types includes the table.
 * Tracking: quest_spots is live on staging (xovofmkyzyqjxvmvogsw); types regeneration was
 * deferred to avoid colliding with the active @rally/db-types session.
 */
export interface QuestSpotRow {
  id: string
  name: string
  lat: number
  lng: number
  radius_m: number
  reward_points: number
  dwell_seconds: number
}
