export type TeamRunPhase = 'ready' | 'running' | 'paused'

export type TeamRunLocation = {
  userId: string
  lat: number
  lng: number
  accuracy: number
  timestamp: number
  phase: TeamRunPhase
  distanceMeters?: number
  paceSecondsPerKm?: number
}
