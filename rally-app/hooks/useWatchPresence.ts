import { useEffect, useState } from 'react'
import * as Crypto from 'expo-crypto'
import { supabase } from '@/lib/supabase'

// Approximate live-viewer count for a match's watch screen via a Supabase
// Realtime presence channel. Deliberately separate from the `match:{id}`
// broadcast/postgres_changes topic in useMatch.ts — this channel carries no
// authoritative data, only presence heartbeats keyed by a random per-mount
// id, so a spoofed or duplicate join only inflates a cosmetic number. Never
// use this count for anything but display.
function watchPresenceTopic(matchId: string): string {
  return `watch:${matchId}`
}

// Remove stale channels for the same topic before subscribing a fresh one —
// mirrors useMatch.ts's dedup so a rapid remount (React effect double-invoke)
// cannot leave two channel objects racing to subscribe to the same room.
function removeStaleChannels(topic: string) {
  supabase
    .getChannels()
    .filter((ch) => ch.topic === `realtime:${topic}`)
    .forEach((ch) => void supabase.removeChannel(ch))
}

/**
 * Subscribes to the watch presence channel and counts distinct joined
 * clients (self included, since a participant watching their own scoreboard
 * counts as a viewer for this v1 approximate figure). Returns null until the
 * first presence `sync` event so callers can distinguish "not yet known"
 * from "confirmed zero".
 */
export function useWatchPresenceCount(matchId: string | undefined, enabled: boolean): number | null {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    setCount(null)
    if (!matchId || !enabled) return

    const topic = watchPresenceTopic(matchId)
    removeStaleChannels(topic)

    const channel = supabase
      .channel(topic, { config: { presence: { key: Crypto.randomUUID() } } })
      .on('presence', { event: 'sync' }, () => {
        setCount(Object.keys(channel.presenceState()).length)
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [matchId, enabled])

  return count
}

/**
 * Tracks this device as a viewer on the watch presence channel so
 * `useWatchPresenceCount` elsewhere sees it. Self-only — never reads
 * presence state back.
 */
export function useJoinWatchPresence(matchId: string | undefined, enabled: boolean): void {
  useEffect(() => {
    if (!matchId || !enabled) return

    const topic = watchPresenceTopic(matchId)
    removeStaleChannels(topic)

    let disposed = false
    const channel = supabase.channel(topic, { config: { presence: { key: Crypto.randomUUID() } } })
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED' && !disposed) void channel.track({})
    })

    return () => {
      disposed = true
      void supabase.removeChannel(channel)
    }
  }, [matchId, enabled])
}
