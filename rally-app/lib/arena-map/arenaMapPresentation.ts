import type { ArenaMapBbox, ArenaMapMarkerPresentation, ArenaMapPinDetail, ArenaMapPinStoryType, ArenaMapPinSummary } from '@/types/arenaMap'

const TYPE_STYLE = {
  official_venue: { keylineColor: '#1f1f1f', badgeIcon: 'star' as const },
  community_venue: { keylineColor: '#eb773c', badgeIcon: 'basketball' as const },
  ad_hoc_arena: { keylineColor: '#808bc3', badgeIcon: 'flash' as const },
} as const

const STORY_TYPE_STYLE = { ...TYPE_STYLE, conquest_arena: { keylineColor: '#161616', badgeIcon: 'crown' as const } }

export function getArenaMapStoryMarkerPresentation(type: ArenaMapPinStoryType, selected = false) {
  const style = STORY_TYPE_STYLE[type]
  return { type, selected, size: 48, scale: selected ? 1.12 : 1, keylineColor: style.keylineColor, badgeIcon: style.badgeIcon, halo: selected, shadowStrength: selected ? 'strong' as const : 'soft' as const }
}

/** Deliberately ignores volatile session fields. Marker = type + identity + selection. */
export function getArenaMapMarkerPresentation(pin: ArenaMapPinSummary, selected = false): ArenaMapMarkerPresentation {
  const style = TYPE_STYLE[pin.type]
  const partyAvatar = pin.publicIdentity.partyAvatarUrl
  const hostAvatar = pin.publicIdentity.hostAvatarUrl
  return {
    type: pin.type,
    selected,
    size: 48,
    scale: selected ? 1.12 : 1,
    keylineColor: style.keylineColor,
    badgeIcon: style.badgeIcon,
    halo: selected,
    shadowStrength: selected ? 'strong' : 'soft',
    imageUrl: partyAvatar ?? hostAvatar,
    fallback: partyAvatar ? 'party_avatar' : hostAvatar ? 'host_avatar' : 'initials_ball',
  }
}

export function clusterTypeMix(pins: ArenaMapPinSummary[]) {
  return pins.reduce<Record<string, number>>((result, pin) => ({ ...result, [pin.type]: (result[pin.type] ?? 0) + 1 }), {})
}

export function detailTimestampLabel(detailUpdatedAt: string, now = Date.now()) {
  const seconds = Math.max(0, Math.floor((now - Date.parse(detailUpdatedAt)) / 1000))
  return seconds > 30 ? `ข้อมูลอาจเก่า (${seconds}s)` : null
}

