/**
 * GPX 1.1 document builder for the run summary "Export GPX" action.
 *
 * Pure module — no React/Expo imports. Callers (hooks) own file writing and
 * sharing; this file only turns a run's GPS path into a GPX XML string.
 */

export class GpxExportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GpxExportError'
  }
}

export type GpxExportPoint = {
  lat: number
  lng: number
  timestamp?: number | string | null
  altitude?: number | null
}

export type BuildGpxDocumentInput = {
  name: string
  startedAtIso: string
  points: GpxExportPoint[]
}

const MIN_VALID_POINTS = 2

export function buildGpxDocument(input: BuildGpxDocumentInput): string {
  const validPoints = input.points.filter(
    (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng),
  )

  if (validPoints.length < MIN_VALID_POINTS) {
    throw new GpxExportError('ไม่มีข้อมูล GPS พอสำหรับสร้างไฟล์ GPX')
  }

  const metadataTime = parseIsoTime(input.startedAtIso)
  const trkpts = validPoints.map((point) => buildTrkpt(point)).join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="Rally" xmlns="http://www.topografix.com/GPX/1/1">',
    '  <metadata>',
    metadataTime ? `    <time>${metadataTime}</time>` : null,
    '  </metadata>',
    '  <trk>',
    `    <name>${escapeXml(input.name)}</name>`,
    '    <trkseg>',
    trkpts,
    '    </trkseg>',
    '  </trk>',
    '</gpx>',
  ]
    .filter((line): line is string => line !== null)
    .join('\n')
}

export function buildGpxFileName(startedAtIso: string): string {
  const date = new Date(startedAtIso)
  if (Number.isNaN(date.getTime())) return 'rally-run.gpx'

  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')

  return `rally-run-${yyyy}-${mm}-${dd}-${hh}${min}.gpx`
}

function buildTrkpt(point: GpxExportPoint): string {
  const lat = point.lat.toFixed(6)
  const lon = point.lng.toFixed(6)
  const ele = Number.isFinite(point.altitude) ? `\n      <ele>${(point.altitude as number).toFixed(1)}</ele>` : ''
  const time = parseIsoTime(point.timestamp)
  const timeTag = time ? `\n      <time>${time}</time>` : ''

  return `      <trkpt lat="${lat}" lon="${lon}">${ele}${timeTag}\n      </trkpt>`
}

function parseIsoTime(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const date = typeof value === 'number' ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
