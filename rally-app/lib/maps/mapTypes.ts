export type Coordinate = {
  latitude: number
  longitude: number
}

export type LongitudeLatitude = [longitude: number, latitude: number]

export type GeoJSONLineString = {
  type: 'Feature'
  properties: Record<string, unknown>
  geometry: {
    type: 'LineString'
    coordinates: LongitudeLatitude[]
  }
}

export type GeoJSONLineStringCollection = {
  type: 'FeatureCollection'
  features: GeoJSONLineString[]
}