export function deadlineRemainingLabel(deadlineAt: string, serverTime: string) {
  const seconds = Math.max(0, Math.ceil((Date.parse(deadlineAt) - Date.parse(serverTime)) / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function arenaMapTypeLabel(type: ArenaMapPinSummary['type']) {
  return ({ official_venue: 'สนามทางการ', community_venue: 'สนามชุมชน', ad_hoc_arena: 'สนามชั่วคราว' })[type]
}

export function arenaMapPinAccessibilityLabel(pin: ArenaMapPinSummary, selected: boolean) {
  return `${arenaMapTypeLabel(pin.type)} ${pin.publicIdentity.label}${selected ? ', เลือกแล้ว' : ''}`
}

export function arenaMapClusterAccessibilityLabel(count: number, typeMix: Record<string, number>) {
  const mix = (['official_venue', 'community_venue', 'ad_hoc_arena'] as const)
    .filter((type) => (typeMix[type] ?? 0) > 0)
    .map((type) => `${arenaMapTypeLabel(type)} ${typeMix[type]}`)
    .join(', ')
  return `${count} สนาม${mix ? `: ${mix}` : ''}`
}

export function arenaMapDetailMetaLabel(
  type: ArenaMapPinSummary['type'],
  format: ArenaMapPinDetail['format'],
  distanceM: number | null,
) {
  const parts = [arenaMapTypeLabel(type)]
  const compactMeta = arenaMapCompactMetaLabel(format, distanceM)
  if (compactMeta) parts.push(compactMeta)
  return parts.join(' · ')
}

export function arenaMapCompactMetaLabel(format: ArenaMapPinDetail['format'], distanceM: number | null) {
  const parts: string[] = []
  if (format) parts.push(format)
  if (distanceM !== null) parts.push(distanceM >= 1000 ? `${(distanceM / 1000).toFixed(1)} กม.` : `${distanceM} ม.`)
  return parts.join(' · ')
}

export function arenaMapCompactQueueLabel(queue: ArenaMapPinDetail['queuePreview']) {
  const count = queue.teams.length + queue.remainingCount
  return count > 0 ? `รอ ${count} ทีม` : null
}

export function arenaMapDeadlineLabel(
  deadline: NonNullable<ArenaMapPinDetail['deadline']>,
  serverTime: string,
) {
  const remaining = deadlineRemainingLabel(deadline.at, serverTime)
  if (deadline.kind === 'drain') return `สนามกำลังปิดใน ${remaining}`
  if (deadline.kind === 'session_expiry') return `รอบหมดเวลาใน ${remaining}`
  return `เหลือเวลาป้องกันสนาม ${remaining}`
}

export type ArenaMapCameraTransition = {
  center: [number, number]
  zoom: number
  pitch: number
  bearing: number
  padding: { top: number; right: number; bottom: number; left: number }
  duration: number
}

export function arenaMapCameraTransition(
  kind: 'pin' | 'cluster',
  coordinate: ArenaMapPinSummary['coordinate'],
  currentZoom: number,
  viewportHeight: number,
  reduceMotion: boolean,
): ArenaMapCameraTransition {
  const pinBottomPadding = Math.max(240, Math.min(360, Math.round(viewportHeight * .42)))
  return {
    center: [coordinate.longitude, coordinate.latitude],
    zoom: kind === 'pin' ? Math.max(16.5, currentZoom) : Math.min(18, Math.max(15.2, currentZoom + 2)),
    pitch: 52,
    bearing: -18,
    padding: kind === 'pin'
      ? { top: 120, right: 24, bottom: pinBottomPadding, left: 24 }
      : { top: 140, right: 32, bottom: 96, left: 32 },
    duration: reduceMotion ? 0 : 240,
  }
}

export function distanceMeters(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const radians = (value: number) => value * Math.PI / 180
  const a = Math.sin(radians(to.latitude - from.latitude) / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(radians(to.longitude - from.longitude) / 2) ** 2
  return Math.round(6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

export function effectiveArenaMapSessionId(pinId: string | null, selectedId: string | null, options: { sessionId: string }[]) {
  if (selectedId && options.some((option) => option.sessionId === selectedId)) return selectedId
  return pinId?.startsWith('session:') ? pinId : null
}

export type ArenaMapPinCluster = {
  id: string
  coordinate: ArenaMapPinSummary['coordinate']
  count: number
  typeMix: Record<string, number>
}

export type ArenaMapMarkerRenderModel = {
  clusterMode: boolean
  clusters: ArenaMapPinCluster[]
  unclusteredPins: ArenaMapPinSummary[]
  selectedPin: ArenaMapPinSummary | null
}

const CLUSTER_ZOOM_THRESHOLD = 13
const CLUSTER_RADIUS_PX = 56

function projectCoordinate({ latitude, longitude }: ArenaMapPinSummary['coordinate'], zoom: number) {
  const worldSize = 512 * 2 ** zoom
  const clampedLatitude = Math.max(-85.05112878, Math.min(85.05112878, latitude))
  const latitudeRadians = clampedLatitude * Math.PI / 180
  return {
    x: ((longitude + 180) / 360) * worldSize,
    y: (0.5 - Math.log((1 + Math.sin(latitudeRadians)) / (1 - Math.sin(latitudeRadians))) / (4 * Math.PI)) * worldSize,
  }
}

function clusterComponents(pins: ArenaMapPinSummary[], zoom: number) {
  const projected = [...pins]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((pin) => ({ pin, point: projectCoordinate(pin.coordinate, zoom) }))
  const seen = new Set<number>()
  const components: ArenaMapPinSummary[][] = []

  for (let start = 0; start < projected.length; start += 1) {
    if (seen.has(start)) continue
    const memberIndexes = [start]
    const queue = [start]
    seen.add(start)

    while (queue.length > 0) {
      const current = queue.shift()!
      for (let candidate = 0; candidate < projected.length; candidate += 1) {
        if (seen.has(candidate)) continue
        const xDistance = projected[current].point.x - projected[candidate].point.x
        const yDistance = projected[current].point.y - projected[candidate].point.y
        if (Math.hypot(xDistance, yDistance) <= CLUSTER_RADIUS_PX) {
          seen.add(candidate)
          queue.push(candidate)
          memberIndexes.push(candidate)
        }
      }
    }

    components.push(memberIndexes.map((index) => projected[index].pin))
  }

  return components
}

function clusterFromMembers(members: ArenaMapPinSummary[]): ArenaMapPinCluster {
  const coordinate = members.reduce(
    (total, pin) => ({
      latitude: total.latitude + pin.coordinate.latitude,
      longitude: total.longitude + pin.coordinate.longitude,
    }),
    { latitude: 0, longitude: 0 },
  )
  return {
    id: `cluster:${members.map((pin) => pin.id).join('|')}`,
    coordinate: { latitude: coordinate.latitude / members.length, longitude: coordinate.longitude / members.length },
    count: members.length,
    typeMix: clusterTypeMix(members),
  }
}

/** Validates Map/marker press IDs against the current bounded summary. */
export function arenaMapPinIdForTap(pins: ArenaMapPinSummary[], candidate: unknown) {
  return typeof candidate === 'string' && pins.some((pin) => pin.id === candidate) ? candidate : null
}

/**
 * Bounded client-side grouping keeps custom 48pt interactive markers available
 * for every singleton. Selected pins are deliberately removed from grouping and
 * rendered once above the remaining cluster/singleton layer.
 */
export function arenaMapMarkerRenderModel(zoom: number, pins: ArenaMapPinSummary[], selectedId: string | null): ArenaMapMarkerRenderModel {
  const clusterMode = zoom < CLUSTER_ZOOM_THRESHOLD
  const validSelectedId = arenaMapPinIdForTap(pins, selectedId)
  const selectedPin = validSelectedId ? pins.find((pin) => pin.id === validSelectedId) ?? null : null
  const remainingPins = selectedPin ? pins.filter((pin) => pin.id !== selectedPin.id) : pins

  if (!clusterMode) return { clusterMode, clusters: [], unclusteredPins: remainingPins, selectedPin }

  const clusters: ArenaMapPinCluster[] = []
  const unclusteredPins: ArenaMapPinSummary[] = []
  for (const component of clusterComponents(remainingPins, zoom)) {
    if (component.length > 1) clusters.push(clusterFromMembers(component))
    else unclusteredPins.push(component[0])
  }
  return { clusterMode, clusters, unclusteredPins, selectedPin }
}

export type ArenaMapDetailDestination =
  | { kind: 'arena_session'; sessionId: string }
  | { kind: 'venue'; venueId: string }
  | null

/** Chooses a real destination; idle Venue pins never fall through to a generic Arena list. */
export function arenaMapDetailDestination(
  detail: Pick<ArenaMapPinDetail, 'id' | 'venueId' | 'sessionNavigationOptions'>,
  selectedSessionId: string | null,
): ArenaMapDetailDestination {
  const sessionId = effectiveArenaMapSessionId(detail.id, selectedSessionId, detail.sessionNavigationOptions)
  if (sessionId) return { kind: 'arena_session', sessionId: sessionId.replace('session:', '') }
  if (detail.venueId) return { kind: 'venue', venueId: detail.venueId }
  return null
}

/**
 * The compact map sheet previews one deterministic Session for a Venue, but its
 * CTA opens the Venue surface where the user can choose among all visible
 * Sessions. Ad-hoc pins continue directly to their single Session.
 */
export function arenaMapSheetDestination(
  detail: Pick<ArenaMapPinDetail, 'id' | 'venueId' | 'sessionNavigationOptions'>,
): ArenaMapDetailDestination {
  if (detail.venueId) return { kind: 'venue', venueId: detail.venueId }
  return arenaMapDetailDestination(detail, null)
}

export type ArenaMapDetailSurfaceState = 'idle' | 'loading' | 'content' | 'content_stale' | 'blocking_error'

export function arenaMapDetailSurfaceState(input: {
  hasData: boolean
  isInitialLoading: boolean
  hasError: boolean
}): ArenaMapDetailSurfaceState {
  if (input.hasData) return input.hasError ? 'content_stale' : 'content'
  if (input.isInitialLoading) return 'loading'
  if (input.hasError) return 'blocking_error'
  return 'idle'
}

export function arenaMapSheetMaxHeight(windowHeight: number, safeTop: number, safeBottom: number) {
  const safeViewportHeight = Math.max(0, windowHeight - safeTop - safeBottom)
  return Math.max(240, Math.floor(safeViewportHeight * 0.62))
}

/** Normalises MapLibre's visibleBounds into the API's finite non-antimeridian query. */
export function boundedViewportBbox(bounds: unknown): ArenaMapBbox | null {
  if (!Array.isArray(bounds)) return null
  const flat = bounds.length === 4 && bounds.every(Number.isFinite) ? bounds as number[] : null
  const nested = bounds.length === 2 && Array.isArray(bounds[0]) && Array.isArray(bounds[1]) ? [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]] : null
  if (!flat && !nested) return null
  const [west, south, east, north] = (flat ?? nested) as number[]
  if (![west, south, east, north].every(Number.isFinite) || south >= north || west >= east) return null
  const latitudeSpan = Math.min(.5, north - south); const longitudeSpan = Math.min(.5, east - west)
  const latitudeCenter = (north + south) / 2; const longitudeCenter = (east + west) / 2
  return { south: latitudeCenter - latitudeSpan / 2, north: latitudeCenter + latitudeSpan / 2, west: longitudeCenter - longitudeSpan / 2, east: longitudeCenter + longitudeSpan / 2 }
}
