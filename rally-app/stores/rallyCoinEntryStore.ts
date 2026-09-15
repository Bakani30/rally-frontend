import { create } from 'zustand'
import type { RallyCoinEntry } from '@/lib/rally-coin/rallyCoinEntry'

type PendingRallyCoinEntry = RallyCoinEntry & {
  createdAt: number
}

type RallyCoinEntryStore = {
  pendingEntry: PendingRallyCoinEntry | null
  setPendingEntry: (entry: RallyCoinEntry) => void
  consumePendingEntry: () => RallyCoinEntry | null
  clearPendingEntry: () => void
}

const PENDING_ENTRY_TTL_MS = 30 * 60 * 1000

function toFreshEntry(entry: PendingRallyCoinEntry | null): RallyCoinEntry | null {
  if (!entry) return null
  if (Date.now() - entry.createdAt > PENDING_ENTRY_TTL_MS) return null
  return { publicCode: entry.publicCode, source: entry.source }
}

export const useRallyCoinEntryStore = create<RallyCoinEntryStore>((set, get) => ({
  pendingEntry: null,
  setPendingEntry: (entry) => set({ pendingEntry: { ...entry, createdAt: Date.now() } }),
  consumePendingEntry: () => {
    const entry = toFreshEntry(get().pendingEntry)
    set({ pendingEntry: null })
    return entry
  },
  clearPendingEntry: () => set({ pendingEntry: null }),
}))
