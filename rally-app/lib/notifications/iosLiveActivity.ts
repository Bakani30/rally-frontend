import type { LiveSurfaceSnapshot } from './liveSurface'

export type RallyLiveActivityAttributes = {
  surfaceId: string
  kind: LiveSurfaceSnapshot['kind']
  matchId: string | null
  route: string
}

export type RallyLiveActivityContentState = {
  title: string
  actorName: string
  actorAvatarUrl: string | null
  activityType: string | null
  expiresAt: string | null
}

export type RallyLiveActivityPayload = {
  attributes: RallyLiveActivityAttributes
  contentState: RallyLiveActivityContentState
  staleDate: string | null
}

export function liveSurfaceToIosActivityPayload(
  snapshot: LiveSurfaceSnapshot,
): RallyLiveActivityPayload {
  const surfaceId = snapshot.matchId
    ? `match-${snapshot.matchId}`
    : `${snapshot.kind}-${stableHash(snapshot.route)}`

  return {
    attributes: {
      surfaceId,
      kind: snapshot.kind,
      matchId: snapshot.matchId,
      route: snapshot.route,
    },
    contentState: {
      title: snapshot.title,
      actorName: snapshot.actorName,
      actorAvatarUrl: snapshot.actorAvatarUrl,
      activityType: snapshot.activityType,
      expiresAt: snapshot.expiresAt,
    },
    staleDate: snapshot.expiresAt,
  }
}

function stableHash(value: string): string {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash).toString(36)
}
