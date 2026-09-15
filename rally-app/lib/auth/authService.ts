import type { Provider, Session } from '@supabase/supabase-js'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import {
  createEmailConfirmedRedirectUrl,
  createOAuthRedirectUrl,
  createPasswordResetRedirectUrl,
} from '@/lib/auth/oauthRedirect'
import {
  clearIosLiveActivityActionAuthContext,
  syncIosLiveActivityActionAuthContext,
} from '@/lib/overlay/iosLiveActivityBridge'
import { rallySupabaseFunctionRegion, rallySupabaseUrl, supabase } from '@/lib/supabase'
import { normalizeUsernameInput } from '@/lib/auth/usernameInput'
import { exchangeOAuthCodeSingleFlight } from '@/lib/auth/oauthCodeExchange'

WebBrowser.maybeCompleteAuthSession()

export type SocialAuthProvider = Extract<Provider, 'google' | 'apple'>

/**
 * Raised when the OAuth browser closes without a success redirect. On Android
 * the deep link can dismiss the browser while /auth/callback completes the
 * sign-in, so the UI treats this as benign (no error alert) — a real cancel
 * simply leaves the user on the sign-in screen.
 */
export class OAuthSignInDismissedError extends Error {
  constructor() {
    super('OAuth sign in was dismissed.')
    this.name = 'OAuthSignInDismissedError'
  }
}

export class DeletedAccountError extends Error {
  readonly code = 'account_deleted'

  constructor() {
    super('บัญชีนี้ถูกลบแล้ว กรุณาสมัครสมาชิกใหม่')
    this.name = 'DeletedAccountError'
  }
}

export function isDeletedAccountError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: unknown; name?: unknown }
  return candidate.code === 'account_deleted' || candidate.name === 'DeletedAccountError'
}

function authErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined
  const status = (error as { status?: unknown }).status
  return typeof status === 'number' ? status : undefined
}

function isInvalidStoredSessionError(error: unknown): boolean {
  const status = authErrorStatus(error)
  if (status === 401 || status === 403) return true
  if (!(error instanceof Error)) return false
  return error.message.includes('Invalid Refresh Token') ||
    error.message.includes('Refresh Token Not Found')
}

async function clearInvalidLocalSession(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
  await clearIosLiveActivityActionAuthContext().catch(() => undefined)
}

export async function ensureAccountActive(session: Session): Promise<Session> {
  const { data, error } = await supabase.rpc('get_own_account_state_v0' as never, {
    p_user_id: session.user.id,
  } as never)

  if (error) throw error
  const row = (Array.isArray(data) ? data[0] : data) as { is_deleted?: boolean | null } | null | undefined
  if (!row || row.is_deleted) {
    await clearInvalidLocalSession()
    throw new DeletedAccountError()
  }

  return session
}

export async function getCurrentSession(): Promise<{ session: Session | null }> {
  const { data, error } = await supabase.auth.getSession().catch(async (sessionError) => {
    if (isInvalidStoredSessionError(sessionError)) {
      await clearInvalidLocalSession()
      return { data: { session: null }, error: null }
    }
    throw sessionError
  })
  if (error) throw error

  const session = data.session
  if (!session) return { session: null }

  const { data: userData, error: userError } = await supabase.auth.getUser(session.access_token)
  if (userError || !userData.user) {
    if (!userError || isInvalidStoredSessionError(userError)) {
      await clearInvalidLocalSession()
      return { session: null }
    }
  }

  return { session: await ensureAccountActive(session) }
}

export function onAuthSessionChange(
  onChange: (session: Session | null, error?: unknown) => void
): { unsubscribe: () => void } {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => {
      if (!session) {
        void syncLiveActivityAuthContext(null).catch(() => undefined)
        onChange(null)
        return
      }

      void ensureAccountActive(session)
        .then((activeSession) => {
          void syncLiveActivityAuthContext(activeSession).catch((error) => {
            console.warn('Failed to sync iOS Live Activity auth context', error)
          })
          onChange(activeSession)
        })
        .catch((error) => {
          if (!isDeletedAccountError(error)) {
            console.warn('Failed to validate auth session account', error)
          }
          onChange(null, error)
        })
    }, 0)
  })

  return subscription
}

