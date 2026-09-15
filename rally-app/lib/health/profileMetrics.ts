/**
 * Pure body-metric math shared by run and team-sport recaps.
 * Display-only: nothing here may feed points, stakes, or settlement.
 */
export type BiologicalSex = 'male' | 'female' | 'other' | 'prefer_not_to_say'
export type HrSample = { timestampMs: number; bpm: number }
export type HrZoneSeconds = [number, number, number, number, number]
export type IntensityLevel = 'เบา' | 'กำลังดี' | 'หนักกำลังดี' | 'หนักมาก'

const ZONE_BOUNDS = [0.6, 0.7, 0.8, 0.9] as const
const MAX_SAMPLE_GAP_SECONDS = 30

export function ageFromBirthDate(birthDate: string | null, now: Date): number | null {
  if (!birthDate) return null
  const born = new Date(`${birthDate}T00:00:00Z`)
  if (Number.isNaN(born.getTime())) return null
  let age = now.getUTCFullYear() - born.getUTCFullYear()
  const beforeBirthday =
    now.getUTCMonth() < born.getUTCMonth() ||
    (now.getUTCMonth() === born.getUTCMonth() && now.getUTCDate() < born.getUTCDate())
  if (beforeBirthday) age -= 1
  return age >= 0 && age <= 120 ? age : null
}

export function tanakaMaxHr(ageYears: number): number {
  return 208 - 0.7 * ageYears
}

export function hrZoneIndex(bpm: number, maxHr: number): 0 | 1 | 2 | 3 | 4 {
  const pct = bpm / maxHr
  if (pct < ZONE_BOUNDS[0]) return 0
  if (pct < ZONE_BOUNDS[1]) return 1
  if (pct < ZONE_BOUNDS[2]) return 2
  if (pct < ZONE_BOUNDS[3]) return 3
  return 4
}

export function hrZoneSeconds(samples: HrSample[], maxHr: number): HrZoneSeconds {
  const zones: HrZoneSeconds = [0, 0, 0, 0, 0]
  if (maxHr <= 0) return zones
  const sorted = [...samples].sort((a, b) => a.timestampMs - b.timestampMs)
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const gap = Math.min((sorted[i + 1].timestampMs - sorted[i].timestampMs) / 1000, MAX_SAMPLE_GAP_SECONDS)
    if (gap <= 0) continue
    zones[hrZoneIndex(sorted[i].bpm, maxHr)] += gap
  }
  return zones.map((s) => Math.round(s)) as HrZoneSeconds
}

// Weighted time-in-zone, Z1..Z5 = 1..5, scaled so all-Z5 = 100.
export function intensityScore(zones: HrZoneSeconds): number {
  const total = zones.reduce((a, b) => a + b, 0)
  if (total <= 0) return 0
  const weighted = zones.reduce((acc, s, i) => acc + s * (i + 1), 0)
  return Math.round((weighted / total) * 20)
}

export function intensityLevel(score: number): IntensityLevel {
  if (score < 30) return 'เบา'
  if (score < 55) return 'กำลังดี'
  if (score <= 80) return 'หนักกำลังดี'
  return 'หนักมาก'
}

// Keytel et al. 2005 — kcal/min from HR, weight, age, sex.
export function keytelCaloriesKcal(p: {
  sex: BiologicalSex
  ageYears: number
  weightKg: number
  avgBpm: number
  durationMinutes: number
}): number {
  const male = (-55.0969 + 0.6309 * p.avgBpm + 0.1988 * p.weightKg + 0.2017 * p.ageYears) / 4.184
  const female = (-20.4022 + 0.4472 * p.avgBpm - 0.1263 * p.weightKg + 0.074 * p.ageYears) / 4.184
  const perMinute =
    p.sex === 'male' ? male : p.sex === 'female' ? female : (male + female) / 2
  return Math.max(0, Math.round(perMinute * p.durationMinutes))
}

/**
 * Verbatim mirror of RUNNING_MET_BANDS in
 * supabase/functions/_shared/runningMet.ts (client code cannot import across
 * the supabase/ boundary). Keep the table AND the nearest-neighbor resolution
 * identical to the server — if the server table changes, change this too.
 */
const RUNNING_MET_BANDS: readonly { speedMph: number; met: number }[] = [
  { speedMph: 4.1, met: 6.5 },
  { speedMph: 4.6, met: 7.8 },
  { speedMph: 5.1, met: 8.5 },
  { speedMph: 5.7, met: 9.0 },
  { speedMph: 6.1, met: 9.3 },
  { speedMph: 6.7, met: 10.5 },
  { speedMph: 7.0, met: 11.0 },
  { speedMph: 7.5, met: 11.8 },
  { speedMph: 8.0, met: 12.0 },
  { speedMph: 8.6, met: 12.5 },
  { speedMph: 9.0, met: 13.0 },
  { speedMph: 10.0, met: 14.8 },
  { speedMph: 11.0, met: 16.8 },
  { speedMph: 12.0, met: 18.5 },
  { speedMph: 13.0, met: 19.8 },
] as const

// MET fallback mirrors the #81 server table (nearest-neighbor band by speed).
export function metCaloriesKcal(p: {
  paceSecondsPerKm: number
  weightKg: number
  movingHours: number
}): number {
  if (!Number.isFinite(p.paceSecondsPerKm) || p.paceSecondsPerKm <= 0) return 0
  const speedMph = 3600 / p.paceSecondsPerKm / 1.609344
  const band = RUNNING_MET_BANDS.reduce((nearest, candidate) => (
    Math.abs(candidate.speedMph - speedMph) < Math.abs(nearest.speedMph - speedMph)
      ? candidate
      : nearest
  ), RUNNING_MET_BANDS[0])
  return Math.max(0, Math.round(band.met * p.weightKg * p.movingHours))
}

export function strideMeters(distanceMeters: number | null, steps: number | null): number | null {
  if (!distanceMeters || !steps || steps <= 0) return null
  return distanceMeters / steps
}
