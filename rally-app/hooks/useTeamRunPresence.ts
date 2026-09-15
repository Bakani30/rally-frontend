import { useEffect, useMemo, useRef, useState } from 'react'
import { AppState } from 'react-native'
import type { GpsPoint } from '@/lib/run-tracking/gps/gpsTypes'
import {
  createTeamRunPresenceChannel,
  type TeamRunPresenceStatus,
} from '@/lib/run-tracking/team/teamRunPresenceRepository'
import {
  applyTeammateLocation,
  buildTeammateViews,
  pruneLostTeammates,
  type TeammatePresenceMap,
} from '@/lib/run-tracking/team/teamRunPresenceState'
import type { TeamRunLocation, TeamRunPhase } from '@/lib/run-tracking/team/teamRunPresenceTypes'

const BROADCAST_INTERVAL_MS = 1000
const HEARTBEAT_INTERVAL_MS = 5000
const PRUNE_INTERVAL_MS = 3000

type UseTeamRunPresenceInput = {
  matchId?: string | null
  userId?: string | null
  location: GpsPoint | { lat: number; lng: number; accuracy?: number | null } | null
  phase: TeamRunPhase
  distanceMeters?: number
  paceSecondsPerKm?: number | null
  enabled: boolean
  /**
   * User ids of accepted, active match participants. When provided, presence
   * payloads from anyone else are dropped (anti-spoof). Omit to accept any
   * authorized sender.
   */
  participantUserIds?: string[]
}

export function useTeamRunPresence({
  matchId,
  userId,
  location,
  phase,
  distanceMeters,
  paceSecondsPerKm,
  enabled,
  participantUserIds,
}: UseTeamRunPresenceInput) {
  const [presenceMap, setPresenceMap] = useState<TeammatePresenceMap>({})
  const [connectionStatus, setConnectionStatus] = useState<TeamRunPresenceStatus>('closed')
  const [now, setNow] = useState(() => Date.now())
  const channelRef = useRef<ReturnType<typeof createTeamRunPresenceChannel> | null>(null)
  const publishRef = useRef<((force?: boolean) => void) | null>(null)
  const lastPublishedAt = useRef(0)
  const locationRef = useRef<UseTeamRunPresenceInput['location']>(null)
  const phaseRef = useRef<TeamRunPhase>(phase)
  const distanceMetersRef = useRef(distanceMeters)
  const paceSecondsPerKmRef = useRef(paceSecondsPerKm)
  const allowedUserIdsRef = useRef<ReadonlySet<string> | undefined>(undefined)

  const allowedUserIdsKey = (participantUserIds ?? []).join(',')
  useEffect(() => {
    allowedUserIdsRef.current = allowedUserIdsKey
      ? new Set(allowedUserIdsKey.split(','))
      : undefined
  }, [allowedUserIdsKey])

  useEffect(() => {
    locationRef.current = location
  }, [location])

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    distanceMetersRef.current = distanceMeters
  }, [distanceMeters])

  useEffect(() => {
    paceSecondsPerKmRef.current = paceSecondsPerKm
  }, [paceSecondsPerKm])

  useEffect(() => {
    if (!matchId || !userId) {
      setPresenceMap({})
      setConnectionStatus('closed')
      return
    }

    const channel = createTeamRunPresenceChannel({
      matchId,
      onStatus: setConnectionStatus,
      onLocation: (incoming) => {
        if (incoming.userId === userId) return
        setPresenceMap((current) =>
          applyTeammateLocation(current, incoming, Date.now(), allowedUserIdsRef.current),
        )
      },
    })
    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      if (channelRef.current === channel) channelRef.current = null
      setPresenceMap({})
      setConnectionStatus('closed')
    }
  }, [matchId, userId])

  useEffect(() => {
    if (!enabled || !userId || !channelRef.current || connectionStatus !== 'subscribed') {
      publishRef.current = null
      return
    }

    const publishLatest = (force = false) => {
      const point = locationRef.current
      const channel = channelRef.current
      if (!point || !channel) return
      const stamp = Date.now()
      if (!force && stamp - lastPublishedAt.current < BROADCAST_INTERVAL_MS) return
      lastPublishedAt.current = stamp
      // Swallow transient send failures: a single dropped broadcast must not
      // tear down the publish loop or flip the whole map offline. The socket's
      // own status callbacks are the source of truth for connection state.
      void channel.publish({
        userId,
        lat: point.lat,
        lng: point.lng,
        accuracy: point.accuracy ?? 999,
        timestamp: stamp,
        phase: phaseRef.current,
        ...(typeof distanceMetersRef.current === 'number'
          ? { distanceMeters: Math.max(0, Math.round(distanceMetersRef.current)) }
          : {}),
        ...(typeof paceSecondsPerKmRef.current === 'number' && paceSecondsPerKmRef.current > 0
          ? { paceSecondsPerKm: Math.round(paceSecondsPerKmRef.current) }
          : {}),
      }).catch(() => {})
    }

    publishRef.current = publishLatest
    publishLatest(true)
    const timer = setInterval(() => {
      publishLatest(Date.now() - lastPublishedAt.current >= HEARTBEAT_INTERVAL_MS)
    }, BROADCAST_INTERVAL_MS)

    return () => {
      clearInterval(timer)
      publishRef.current = null
    }
  }, [connectionStatus, enabled, userId])

  // Backgrounding suspends the JS publish interval, so a runner would go stale
  // to teammates while their run keeps recording natively. Force a fresh
  // broadcast the moment the app returns to the foreground.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') publishRef.current?.(true)
    })
    return () => subscription.remove()
  }, [])

  // Age teammates toward stale/lost only during a match run — a solo run has no
  // presence map, so there is nothing to tick.
  useEffect(() => {
    if (!matchId) return
    const timer = setInterval(() => {
      const ts = Date.now()
      setNow(ts)
      setPresenceMap((current) => pruneLostTeammates(current, ts, allowedUserIdsRef.current))
    }, PRUNE_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [matchId])

  const teammates = useMemo(() => buildTeammateViews(presenceMap, now), [presenceMap, now])
  const teammateLocations = useMemo<TeamRunLocation[]>(
    () => teammates.map((view) => view.location),
    [teammates],
  )

  return {
    teammates,
    teammateLocations,
    liveTeammateCount: teammates.filter((view) => view.liveness === 'live').length,
    connectionStatus,
    lastTeammateSeenAt: teammates.reduce<number | null>(
      (latest, view) =>
        latest == null ? view.location.timestamp : Math.max(latest, view.location.timestamp),
      null,
    ),
  }
}
