import type { Session } from '@supabase/supabase-js'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import { supabase } from '@/lib/supabase'
import { ensureAccountActive } from '@/lib/auth/authService'

/**
 * Raised when the user dismisses the native Apple sheet. The UI treats this as a
 * benign no-op (no error alert), unlike a real sign-in failure.
 */
export class AppleSignInCancelledError extends Error {
  constructor() {
    super('Apple sign in was cancelled.')
    this.name = 'AppleSignInCancelledError'
  }
}

function isAppleCancellation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'ERR_REQUEST_CANCELED'
  )
}

export async function isAppleAuthAvailable(): Promise<boolean> {
  return AppleAuthentication.isAvailableAsync()
}

/**
 * Native Sign in with Apple → Supabase session.
 *
 * A raw nonce is hashed (SHA-256) and handed to Apple; Apple embeds that hash in
 * the identity token. Supabase re-hashes the raw nonce we pass and matches it
 * against the token claim, which prevents identity-token replay.
 */
export async function signInWithApple(): Promise<Session> {
  const rawNonce = Crypto.randomUUID()
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  )

  let credential: AppleAuthentication.AppleAuthenticationCredential
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    })
  } catch (error) {
    if (isAppleCancellation(error)) throw new AppleSignInCancelledError()
    throw error
  }

  if (!credential.identityToken) {
    throw new Error('No identity token returned from Apple')
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  })
  if (error) throw error
  if (!data.session) throw new Error('No active session returned')

  return ensureAccountActive(data.session)
}
