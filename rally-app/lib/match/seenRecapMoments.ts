import storage from '@/lib/storage'

const KEY = 'rally_seen_recap_moments'
const MAX_ENTRIES = 100

let cache: Set<string> | null = null

async function load(): Promise<Set<string>> {
  if (cache) return cache
  try {
    const raw = await storage.getItem(KEY)
    cache = new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    cache = new Set()
  }
  return cache
}

export async function hasSeenRecap(matchId: string): Promise<boolean> {
  const set = await load()
  return set.has(matchId)
}

export async function markRecapSeen(matchId: string): Promise<void> {
  const set = await load()
  if (set.has(matchId)) return
  set.add(matchId)
  const arr = Array.from(set).slice(-MAX_ENTRIES)
  cache = new Set(arr)
  await storage.setItem(KEY, JSON.stringify(arr))
}

// Clear the "seen" flag for a match so a later settle shows the recap again —
// used when a score correction reopens a previously-settled match.
export async function clearRecapSeen(matchId: string): Promise<void> {
  const set = await load()
  if (!set.has(matchId)) return
  set.delete(matchId)
  const arr = Array.from(set)
  cache = new Set(arr)
  await storage.setItem(KEY, JSON.stringify(arr))
}
