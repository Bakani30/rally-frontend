import { supabase } from '@/lib/supabase'
import type { TeamRunLocation } from './teamRunPresenceTypes'

type TeamRunPresenceChannel = {
  publish: (location: TeamRunLocation) => Promise<void>
  unsubscribe: () => void
}

export type TeamRunPresenceStatus =
  | 'connecting'
  | 'subscribed'
  | 'reconnecting'
  | 'error'
  | 'closed'

type TeamRunPresenceInput = {
  matchId: string
  onLocation: (location: TeamRunLocation) => void
  onStatus?: (status: TeamRunPresenceStatus) => void
}

const TEAM_RUN_TOPIC_PREFIX = 'team-run'

function isTeamRunLocation(value: unknown): value is TeamRunLocation {
  const payload = value as Partial<TeamRunLocation> | null
  return Boolean(
    payload
      && typeof payload.userId === 'string'
      && typeof payload.lat === 'number'
      && typeof payload.lng === 'number'
      && typeof payload.accuracy === 'number'
      && typeof payload.timestamp === 'number'
      && (payload.phase === 'ready' || payload.phase === 'running' || payload.phase === 'paused')
      && (payload.distanceMeters === undefined || typeof payload.distanceMeters === 'number')
      && (payload.paceSecondsPerKm === undefined || typeof payload.paceSecondsPerKm === 'number'),
  )
}

export function createTeamRunPresenceChannel({
  matchId,
  onLocation,
  onStatus,
}: TeamRunPresenceInput): TeamRunPresenceChannel {
  const channel = supabase.channel(`${TEAM_RUN_TOPIC_PREFIX}:${matchId}`, {
    config: {
      // Fire-and-forget position pings: no per-message ack round-trip, so a
      // transient network blip can't stall the 1 Hz publish loop.
      broadcast: { self: false, ack: false },
      private: true,
    },
  })
  let isClosed = false

  channel.on('broadcast', { event: 'location' }, ({ payload }) => {
    if (isTeamRunLocation(payload)) onLocation(payload)
  })

  onStatus?.('connecting')
  void supabase.realtime.setAuth()
    .then(() => {
      if (isClosed) return
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') onStatus?.('subscribed')
        else if (status === 'CHANNEL_ERROR') onStatus?.('error')
        else if (status === 'TIMED_OUT') onStatus?.('reconnecting')
        else if (status === 'CLOSED') onStatus?.('closed')
      })
    })
    .catch(() => {
      if (!isClosed) onStatus?.('error')
    })

  return {
    publish: async (location) => {
      await channel.send({
        type: 'broadcast',
        event: 'location',
        payload: location,
      })
    },
    unsubscribe: () => {
      isClosed = true
      void supabase.removeChannel(channel)
    },
  }
}
