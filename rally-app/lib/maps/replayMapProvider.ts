export type ReplayMapProvider = 'apple' | 'maplibre'

export function defaultReplayMapProvider(platform: string): ReplayMapProvider {
  return platform === 'ios' ? 'apple' : 'maplibre'
}

export function toggleReplayMapProvider(
  platform: string,
  current: ReplayMapProvider,
): ReplayMapProvider {
  if (platform !== 'ios') return 'maplibre'
  return current === 'apple' ? 'maplibre' : 'apple'
}
