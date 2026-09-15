import type { UsernamePrice } from '@/types/username'

/**
 * Mirror of the SQL pricing table in change_username().
 * Keep in sync with migration 20260427150000_username_change_quota.sql.
 */
export function priceForNextChange(params: {
  usernameSetAt: string | null
  changesUsed: number
}): UsernamePrice {
  if (params.usernameSetAt === null) return 'free'
  if (params.changesUsed === 0) return 'free'
  if (params.changesUsed === 1) return 500
  if (params.changesUsed === 2) return 1000
  return 2000
}

export function isInitialClaim(usernameSetAt: string | null): boolean {
  return usernameSetAt === null
}
