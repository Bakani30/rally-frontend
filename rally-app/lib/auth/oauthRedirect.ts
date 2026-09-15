import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Linking from 'expo-linking'

const OAUTH_CALLBACK_PATH = 'auth/callback'
const NATIVE_OAUTH_REDIRECT_URL = 'rallyapp://auth/callback'

// Expo Go ไม่ honor custom scheme (`rallyapp://`) — deep link กลับแอปไม่ติด
// จึงต้องใช้ exp:// URL ที่ Linking.createURL() generate ให้ตอน dev เท่านั้น
//
// ⚠️ ก่อน publish ขึ้น store / ทำ production build:
//   1. ทดสอบ OAuth ใน dev build (`eas build --profile development`) อีกครั้ง
//      — ของจริงต้อง route ผ่าน `rallyapp://auth/callback`
//   2. ลบ `exp://*` ออกจาก Supabase Redirect URL allow-list
//      (Authentication → URL Configuration) เพื่อกัน redirect ไปหา dev URL หลุด
//   3. เงื่อนไข `isExpoGo` ด้านล่างจะ false เองใน standalone build —
//      ไม่ต้องแก้โค้ดนี้ แต่ต้อง verify ว่า flow ใช้ `rallyapp://` จริง
const isExpoGo = Constants.executionEnvironment === 'storeClient'
const PASSWORD_RESET_PATH = 'reset-password'
const NATIVE_PASSWORD_RESET_REDIRECT_URL = 'rallyapp:///reset-password'
const EMAIL_CONFIRMED_PATH = 'email-confirmed'
const NATIVE_EMAIL_CONFIRMED_REDIRECT_URL = 'rallyapp:///email-confirmed'
const AUTH_REDIRECT_BASE_URL = process.env.EXPO_PUBLIC_AUTH_REDIRECT_BASE_URL?.replace(/\/$/, '')
const AUTH_REDIRECT_STRATEGY = process.env.EXPO_PUBLIC_AUTH_REDIRECT_STRATEGY ?? 'custom-scheme'

function createWebRedirectUrl(path: string): string {
  const httpsUrl = createHttpsRedirectUrl(path)
  if (httpsUrl) return httpsUrl

  return Linking.createURL(path)
}

function createHttpsRedirectUrl(path: string): string | null {
  if (!AUTH_REDIRECT_BASE_URL) return null
  return `${AUTH_REDIRECT_BASE_URL}/${path}`
}

function createNativeRedirectUrl(path: string, fallbackUrl: string): string {
  if (AUTH_REDIRECT_STRATEGY === 'universal-link') {
    return createHttpsRedirectUrl(path) ?? fallbackUrl
  }

  return fallbackUrl
}

export function createOAuthRedirectUrl(): string {
  if (Platform.OS === 'web' || isExpoGo) {
    return Linking.createURL(OAUTH_CALLBACK_PATH)
  }

  return createNativeRedirectUrl(OAUTH_CALLBACK_PATH, NATIVE_OAUTH_REDIRECT_URL)
}

export function createPasswordResetRedirectUrl(): string {
  if (Platform.OS === 'web') {
    return createWebRedirectUrl(PASSWORD_RESET_PATH)
  }
  if (isExpoGo) {
    return Linking.createURL(PASSWORD_RESET_PATH)
  }

  return createNativeRedirectUrl(PASSWORD_RESET_PATH, NATIVE_PASSWORD_RESET_REDIRECT_URL)
}

export function createEmailConfirmedRedirectUrl(): string {
  if (Platform.OS === 'web') {
    return createWebRedirectUrl(EMAIL_CONFIRMED_PATH)
  }
  if (isExpoGo) {
    return Linking.createURL(EMAIL_CONFIRMED_PATH)
  }

  return createNativeRedirectUrl(EMAIL_CONFIRMED_PATH, NATIVE_EMAIL_CONFIRMED_REDIRECT_URL)
}
