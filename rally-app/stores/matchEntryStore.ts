import { create } from 'zustand'
import type { MatchEntry } from '@/lib/match/matchEntry'

type PendingMatchEntry = MatchEntry & {
  createdAt: number
}

type MatchEntryStore = {
  pendingEntry: PendingMatchEntry | null
  setPendingEntry: (entry: MatchEntry) => void
  consumePendingEntry: () => MatchEntry | null
  clearPendingEntry: () => void
}

const PENDING_ENTRY_TTL_MS = 30 * 60 * 1000

function toFreshEntry(entry: PendingMatchEntry | null): MatchEntry | null {
  if (!entry) return null
  if (Date.now() - entry.createdAt > PENDING_ENTRY_TTL_MS) return null
  return { code: entry.code, source: entry.source }
}

export const useMatchEntryStore = create<MatchEntryStore>((set, get) => ({
  pendingEntry: null,
  setPendingEntry: (entry) => set({ pendingEntry: { ...entry, createdAt: Date.now() } }),
  consumePendingEntry: () => {
    const entry = toFreshEntry(get().pendingEntry)
    set({ pendingEntry: null })
    return entry
  },
  clearPendingEntry: () => set({ pendingEntry: null }),
}))
