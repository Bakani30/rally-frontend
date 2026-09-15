// Hidden, off-screen compositor that bakes the shared CaptureWatermarkBoard onto
// media via react-native-view-shot. Two imperative methods:
//   composePhoto(rawUri)  -> JPG with the board composited over the photo.
//   composeOverlayPng()   -> transparent PNG of the board alone (for the native video overlay).
// Uses the same lazy dynamic-import + Thai user-facing error pattern as
// hooks/useRunSummaryExport.ts so a missing native module degrades gracefully.
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'
import { Image, StyleSheet, View } from 'react-native'

import { CaptureWatermarkBoard, type DataSlot } from '@/components/share/CaptureWatermarkBoard'

export type WatermarkComposerHandle = {
  composePhoto: (rawUri: string) => Promise<string>
  composeOverlayPng: () => Promise<string>
}

export type WatermarkComposerProps = { slot: DataSlot }

type CaptureRefOptions = { format: 'jpg' | 'png'; quality: number; result: 'tmpfile' }
type CaptureRef = (target: React.RefObject<View | null>, options: CaptureRefOptions) => Promise<string>

const composeError =
  'ใส่ลายน้ำไม่สำเร็จ ต้องใช้ native build ที่มี react-native-view-shot · build แอปใหม่แล้วลองอีกครั้ง'

const loadCaptureRef = async (): Promise<CaptureRef> => {
  try {
    const viewShot = (await import('react-native-view-shot')) as { captureRef?: CaptureRef }
    if (typeof viewShot.captureRef === 'function') return viewShot.captureRef
  } catch {
    // Fall through to the user-facing error below.
  }
  throw new Error(composeError)
}

type PendingCapture = {
  id: number
  resolve: () => void
  reject: (e: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export const WatermarkComposer = forwardRef<WatermarkComposerHandle, WatermarkComposerProps>(
  function WatermarkComposer({ slot }, ref) {
    const photoShotRef = useRef<View>(null)
    const boardShotRef = useRef<View>(null)
    // Rendered photo + a monotonic id so re-composing the SAME rawUri still forces
    // a fresh Image mount (keyed on id) and its onLoad fires again.
    const [photo, setPhoto] = useState<{ uri: string; id: number } | null>(null)
    // The single in-flight photo capture; onLoad and the safety timeout both check
    // its id so a stale/overlapping capture can never resolve/reject the wrong call.
    const pendingRef = useRef<PendingCapture | null>(null)
    const idCounterRef = useRef(0)
    const inFlightRef = useRef(false)

    const composePhoto = useCallback(async (rawUri: string): Promise<string> => {
      // Reject re-entrant calls: one photo capture at a time. The caller
      // (useWatermarkedCapture) falls back to the raw uri on rejection.
      if (inFlightRef.current) throw new Error(composeError)
      inFlightRef.current = true
      try {
        const captureRef = await loadCaptureRef()
        const id = (idCounterRef.current += 1)
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            if (pendingRef.current?.id === id) {
              pendingRef.current = null
              reject(new Error(composeError))
            }
          }, 8000)
          pendingRef.current = { id, resolve, reject, timer }
          setPhoto({ uri: rawUri, id })
        })
        return await captureRef(photoShotRef, { format: 'jpg', quality: 0.95, result: 'tmpfile' })
      } finally {
        inFlightRef.current = false
      }
    }, [])

    const composeOverlayPng = useCallback(async (): Promise<string> => {
      const captureRef = await loadCaptureRef()
      return captureRef(boardShotRef, { format: 'png', quality: 1, result: 'tmpfile' })
    }, [])

    useImperativeHandle(ref, () => ({ composePhoto, composeOverlayPng }), [composePhoto, composeOverlayPng])

    return (
      <View style={styles.offscreen} pointerEvents="none">
        {/* Photo canvas: raw frame with the board composited on top. Keyed on the
            capture id so re-composing the same uri still remounts + refires onLoad. */}
        <View ref={photoShotRef} collapsable={false} style={styles.photoCanvas}>
          {photo && (
            <Image
              key={photo.id}
              source={{ uri: photo.uri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              onLoad={() => {
                const pending = pendingRef.current
                if (pending && pending.id === photo.id) {
                  clearTimeout(pending.timer)
                  pendingRef.current = null
                  pending.resolve()
                }
              }}
            />
          )}
          <View style={styles.boardOnPhoto}>
            <CaptureWatermarkBoard slot={slot} />
          </View>
        </View>

        {/* Board-only canvas on transparent background for the video PNG overlay. */}
        <View ref={boardShotRef} collapsable={false} style={styles.boardOnly}>
          <CaptureWatermarkBoard slot={slot} />
        </View>
      </View>
    )
  },
)

const styles = StyleSheet.create({
  // Rendered but pushed far off-screen so it never affects the visible layout.
  offscreen: { position: 'absolute', left: -10000, top: 0 },
  photoCanvas: { width: 1080, height: 1440, backgroundColor: '#000' },
  boardOnPhoto: { position: 'absolute', top: 24, left: 16, right: 16 },
  boardOnly: { width: 1080, paddingTop: 24, paddingHorizontal: 16, backgroundColor: 'transparent' },
})
