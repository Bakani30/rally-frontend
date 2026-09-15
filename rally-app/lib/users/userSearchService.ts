import { searchUsersByQuery, type UserSearchResult } from './userSearchRepository'

export type { UserSearchResult }

export function searchUsers(query: string, limit?: number): Promise<UserSearchResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 1) return Promise.resolve([])
  return searchUsersByQuery(trimmed, limit)
}
