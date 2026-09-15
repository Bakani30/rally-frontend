export type VideoWatermarkPlatform = 'ios' | 'android' | 'web' | 'windows' | 'macos'

export function shouldApplyNativeVideoWatermark(platform: VideoWatermarkPlatform): boolean {
  return platform === 'ios' || platform === 'android'
}