export async function signInWithEmail(input: {
  email: string
  password: string
}): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword(input)
  if (error) throw error
  if (!data.session) throw new Error('No active session returned')
  return ensureAccountActive(data.session)
}

export type SignUpOutcome =
  | { kind: 'session'; session: Session }
  | { kind: 'awaiting_confirmation' }
  | { kind: 'already_registered' }

export async function signUpWithEmail(input: {
  email: string
  password: string
  displayName: string
}): Promise<SignUpOutcome> {
  const username = normalizeUsernameInput(input.displayName)
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { display_name: username, handle: username } },
  })
  if (error) throw error
  if (data.session) return { kind: 'session', session: data.session }
  // Supabase returns user with empty identities when the email is already taken
  // (security feature — does not reveal whether email is registered).
  const identities = data.user?.identities
  if (data.user && identities && identities.length === 0) {
    return { kind: 'already_registered' }
  }
  return { kind: 'awaiting_confirmation' }
}

export async function signInWithOAuth(provider: SocialAuthProvider): Promise<Session> {
  const redirectTo = createOAuthRedirectUrl()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  })

  if (error) throw error
  if (!data.url) throw new Error('No OAuth URL returned')

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)

  // The deep-link route at /auth/callback may have already exchanged the code
  // (Android Expo Go can't intercept exp:// in WebBrowser). If a session is now
  // active, treat as success regardless of WebBrowser's resolved type.
  const existing = await supabase.auth.getSession()
  if (existing.data.session) return ensureAccountActive(existing.data.session)

  if (result.type !== 'success') throw new OAuthSignInDismissedError()

  const { queryParams } = Linking.parse(result.url)
  const code = queryParams?.code
  if (typeof code !== 'string') throw new Error('No auth code returned')

  return ensureAccountActive(await exchangeOAuthCodeSingleFlight(code))
}

export async function exchangeOAuthCode(code: string): Promise<Session> {
  return ensureAccountActive(await exchangeOAuthCodeSingleFlight(code))
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: createPasswordResetRedirectUrl(),
  })
  if (error) throw error
}

export async function sendEmailChangeConfirmation(email: string): Promise<void> {
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: createEmailConfirmedRedirectUrl() }
  )
  if (error) throw error
}

export async function exchangeAuthCodeForSession(code: string): Promise<Session> {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) throw error
  if (!data.session) throw new Error('No active session returned')
  return ensureAccountActive(data.session)
}

export async function setRecoverySessionFromTokens(input: {
  accessToken: string
  refreshToken: string
}): Promise<Session> {
  const { data, error } = await supabase.auth.setSession({
    access_token: input.accessToken,
    refresh_token: input.refreshToken,
  })
  if (error) throw error
  if (!data.session) throw new Error('No active session returned')
  return ensureAccountActive(data.session)
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
  // Revoke any other active sessions — password reset implies the prior credential
  // may be compromised, so other devices/tokens should be forced to re-auth.
  await supabase.auth.signOut({ scope: 'others' }).catch((signOutError) => {
    console.warn('Failed to revoke other sessions after password update', signOutError)
  })
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  await clearIosLiveActivityActionAuthContext().catch(() => undefined)
}

async function syncLiveActivityAuthContext(session: Session | null): Promise<void> {
  if (!session?.access_token) {
    await clearIosLiveActivityActionAuthContext()
    return
  }

  await syncIosLiveActivityActionAuthContext({
    supabaseUrl: rallySupabaseUrl,
    functionRegion: rallySupabaseFunctionRegion ?? null,
    accessToken: session.access_token,
    expiresAt: session.expires_at ?? null,
  })
}
