// JS binding for the local native module `RallyVideoWatermark`.
// Bakes a static PNG watermark onto a video and trims it to a max duration using
// ONLY first-party OS frame compositors: iOS AVFoundation, Android Media3
// Transformer. No ffmpeg, no third-party binaries.
//
// `requireNativeModule` runs at import time: on a JS bundle whose host binary
// does NOT contain this native module (e.g. an OTA update pushed onto an older
// build), evaluating this file THROWS. `videoWatermarkService.ts` imports it
// lazily inside a try/catch and lets the caller fall back to the raw clip.
import { requireNativeModule } from 'expo-modules-core'

export type RallyVideoWatermarkModule = {
  /**
   * Composite `overlayPngUri` onto `videoUri`, anchored to the top and scaled to
   * the (oriented) video width, then trim to `maxDurationSeconds`.
   * Resolves with a `file://` uri of the exported mp4 in the OS temp dir.
   */
  overlayImageOnVideo: (
    videoUri: string,
    overlayPngUri: string,
    maxDurationSeconds: number,
  ) => Promise<string>
}

const RallyVideoWatermark = requireNativeModule<RallyVideoWatermarkModule>('RallyVideoWatermark')

export default RallyVideoWatermark

export function overlayImageOnVideo(
  videoUri: string,
  overlayPngUri: string,
  maxDurationSeconds: number,
): Promise<string> {
  return RallyVideoWatermark.overlayImageOnVideo(videoUri, overlayPngUri, maxDurationSeconds)
}
