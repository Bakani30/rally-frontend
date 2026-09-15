import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// PKCE auth codes are single-use, but on Android the OAuth deep link is
// delivered both to WebBrowser.openAuthSessionAsync (signInWithOAuth) and to
// the /auth/callback route, so two callers race to exchange the same code.
// The loser used to get a server error and bounce the user back to sign-in.
// Sharing one in-flight promise per code makes both callers see one exchange.
const inFlight = new Map<string, Promise<Session>>()

export function exchangeOAuthCodeSingleFlight(code: string): Promise<Session> {
  const existing = inFlight.get(code)
  if (existing) return existing

  const exchange = (async () => {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw error
    if (!data.session) throw new Error('No active session returned')
    return data.session
  })()

  // Successful exchanges stay cached: the code is spent, so a re-exchange can
  // only fail. Failed exchanges are evicted so a retry is not pinned to the
  // old rejection.
  inFlight.set(code, exchange)
  exchange.catch(() => {
    inFlight.delete(code)
  })
  return exchange
}
