import { Dimensions } from 'react-native'

const GUIDELINE_WIDTH = 375
const GUIDELINE_HEIGHT = 812
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Pure, testable core: scale `n` by the clamped ratio of device dim to guideline. */
export function scaleWith(deviceDim: number, guideline: number, n: number): number {
  return n * clamp(deviceDim / guideline, 0.85, 1.12)
}

// Dimensions.get() is called lazily inside each export (not at module scope)
// so importing scaleWith in isolation — the only thing unit-tested — does not
// require react-native's Dimensions API to exist (the vitest RN stub omits it).
export const scale = (n: number) => scaleWith(Dimensions.get('window').width, GUIDELINE_WIDTH, n)
export const verticalScale = (n: number) =>
  scaleWith(Dimensions.get('window').height, GUIDELINE_HEIGHT, n)
export const moderateScale = (n: number, factor = 0.5) => n + (scale(n) - n) * factor
