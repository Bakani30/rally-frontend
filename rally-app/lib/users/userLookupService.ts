import { searchUsersByQuery } from './userSearchRepository'

export type UserLookupRow = {
  id: string
  handle: string | null
  display_name: string | null
}

const HANDLE_RE = /^[a-z0-9_]{3,20}$/

export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase()
}

export function formatHandle(raw: string): string {
  return `@${normalizeHandle(raw)}`
}

export function validateHandleFormat(raw: string): string | null {
  const h = normalizeHandle(raw)
  if (!h) return 'Enter a handle'
  if (!HANDLE_RE.test(h)) return 'Handle must be 3–20 chars (a–z, 0–9, _)'
  return null
}

export async function resolveUserByHandle(raw: string): Promise<UserLookupRow> {
  const formatError = validateHandleFormat(raw)
  if (formatError) throw new Error(formatError)
  const h = normalizeHandle(raw)
  const users = await searchUsersByQuery(h, 20)
  const user = users.find((candidate) => candidate.handle?.toLowerCase() === h)
  if (!user) throw new Error(`No Rally user: @${h}`)
  return {
    id: user.id,
    handle: user.handle,
    display_name: user.display_name || null,
  }
}

export async function resolveUserIdByHandle(raw: string): Promise<string> {
  const user = await resolveUserByHandle(raw)
  return user.id
}
