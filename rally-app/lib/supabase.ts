import { createClient, type FunctionRegion } from '@supabase/supabase-js'
import { type Database } from '@rally/db-types'
import storage from './storage'

export const rallySupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
export const rallySupabaseFunctionRegion = process.env.EXPO_PUBLIC_SUPABASE_FUNCTION_REGION as
  | FunctionRegion
  | undefined
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(rallySupabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
  global: {
    fetch: fetchWithFunctionRegion,
  },
})

function fetchWithFunctionRegion(input: RequestInfo | URL, init?: RequestInit) {
  if (!rallySupabaseFunctionRegion || !isFunctionRequest(input)) {
    return fetch(input, init)
  }

  const headers = new Headers(init?.headers)
  headers.set('x-region', rallySupabaseFunctionRegion)

  return fetch(input, { ...init, headers })
}

function isFunctionRequest(input: RequestInfo | URL) {
  const url = typeof input === 'string' || input instanceof URL ? input.toString() : input.url
  return url.includes('/functions/v1/')
}
