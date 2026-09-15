import { describe, expect, it } from 'vitest'
import { gpxToGeoJsonLineString, parseGpx } from './gpxParser'

const MIN_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <trk>
    <name>Lumphini Loop</name>
    <trkseg>
      <trkpt lat="13.7300" lon="100.5400"><ele>5.1</ele><time>2024-01-01T00:00:00Z</time></trkpt>
      <trkpt lat="13.7305" lon="100.5408"><ele>5.3</ele><time>2024-01-01T00:00:30Z</time></trkpt>
      <trkpt lat="13.7310" lon="100.5416"><ele>5.0</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`

const MULTI_SEG_GPX = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="13.7" lon="100.5"/>
      <trkpt lat="13.71" lon="100.5"/>
    </trkseg>
    <trkseg>
      <trkpt lat="13.72" lon="100.5"/>
    </trkseg>
  </trk>
</gpx>`

const RTE_GPX = `<?xml version="1.0"?>
<gpx version="1.1">
  <rte>
    <name>Planned route</name>
    <rtept lat="13.7" lon="100.5"/>
    <rtept lat="13.71" lon="100.5"/>
  </rte>
</gpx>`

describe('parseGpx', () => {
  it('extracts trkpt lat/lng/ele/time in document order', () => {
    const r = parseGpx(MIN_GPX)
    expect(r.points).toHaveLength(3)
    expect(r.points[0]).toEqual({
      lat: 13.73,
      lng: 100.54,
      ele: 5.1,
      time: '2024-01-01T00:00:00Z',
    })
    expect(r.points[2].ele).toBe(5)
    expect(r.points[2].time).toBeUndefined()
  })

  it('returns the trk name', () => {
    expect(parseGpx(MIN_GPX).name).toBe('Lumphini Loop')
  })

  it('computes haversine total length', () => {
    const r = parseGpx(MIN_GPX)
    // Three points ~80m apart each → roughly 160m total. Exact value is
    // floating-point; bound generously.
    expect(r.totalLengthMeters).toBeGreaterThan(100)
    expect(r.totalLengthMeters).toBeLessThan(300)
  })

  it('flattens multiple trkseg into a single point list', () => {
    const r = parseGpx(MULTI_SEG_GPX)
    expect(r.points.map((p) => p.lat)).toEqual([13.7, 13.71, 13.72])
  })

  it('handles <rte>/<rtept> as well as <trk>', () => {
    const r = parseGpx(RTE_GPX)
    expect(r.points).toHaveLength(2)
    expect(r.name).toBe('Planned route')
  })

  it('accepts self-closing point tags', () => {
    const xml = `<gpx><trk><trkseg><trkpt lat="1" lon="2"/></trkseg></trk></gpx>`
    const r = parseGpx(xml)
    expect(r.points).toEqual([{ lat: 1, lng: 2 }])
  })

  it('accepts single-quoted attributes', () => {
    const xml = `<gpx><trk><trkseg><trkpt lat='13.7' lon='100.5'/></trkseg></trk></gpx>`
    expect(parseGpx(xml).points[0]).toEqual({ lat: 13.7, lng: 100.5 })
  })

  it('skips points with out-of-range coordinates', () => {
    const xml = `<gpx><trk><trkseg>
      <trkpt lat="13.7" lon="100.5"/>
      <trkpt lat="91" lon="0"/>
      <trkpt lat="13.71" lon="100.5"/>
    </trkseg></trk></gpx>`
    expect(parseGpx(xml).points).toHaveLength(2)
  })

  it('throws on input with no point elements', () => {
    expect(() => parseGpx('<gpx></gpx>')).toThrow(/no <trkpt> or <rtept>/)
  })

  it('throws on empty input', () => {
    expect(() => parseGpx('')).toThrow()
    expect(() => parseGpx('   ')).toThrow()
  })
})

describe('gpxToGeoJsonLineString', () => {
  it('emits [lng, lat] pairs per RFC 7946', () => {
    const ls = gpxToGeoJsonLineString(parseGpx(MIN_GPX))
    expect(ls.type).toBe('LineString')
    expect(ls.coordinates[0]).toEqual([100.54, 13.73])
  })
})
