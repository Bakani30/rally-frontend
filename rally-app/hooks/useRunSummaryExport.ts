import { useCallback, useState } from 'react'
import type { View } from 'react-native'

/**
 * Captures a ref'd View and saves it to the device photo library. Mirrors the
 * lazy-import + permission handling used by the run-story share screen
 * (app/run/share/[sessionId].tsx), but skips the Supabase upload/DB
 * write-back that useSaveRunStoryImage does — this is a local-only gallery
 * export, not a stored run-story asset.
 */

export type RunSummaryExportStatus = 'idle' | 'saved' | 'failed'

type CaptureRefOptions = {
  format: 'jpg' | 'png'
  quality: number
  result: 'tmpfile'
}

type CaptureRef = (target: React.RefObject<View | null>, options: CaptureRefOptions) => Promise<string>

type MediaLibraryModule = {
  requestPermissionsAsync: (writeOnly?: boolean) => Promise<{ granted: boolean }>
  saveToLibraryAsync: (localUri: string) => Promise<void>
}

const nativeExportError =
  'การบันทึกรูปต้องใช้ native build ที่มี expo-media-library และ react-native-view-shot · build แอปใหม่แล้วเปิด Rally อีกครั้ง'

const loadCaptureRef = async (): Promise<CaptureRef> => {
  try {
    const viewShot = await import('react-native-view-shot') as { captureRef?: CaptureRef }
    if (typeof viewShot.captureRef === 'function') return viewShot.captureRef
  } catch {
    // Let the caller show a user-facing export error instead of crashing.
  }
  throw new Error(nativeExportError)
}

const loadMediaLibrary = async (): Promise<MediaLibraryModule> => {
  try {
    const mediaLibrary = await import('expo-media-library') as MediaLibraryModule
    if (
      typeof mediaLibrary.requestPermissionsAsync === 'function' &&
      typeof mediaLibrary.saveToLibraryAsync === 'function'
    ) {
      return mediaLibrary
    }
  } catch {
    // Let the caller show a user-facing export error instead of crashing.
  }
  throw new Error(nativeExportError)
}

// native/permission error เป็นอังกฤษ/technical — แสดงต่อผู้ใช้เฉพาะถ้าเป็นไทยอยู่แล้ว ที่เหลือใช้ fallback ไทย
function readableExportError(err: unknown, fallback: string): string {
  return err instanceof Error && /[ก-๙]/.test(err.message) ? err.message : fallback
}

export function useRunSummaryExport() {
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState<RunSummaryExportStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const saveToGallery = useCallback(async (ref: React.RefObject<View | null>): Promise<RunSummaryExportStatus> => {
    if (!ref.current) {
      setStatus('failed')
      setErrorMessage('การ์ดสรุปผลยังไม่พร้อม ลองใหม่อีกครั้ง')
      return 'failed'
    }

    setIsSaving(true)
    setErrorMessage(null)
    try {
      const captureRef = await loadCaptureRef()
      const uri = await captureRef(ref, { format: 'jpg', quality: 0.95, result: 'tmpfile' })

      const mediaLibrary = await loadMediaLibrary()
      const permission = await mediaLibrary.requestPermissionsAsync(true)
      if (!permission.granted) throw new Error('ไม่ได้รับสิทธิ์บันทึกลงคลังรูป')
      await mediaLibrary.saveToLibraryAsync(uri)

      setStatus('saved')
      return 'saved'
    } catch (err) {
      setStatus('failed')
      setErrorMessage(readableExportError(err, 'บันทึกรูปไม่สำเร็จ ลองใหม่อีกครั้ง'))
      return 'failed'
    } finally {
      setIsSaving(false)
    }
  }, [])

  return { saveToGallery, isSaving, status, errorMessage }
}
