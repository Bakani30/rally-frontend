import { describe, expect, it } from 'vitest'

import { buildGpxDocument, buildGpxFileName, GpxExportError } from './gpxExport'

describe('buildGpxDocument', () => {
  const basePoints = [
    { lat: 13.756331, lng: 100.501765, timestamp: 1735689600000, altitude: 12.345 },
    { lat: 13.756400, lng: 100.501800, timestamp: 1735689610000, altitude: 12.9 },
    { lat: 13.756500, lng: 100.501900, timestamp: 1735689620000, altitude: null },
  ]

  it('produces valid GPX 1.1 root + metadata + one trkseg with a trkpt per point', () => {
    const xml = buildGpxDocument({
      name: 'เช้าวิ่งสวนลุม',
      startedAtIso: '2025-01-01T00:00:00.000Z',
      points: basePoints,
    })

    expect(xml).toContain('<gpx version="1.1" creator="Rally" xmlns="http://www.topografix.com/GPX/1/1">')
    expect(xml).toContain('<metadata>')
    expect(xml).toContain('<time>2025-01-01T00:00:00.000Z</time>')
    expect(xml).toContain('<trk>')
    expect(xml).toContain('<trkseg>')

    const trkptCount = (xml.match(/<trkpt /g) ?? []).length
    expect(trkptCount).toBe(3)
  })

  it('fixes coordinates to 6 decimals and elevation to 1 decimal', () => {
    const xml = buildGpxDocument({
      name: 'run',
      startedAtIso: '2025-01-01T00:00:00.000Z',
      points: basePoints,
    })

    expect(xml).toContain('lat="13.756331" lon="100.501765"')
    expect(xml).toContain('<ele>12.3</ele>')
  })

  it('includes <time> on trkpt when timestamp is parseable', () => {
    const xml = buildGpxDocument({
      name: 'run',
      startedAtIso: '2025-01-01T00:00:00.000Z',
      points: basePoints,
    })

    expect(xml).toContain('<time>2025-01-01T00:00:00.000Z</time>')
    expect(xml).toContain('<time>2025-01-01T00:00:10.000Z</time>')
  })

  it('omits <ele> when altitude is missing/non-finite', () => {
    const xml = buildGpxDocument({
      name: 'run',
      startedAtIso: '2025-01-01T00:00:00.000Z',
      points: basePoints,
    })

    // third point has altitude: null -> exactly 2 <ele> tags total
    const eleCount = (xml.match(/<ele>/g) ?? []).length
    expect(eleCount).toBe(2)
  })

  it('omits <time> on trkpt when timestamp is missing/unparseable', () => {
    const xml = buildGpxDocument({
      name: 'run',
      startedAtIso: '2025-01-01T00:00:00.000Z',
      points: [
        { lat: 13.7, lng: 100.5, timestamp: null, altitude: 1 },
        { lat: 13.71, lng: 100.51, timestamp: 'not-a-date', altitude: 1 },
      ],
    })

    const timeCount = (xml.match(/<time>/g) ?? []).length
    // only the metadata <time> from startedAtIso, none on trkpts
    expect(timeCount).toBe(1)
  })

  it('XML-escapes the track name', () => {
    const xml = buildGpxDocument({
      name: `R&D "run" <test> 'quote'`,
      startedAtIso: '2025-01-01T00:00:00.000Z',
      points: basePoints,
    })

    expect(xml).toContain('<name>R&amp;D &quot;run&quot; &lt;test&gt; &apos;quote&apos;</name>')
  })

  it('skips points with non-finite lat/lng', () => {
    const xml = buildGpxDocument({
      name: 'run',
      startedAtIso: '2025-01-01T00:00:00.000Z',
      points: [
        ...basePoints,
        { lat: NaN, lng: 100.5, timestamp: 1, altitude: 1 },
        { lat: 13.7, lng: Infinity, timestamp: 1, altitude: 1 },
      ],
    })

    const trkptCount = (xml.match(/<trkpt /g) ?? []).length
    expect(trkptCount).toBe(3)
  })

  it('throws GpxExportError with Thai message when fewer than 2 valid points', () => {
    expect(() =>
      buildGpxDocument({
        name: 'run',
        startedAtIso: '2025-01-01T00:00:00.000Z',
        points: [{ lat: 13.7, lng: 100.5, timestamp: 1, altitude: 1 }],
      }),
    ).toThrow(GpxExportError)

    try {
      buildGpxDocument({
        name: 'run',
        startedAtIso: '2025-01-01T00:00:00.000Z',
        points: [],
      })
      expect.fail('expected to throw')
    } catch (err) {
      expect(err).toBeInstanceOf(GpxExportError)
      expect((err as GpxExportError).message).toBe('ไม่มีข้อมูล GPS พอสำหรับสร้างไฟล์ GPX')
    }
  })
})

describe('buildGpxFileName', () => {
  it('formats as rally-run-YYYY-MM-DD-HHmm.gpx', () => {
    const fileName = buildGpxFileName('2026-07-07T17:38:00.000Z')
    expect(fileName).toMatch(/^rally-run-\d{4}-\d{2}-\d{2}-\d{4}\.gpx$/)
  })

  it('falls back to rally-run.gpx on unparseable date', () => {
    expect(buildGpxFileName('not-a-date')).toBe('rally-run.gpx')
  })
})
