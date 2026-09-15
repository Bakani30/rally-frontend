import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native'

import type { GeoJSONLineString } from './mapTypes'

type RouteOverlayProps = {
  route: GeoJSONLineString | null
  lineColor?: string
  casingColor?: string
  lineWidth?: number
  sourceId?: string
}

export function RouteOverlay({
  route,
  lineColor = '#ff4d3d',
  casingColor = '#ffffff',
  lineWidth = 5,
  sourceId = 'run-route-source',
}: RouteOverlayProps) {
  if (!route || route.geometry.coordinates.length < 2) return null

  return (
    <GeoJSONSource
      id={sourceId}
      data={{
        type: 'FeatureCollection',
        features: [route],
      }}
    >
      <Layer
        id={`${sourceId}-casing`}
        type="line"
        style={{
          lineColor: casingColor,
          lineWidth: lineWidth + 4,
          lineJoin: 'round',
          lineCap: 'round',
          lineOpacity: 0.92,
        }}
      />
      <Layer
        id={`${sourceId}-line`}
        type="line"
        style={{
          lineColor,
          lineWidth,
          lineJoin: 'round',
          lineCap: 'round',
          lineOpacity: 0.96,
        }}
      />
    </GeoJSONSource>
  )
}
