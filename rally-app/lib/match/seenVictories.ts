import storage from '@/lib/storage'

const KEY = 'rally_seen_match_victories'
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

export async function hasSeenVictory(matchId: string): Promise<boolean> {
  const set = await load()
  return set.has(matchId)
}

export async function markVictorySeen(matchId: string): Promise<void> {
  const set = await load()
  if (set.has(matchId)) return
  set.add(matchId)
  const arr = Array.from(set).slice(-MAX_ENTRIES)
  cache = new Set(arr)
  await storage.setItem(KEY, JSON.stringify(arr))
}
