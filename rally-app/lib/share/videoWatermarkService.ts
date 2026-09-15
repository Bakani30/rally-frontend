// First-party native video-watermark service. Wraps the local Expo module
// `rally-video-watermark` (iOS AVFoundation / Android Media3 Transformer) which
// bakes the static watermark PNG onto a clip and trims it — NO ffmpeg, no
// third-party binaries.
//
// No React / React Native / Expo-UI imports. The only native boundary is the
// local module's `requireNativeModule` (allowed by CLAUDE.md §2.5 for the
// repository/native-access layer), and it is reached through a LAZY dynamic
// import so that a JS bundle running on a host binary WITHOUT this native module
// (e.g. an OTA update onto an older build) throws here instead of crashing at
// import time. The caller (useWatermarkedCapture) catches and falls back to the
// raw, un-watermarked clip.

type OverlayImageOnVideo = (
  videoUri: string,
  overlayPngUri: string,
  maxDurationSeconds: number,
) => Promise<string>

// A native compositor that never settles must not strand the capture flow.
// The caller falls back to the raw clip when this deadline is reached.
const NATIVE_WATERMARK_TIMEOUT_MS = 30_000

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('watermark_native_overlay_timeout')), timeoutMs)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

export async function overlayStaticWatermark(input: {
  videoUri: string
  watermarkPngUri: string
  maxDurationSeconds: number
}): Promise<string> {
  let overlayImageOnVideo: OverlayImageOnVideo
  try {
    // Static specifier so Metro bundles the local module; evaluating its
    // index.ts calls requireNativeModule, which throws when the native binding is
    // absent — surfaced here as a rejected import, not an import-time crash.
    const mod = (await import('@/modules/rally-video-watermark')) as {
      overlayImageOnVideo?: OverlayImageOnVideo
    }
    if (typeof mod.overlayImageOnVideo !== 'function') {
      throw new Error('missing_export')
    }
    overlayImageOnVideo = mod.overlayImageOnVideo
  } catch {
    // Native module missing (older binary / autolink gap) → let the caller fall
    // back to the raw clip.
    throw new Error('watermark_native_module_unavailable')
  }

  try {
    return await withTimeout(
      overlayImageOnVideo(
        input.videoUri,
        input.watermarkPngUri,
        input.maxDurationSeconds,
      ),
      NATIVE_WATERMARK_TIMEOUT_MS,
    )
  } catch {
    // Native compositor failed (decode/export/transform) → caller falls back.
    throw new Error('watermark_native_overlay_failed')
  }
}
