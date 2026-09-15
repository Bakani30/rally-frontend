import { haversineMeters } from '../gps/gpsDistance'
import type { GpsPoint } from '../gps/gpsTypes'

export type RouteQualityStatus = 'good' | 'review' | 'limited'

export type RouteQualityIssueId =
  | 'sparse_points'
  | 'gps_gap'
  | 'wide_spacing'
  | 'continuity_jump'
  | 'poor_accuracy'
  | 'sprint_gps_caution'

export type RouteQualityGateInput = {
  path: readonly GpsPoint[]
  distanceMeters?: number | null
  durationSeconds?: number | null
}

export type RouteQualityGateResult = {
  status: RouteQualityStatus
  issues: RouteQualityIssueId[]
  diagnostics: {
    activePointCount: number
    avgSampleGapSeconds: number
    maxSampleGapSeconds: number
    avgSpacingMeters: number
    maxSegmentMeters: number
    maxDerivedSpeedMps: number
    poorAccuracyRatio: number
  }
  /** Null when status is good so recap UI stays silent by default. */
  message: string | null
}

const MIN_ACTIVE_POINTS = 10
const AVG_SAMPLE_GAP_REVIEW_SECONDS = 10
const MAX_SAMPLE_GAP_REVIEW_SECONDS = 30
const AVG_SPACING_REVIEW_METERS = 40
const MAX_SEGMENT_REVIEW_METERS = 100
const MAX_DERIVED_SPEED_REVIEW_MPS = 12
const ACCURACY_REVIEW_METERS = 20
const POOR_ACCURACY_REVIEW_RATIO = 0.2
const SPRINT_CAUTION_DISTANCE_METERS = 200

export function evaluateRouteQuality({
  path,
  distanceMeters,
}: RouteQualityGateInput): RouteQualityGateResult {
  const activePoints = path
    .filter(isActiveGpsPoint)
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp)

  const activePointCount = activePoints.length
  const segments = buildPointSegments(activePoints)
  const avgSampleGapSeconds = average(segments.map((segment) => segment.gapSeconds))
  const maxSampleGapSeconds = maxOrZero(segments.map((segment) => segment.gapSeconds))
  const avgSpacingMeters = average(segments.map((segment) => segment.distanceMeters))
  const maxSegmentMeters = maxOrZero(segments.map((segment) => segment.distanceMeters))
  const maxDerivedSpeedMps = maxOrZero(segments.map((segment) => segment.derivedSpeedMps))
  const poorAccuracyRatio = activePointCount > 0
    ? activePoints.filter((point) => point.accuracy > ACCURACY_REVIEW_METERS).length / activePointCount
    : 0

  const issues: RouteQualityIssueId[] = []
  if (activePointCount < MIN_ACTIVE_POINTS) issues.push('sparse_points')
  if (
    avgSampleGapSeconds > AVG_SAMPLE_GAP_REVIEW_SECONDS ||
    maxSampleGapSeconds > MAX_SAMPLE_GAP_REVIEW_SECONDS
  ) {
    issues.push('gps_gap')
  }
  if (
    avgSpacingMeters > AVG_SPACING_REVIEW_METERS ||
    maxSegmentMeters > MAX_SEGMENT_REVIEW_METERS
  ) {
    issues.push('wide_spacing')
  }
  if (maxDerivedSpeedMps > MAX_DERIVED_SPEED_REVIEW_MPS) {
    issues.push('continuity_jump')
  }
  if (poorAccuracyRatio > POOR_ACCURACY_REVIEW_RATIO) {
    issues.push('poor_accuracy')
  }
  if (distanceMeters != null && distanceMeters > 0 && distanceMeters <= SPRINT_CAUTION_DISTANCE_METERS) {
    issues.push('sprint_gps_caution')
  }

  const uniqueIssues = uniqueIssueIds(issues)
  const status: RouteQualityStatus = uniqueIssues.includes('sparse_points')
    ? 'limited'
    : uniqueIssues.length > 0
      ? 'review'
      : 'good'

  return {
    status,
    issues: uniqueIssues,
    diagnostics: {
      activePointCount,
      avgSampleGapSeconds: round(avgSampleGapSeconds, 1),
      maxSampleGapSeconds: round(maxSampleGapSeconds, 1),
      avgSpacingMeters: Math.round(avgSpacingMeters),
      maxSegmentMeters: Math.round(maxSegmentMeters),
      maxDerivedSpeedMps: round(maxDerivedSpeedMps, 1),
      poorAccuracyRatio: round(poorAccuracyRatio, 3),
    },
    message: buildRouteQualityMessage(status, uniqueIssues),
  }
}

function buildRouteQualityMessage(
  status: RouteQualityStatus,
  issues: readonly RouteQualityIssueId[],
): string | null {
  if (status === 'good') return null
  if (issues.includes('sparse_points')) {
    return 'เส้นทาง GPS มีจุดน้อย รายละเอียดเส้นทางอาจจำกัด'
  }
  if (issues.includes('sprint_gps_caution')) {
    return 'การวิ่งสั้นมากใช้การจับเวลาจาก GPS มือถือเป็นค่าประมาณ'
  }
  if (issues.includes('gps_gap')) {
    return 'GPS ขาดช่วง รายละเอียดเส้นทางอาจแม่นยำน้อยลง'
  }
  if (issues.includes('continuity_jump') || issues.includes('wide_spacing')) {
    return 'ความต่อเนื่องของเส้นทาง GPS ต้องตรวจสอบ รายละเอียดเส้นทางอาจแม่นยำน้อยลง'
  }
  if (issues.includes('poor_accuracy')) {
    return 'ความแม่นยำ GPS อ่อนในบางช่วงของการวิ่งนี้'
  }
  return 'คุณภาพเส้นทาง GPS ต้องตรวจสอบ'
}

type PointSegment = {
  gapSeconds: number
  distanceMeters: number
  derivedSpeedMps: number
}

function buildPointSegments(points: readonly GpsPoint[]): PointSegment[] {
  const segments: PointSegment[] = []
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const point = points[i]
    const gapSeconds = Math.max(0, (point.timestamp - prev.timestamp) / 1000)
    const distanceMeters = haversineMeters(prev, point)
    segments.push({
      gapSeconds,
      distanceMeters,
      derivedSpeedMps: gapSeconds > 0 ? distanceMeters / gapSeconds : 0,
    })
  }
  return segments
}

function isActiveGpsPoint(point: GpsPoint): boolean {
  return (
    !point.isPaused &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    Number.isFinite(point.timestamp) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lng) <= 180
  )
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function maxOrZero(values: readonly number[]): number {
  return values.length > 0 ? Math.max(...values) : 0
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function uniqueIssueIds(issues: readonly RouteQualityIssueId[]): RouteQualityIssueId[] {
  return Array.from(new Set(issues))
}
