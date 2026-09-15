import { useCallback, useState } from 'react'

import { buildGpxDocument, buildGpxFileName, GpxExportError, type GpxExportPoint } from '@/lib/run-tracking/export/gpxExport'

/**
 * Writes a run's GPS path to a .gpx file in the cache directory and opens the
 * native share sheet. Mirrors the lazy-import pattern used by
 * useRunSummaryExport.ts (image export), but writes a GPX document via
 * expo-file-system instead of capturing a view, and shares it via
 * expo-sharing instead of saving to the photo library.
 */

export type RunGpxExportStatus = 'idle' | 'shared' | 'failed'

export type ExportGpxInput = {
  name: string
  startedAtIso: string
  points: GpxExportPoint[]
}

type FileSystemModule = {
  File: new (...uris: unknown[]) => {
    uri: string
    create: (options?: { intermediates?: boolean; overwrite?: boolean }) => void
    write: (content: string) => void
  }
  Paths: { cache: unknown }
}

type SharingModule = {
  isAvailableAsync: () => Promise<boolean>
  shareAsync: (url: string, options?: { mimeType?: string; UTI?: string; dialogTitle?: string }) => Promise<void>
}

const nativeExportError =
  'การส่งออก GPX ต้องใช้ native build ที่มี expo-file-system และ expo-sharing · build แอปใหม่แล้วเปิด Rally อีกครั้ง'
const sharingUnavailableError = 'อุปกรณ์นี้ไม่รองรับการแชร์ไฟล์ ลองใหม่บนอุปกรณ์อื่น'

const loadFileSystem = async (): Promise<FileSystemModule> => {
  try {
    const fileSystem = await import('expo-file-system') as unknown as FileSystemModule
    if (typeof fileSystem.File === 'function' && fileSystem.Paths) return fileSystem
  } catch {
    // Let the caller show a user-facing export error instead of crashing.
  }
  throw new Error(nativeExportError)
}

const loadSharing = async (): Promise<SharingModule> => {
  try {
    const sharing = await import('expo-sharing') as SharingModule
    if (typeof sharing.isAvailableAsync === 'function' && typeof sharing.shareAsync === 'function') {
      return sharing
    }
  } catch {
    // Let the caller show a user-facing export error instead of crashing.
  }
  throw new Error(nativeExportError)
}

// native/permission error เป็นอังกฤษ/technical — แสดงต่อผู้ใช้เฉพาะถ้าเป็นไทยอยู่แล้ว ที่เหลือใช้ fallback ไทย
function readableExportError(err: unknown, fallback: string): string {
  if (err instanceof GpxExportError) return err.message
  return err instanceof Error && /[ก-๙]/.test(err.message) ? err.message : fallback
}

export function useRunGpxExport() {
  const [isExporting, setIsExporting] = useState(false)
  const [status, setStatus] = useState<RunGpxExportStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const exportGpx = useCallback(async (input: ExportGpxInput): Promise<RunGpxExportStatus> => {
    setIsExporting(true)
    setErrorMessage(null)
    try {
      const gpxDocument = buildGpxDocument({
        name: input.name,
        startedAtIso: input.startedAtIso,
        points: input.points,
      })
      const fileName = buildGpxFileName(input.startedAtIso)

      const { File, Paths } = await loadFileSystem()
      const file = new File(Paths.cache, fileName)
      file.create({ overwrite: true })
      file.write(gpxDocument)

      const sharing = await loadSharing()
      const isAvailable = await sharing.isAvailableAsync()
      if (!isAvailable) throw new Error(sharingUnavailableError)
      await sharing.shareAsync(file.uri, { mimeType: 'application/gpx+xml', dialogTitle: 'ส่งออกไฟล์ GPX' })

      setStatus('shared')
      return 'shared'
    } catch (err) {
      setStatus('failed')
      setErrorMessage(readableExportError(err, 'สร้างไฟล์ GPX ไม่สำเร็จ ลองใหม่อีกครั้ง'))
      return 'failed'
    } finally {
      setIsExporting(false)
    }
  }, [])

  return { exportGpx, isExporting, status, errorMessage }
}
