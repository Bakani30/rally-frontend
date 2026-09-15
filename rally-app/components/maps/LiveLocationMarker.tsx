import { memo, useMemo } from 'react'
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native'

type LiveLocationMarkerProps = {
  coordinate: { lat: number; lng: number } | null
}

const ACCENT = '#ff4d3d'

function LiveLocationMarkerInner({ coordinate }: LiveLocationMarkerProps) {
  const dotGeoJson = useMemo(() => {
    if (!coordinate) return null
    return {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [coordinate.lng, coordinate.lat] },
          properties: {},
        },
      ],
    }
  }, [coordinate])

  if (!dotGeoJson) return null

  return (
    <GeoJSONSource id="live-location-source" data={dotGeoJson}>
      {/* Outermost pulse — soft halo, non-pitched so it doesn't squash. */}
      <Layer
        id="live-location-pulse"
        type="circle"
        style={{
          circleColor: ACCENT,
          circleOpacity: 0.16,
          circleRadius: 24,
          circleBlur: 0.6,
          circlePitchAlignment: 'map',
        }}
      />
      {/* White ring. */}
      <Layer
        id="live-location-ring"
        type="circle"
        style={{
          circleColor: '#ffffff',
          circleOpacity: 0.95,
          circleRadius: 11,
          circlePitchAlignment: 'map',
        }}
      />
      {/* Solid accent core. */}
      <Layer
        id="live-location-core"
        type="circle"
        style={{
          circleColor: ACCENT,
          circleRadius: 7.5,
          circlePitchAlignment: 'map',
        }}
      />
      {/* Tiny inner highlight — gives the dot a bit of dimension without
          looking like a target. */}
      <Layer
        id="live-location-highlight"
        type="circle"
        style={{
          circleColor: '#ffffff',
          circleOpacity: 0.85,
          circleRadius: 2,
          circleTranslate: [0, -1],
          circlePitchAlignment: 'map',
        }}
      />
    </GeoJSONSource>
  )
}

export const LiveLocationMarker = memo(LiveLocationMarkerInner)
