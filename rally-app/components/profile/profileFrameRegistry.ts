import type { ImageProps } from 'expo-image'
import type { ViewStyle } from 'react-native'
import { RallyPalette } from '@/constants/theme'
import { getRankFrameSvg } from '@/lib/ranks/rankFrameSvg'
import { TIER_THRESHOLDS, type Tier } from '@/lib/leaderboard/tierRules'

export type ProfileFrameLayerAnimation =
  | {
      kind: 'pulse'
      durationMs?: number
      minOpacity?: number
      maxOpacity?: number
      minScale?: number
      maxScale?: number
    }
  | {
      kind: 'breathe'
      durationMs?: number
      minOpacity?: number
      maxOpacity?: number
    }
  | {
      kind: 'spin'
      durationMs?: number
      direction?: 'cw' | 'ccw'
      opacity?: number
    }

export type ProfileFrameLayer = {
  id: string
  sizeOffset: number
  source?: ImageProps['source']
  contentFit?: ImageProps['contentFit']
  // Inline SVG markup rendered via SvgXml (rank frames). Takes precedence over `source`.
  svgXml?: string
  // Size the layer by the rank-frame inner-hole ratio instead of `sizeOffset`, so
  // the ring hugs the avatar at any size. Implies a square, avatar-centered layer.
  fitInnerToAvatar?: boolean
  // Draw this layer above the avatar (ring overlaps the photo rim) instead of behind it.
  aboveAvatar?: boolean
  style?: ViewStyle
  animation?: ProfileFrameLayerAnimation
}

export type ProfileFrameDefinition = {
  assetRefs: string[]
  framePadding: number
  avatarStyle: ViewStyle
  layers: ProfileFrameLayer[]
}

// The unranked / no-cosmetic fallback renders a bare avatar — no red ring, no
// aura. A red default aura wrongly reads as a rank or cosmetic the player hasn't
// unlocked, so every profile surface stays clean until a real frame is equipped.
const DEFAULT_FRAME: ProfileFrameDefinition = {
  assetRefs: ['frame/default', 'frame_rookie'],
  framePadding: 4,
  avatarStyle: { borderWidth: 0 },
  layers: [],
}

const PROFILE_FRAME_DEFINITIONS: ProfileFrameDefinition[] = [
  DEFAULT_FRAME,
  {
    assetRefs: ['frame/red_glow', 'frame_fire'],
    framePadding: 6,
    avatarStyle: { borderColor: RallyPalette.red, borderWidth: 3 },
    layers: [
      {
        id: 'red-glow',
        sizeOffset: 40,
        style: { backgroundColor: RallyPalette.red, opacity: 0.36 },
        animation: {
          kind: 'pulse',
          durationMs: 1600,
          minOpacity: 0.24,
          maxOpacity: 0.48,
          minScale: 0.96,
          maxScale: 1.06,
        },
      },
    ],
  },
  {
    assetRefs: ['frame/sprint_lane'],
    framePadding: 8,
    avatarStyle: { borderColor: RallyPalette.orange, borderWidth: 3 },
    layers: [
      {
        id: 'sprint-glow',
        sizeOffset: 42,
        style: { backgroundColor: RallyPalette.orange, opacity: 0.24 },
        animation: {
          kind: 'breathe',
          durationMs: 1400,
          minOpacity: 0.14,
          maxOpacity: 0.34,
        },
      },
      {
        id: 'sprint-dash',
        sizeOffset: 18,
        style: {
          borderColor: RallyPalette.amber,
          borderStyle: 'dashed',
          borderWidth: 2,
          opacity: 0.86,
        },
        animation: { kind: 'spin', durationMs: 5200, direction: 'cw', opacity: 0.86 },
      },
    ],
  },
  {
    assetRefs: ['frame/verified_pulse'],
    framePadding: 8,
    avatarStyle: { borderColor: RallyPalette.green, borderWidth: 3 },
    layers: [
      {
        id: 'verified-glow',
        sizeOffset: 44,
        style: { backgroundColor: RallyPalette.green, opacity: 0.24 },
        animation: {
          kind: 'pulse',
          durationMs: 1800,
          minOpacity: 0.12,
          maxOpacity: 0.34,
          minScale: 0.94,
          maxScale: 1.08,
        },
      },
      {
        id: 'verified-ring',
        sizeOffset: 12,
        style: { borderColor: RallyPalette.green, borderWidth: 2, opacity: 0.78 },
      },
    ],
  },
  {
    assetRefs: ['frame/champion_vault'],
    framePadding: 9,
    avatarStyle: { borderColor: RallyPalette.amber, borderWidth: 3 },
    layers: [
      {
        id: 'champion-vault',
        sizeOffset: 22,
        style: { borderColor: RallyPalette.amber, borderStyle: 'dashed', borderWidth: 3 },
        animation: { kind: 'spin', durationMs: 7400, direction: 'ccw', opacity: 0.9 },
      },
      {
        id: 'champion-glow',
        sizeOffset: 48,
        style: { backgroundColor: RallyPalette.amber, opacity: 0.2 },
        animation: {
          kind: 'breathe',
          durationMs: 1900,
          minOpacity: 0.1,
          maxOpacity: 0.28,
        },
      },
    ],
  },
]

const PROFILE_FRAME_BY_ASSET_REF = new Map<string, ProfileFrameDefinition>(
  PROFILE_FRAME_DEFINITIONS.flatMap((frame) => (
    frame.assetRefs.map((assetRef) => [assetRef, frame] as const)
  )),
)

const VALID_TIERS = new Set<string>(TIER_THRESHOLDS.map((t) => t.tier))
const RANK_FRAME_PREFIX = 'rank_frame_'

function isTier(value: string): value is Tier {
  return VALID_TIERS.has(value)
}

// Equipped rank frames use the code `rank_frame_<tier>`; their visible reward is
// the pre-colored tier ring, rendered as a single inline-SVG layer that hugs the
// avatar (see rankFrameSvg.ts). Returns null for any non-rank-frame or unknown tier
// so the caller can fall through to the style-based registry / default.
function resolveRankFrameDefinition(assetRef: string): ProfileFrameDefinition | null {
  if (!assetRef.startsWith(RANK_FRAME_PREFIX)) return null
  const tier = assetRef.slice(RANK_FRAME_PREFIX.length)
  if (!isTier(tier)) return null

  return {
    assetRefs: [assetRef],
    framePadding: 10,
    // SVG supplies the ring; keep the avatar shell borderless so the art reads clean.
    avatarStyle: { borderColor: 'transparent', borderWidth: 0 },
    layers: [
      {
        id: `rank-frame-${tier}`,
        sizeOffset: 0,
        svgXml: getRankFrameSvg(tier),
        fitInnerToAvatar: true,
        aboveAvatar: true,
      },
    ],
  }
}

export function getProfileFrameDefinition(assetRef: string | null | undefined) {
  if (!assetRef) return DEFAULT_FRAME
  return (
    resolveRankFrameDefinition(assetRef) ??
    PROFILE_FRAME_BY_ASSET_REF.get(assetRef) ??
    DEFAULT_FRAME
  )
}

// True when no real cosmetic frame is equipped (null or the default/rookie ring).
export function isDefaultProfileFrame(assetRef: string | null | undefined) {
  return getProfileFrameDefinition(assetRef) === DEFAULT_FRAME
}
