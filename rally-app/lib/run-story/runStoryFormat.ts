export function formatStoryDistance(meters: number | null | undefined): string {
  if (meters == null || meters <= 0) return '--'
  return `${(meters / 1000).toFixed(2)} km`
}

export function formatStoryDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return '--'
  const rounded = Math.round(seconds)
  const h = Math.floor(rounded / 3600)
  const m = Math.floor((rounded % 3600) / 60)
  const s = rounded % 60
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`
  return `${m}:${pad2(s)}`
}

export function formatStoryPace(secondsPerKm: number | null | undefined): string {
  if (secondsPerKm == null || secondsPerKm <= 0) return '--'
  return `${formatStoryDuration(Math.round(secondsPerKm))}/km`
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}
