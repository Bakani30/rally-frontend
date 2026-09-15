// Shared expo-screen-recorder / expo-sharing / expo-media-library dynamic-import
// loaders. Extracted out of hooks/useReplayVideoShare.ts so the run-story
// video export flow (hooks/useRunStoryVideoExport.ts) can reuse the exact
// same native-module wiring instead of duplicating it — both features record
// on-screen chrome to an mp4 and then save/share it.
//
// expo-screen-recorder (v0.1.8) exposes no separate "request permission" API
// — the OS permission prompt is embedded inside startRecording() itself and
// can't be triggered ahead of time, so callers classify permission denial
// from the startRecording() rejection rather than requesting it upfront.

export type ScreenRecorderModule = {
  startRecording: (micEnabled?: boolean) => Promise<void>
  stopRecording: (fileName?: string) => Promise<string>
}

export type SharingModule = {
  isAvailableAsync: () => Promise<boolean>
  shareAsync: (url: string, options?: { mimeType?: string; dialogTitle?: string }) => Promise<void>
}

export type MediaLibraryModule = {
  requestPermissionsAsync: (writeOnly?: boolean) => Promise<{ granted: boolean }>
  saveToLibraryAsync: (localUri: string) => Promise<void>
}

type FileSystemModule = {
  File: new (...uris: unknown[]) => { exists: boolean; delete: () => void }
}

export const recorderUnavailableError = 'ฟีเจอร์นี้ต้องใช้แอปเวอร์ชัน build ใหม่'
export const nativeShareError =
  'การแชร์วิดีโอต้องใช้ native build ที่มี expo-sharing, expo-media-library และ react-native-share · build แอปใหม่แล้วเปิด Rally อีกครั้ง'

export const loadScreenRecorder = async (): Promise<ScreenRecorderModule> => {
  try {
    // Keep the native dependency lazy, but avoid Metro creating a split-bundle
    // URL for this hoisted workspace package.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-screen-recorder') as Partial<ScreenRecorderModule>
    if (typeof mod.startRecording === 'function' && typeof mod.stopRecording === 'function') {
      return mod as ScreenRecorderModule
    }
  } catch (error) {
    if (__DEV__) console.error('[screen-recorder] Failed to load native module', error)
    // Let the caller show a user-facing error instead of crashing.
  }
  throw new Error(recorderUnavailableError)
}

export const loadSharing = async (): Promise<SharingModule> => {
  try {
    const sharing = await import('expo-sharing') as SharingModule
    if (typeof sharing.isAvailableAsync === 'function' && typeof sharing.shareAsync === 'function') {
      return sharing
    }
  } catch {
    // Let the caller show a user-facing error instead of crashing.
  }
  throw new Error(nativeShareError)
}

export const loadMediaLibrary = async (): Promise<MediaLibraryModule> => {
  try {
    const mediaLibrary = await import('expo-media-library') as MediaLibraryModule
    if (
      typeof mediaLibrary.requestPermissionsAsync === 'function' &&
      typeof mediaLibrary.saveToLibraryAsync === 'function'
    ) {
      return mediaLibrary
    }
  } catch {
    // Let the caller show a user-facing error instead of crashing.
  }
  throw new Error(nativeShareError)
}

/** Best-effort delete of a recorded video left in cache — never throws. */
export const deleteVideoFile = async (uri: string) => {
  try {
    const fileSystem = await import('expo-file-system') as unknown as FileSystemModule
    const file = new fileSystem.File(uri)
    if (file.exists) file.delete()
  } catch {
    // Cache cleanup is opportunistic; the OS reclaims cache eventually anyway.
  }
}

// native/permission error เป็นอังกฤษ/technical — แสดงต่อผู้ใช้เฉพาะถ้าเป็นไทยอยู่แล้ว ที่เหลือใช้ fallback ไทย
export function readableRecorderError(err: unknown, fallback: string): string {
  return err instanceof Error && /[ก-๙]/.test(err.message) ? err.message : fallback
}
