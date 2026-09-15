import type { GeoJSONLineString } from './mapTypes'

type RouteOverlayProps = {
  route: GeoJSONLineString | null
  lineColor?: string
  casingColor?: string
  lineWidth?: number
  sourceId?: string
}

/** MapLibre React Native has no web renderer; web keeps the surrounding route UI usable. */
export function RouteOverlay(_props: RouteOverlayProps) {
  return null
}
