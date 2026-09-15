// Pure ffmpeg command-string builder for the static watermark overlay. No React,
// no ffmpeg import — just the string, so it is fully unit-testable. The overlay
// PNG is anchored to the top, horizontally centred, mirroring the on-screen HUD.
export function buildOverlayCommand(input: {
  videoUri: string
  watermarkPngUri: string
  outputUri: string
  maxDurationSeconds: number
}): string {
  const { videoUri, watermarkPngUri, outputUri, maxDurationSeconds } = input
  return (
    `-y -i "${videoUri}" -i "${watermarkPngUri}" ` +
    `-filter_complex "overlay=(W-w)/2:24" ` +
    `-t ${maxDurationSeconds} -c:a copy "${outputUri}"`
  )
}
