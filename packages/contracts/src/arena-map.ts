import { z } from 'zod'

/** Story/design vocabulary. `conquest_arena` is deliberately not emitted by runtime. */
export const arenaMapPinStoryTypeSchema = z.enum([
  'official_venue',
  'community_venue',
  'ad_hoc_arena',
  'conquest_arena',
])
export type ArenaMapPinStoryType = z.infer<typeof arenaMapPinStoryTypeSchema>

/** Runtime is intentionally closed until Conquest has an approved public contract. */
export const arenaMapPinTypeSchema = z.enum([
  'official_venue',
  'community_venue',
  'ad_hoc_arena',
])
export type ArenaMapPinType = z.infer<typeof arenaMapPinTypeSchema>

export const arenaMapPublicIdentitySchema = z.object({
  label: z.string().min(1).max(80),
  partyAvatarUrl: z.string().url().nullable(),
  hostAvatarUrl: z.string().url().nullable(),
  initials: z.string().min(1).max(4),
  affiliation: z.string().max(80).nullable().optional(),
}).strict()
export type ArenaMapPublicIdentity = z.infer<typeof arenaMapPublicIdentitySchema>

export const arenaMapCoordinateSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
}).strict()

/** Bounded-map response: no dynamic state, actor IDs, or sensitive operational data. */
export const arenaMapPinSummarySchema = z.object({
  id: z.string().regex(/^(venue|session):[0-9a-f-]{36}$/),
  type: arenaMapPinTypeSchema,
  coordinate: arenaMapCoordinateSchema,
  publicIdentity: arenaMapPublicIdentitySchema,
  venueId: z.string().uuid().nullable(),
  sessionId: z.string().uuid().nullable(),
  isFavorite: z.boolean(),
}).strict()
export type ArenaMapPinSummary = z.infer<typeof arenaMapPinSummarySchema>

export const arenaMapPinDetailSchema = z.object({
  id: z.string().regex(/^(venue|session):[0-9a-f-]{36}$/),
  name: z.string().min(1).max(80),
  type: arenaMapPinTypeSchema,
  format: z.enum(['1v1', '2v2', '3v3', '5v5']).nullable(),
  venueId: z.string().uuid().nullable(),
  isFavorite: z.boolean(),
  ownerOrHost: arenaMapPublicIdentitySchema,
  liveScore: z.object({
    homeLabel: z.string().min(1).max(40), homeScore: z.number().int().min(0),
    awayLabel: z.string().min(1).max(40), awayScore: z.number().int().min(0),
  }).strict().nullable(),
  queuePreview: z.object({ teams: z.array(z.string().min(1).max(40)).max(2), remainingCount: z.number().int().min(0) }).strict(),
  deadline: z.object({ kind: z.enum(['drain', 'session_expiry', 'conquest_defence']), at: z.string().datetime() }).strict().nullable(),
  additionalSessionCount: z.number().int().min(0),
  sessionNavigationOptions: z.array(z.object({ sessionId: z.string().regex(/^session:[0-9a-f-]{36}$/), label: z.string().min(1).max(80) }).strict()).max(20),
  serverTime: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict()
export type ArenaMapPinDetail = z.infer<typeof arenaMapPinDetailSchema>

export const arenaMapSourceHealthSchema = z.object({ venues: z.enum(['ok', 'failed']), adHocArenas: z.enum(['ok', 'failed']) }).strict()
export type ArenaMapSourceHealth = z.infer<typeof arenaMapSourceHealthSchema>

export const arenaMapSummaryResponseSchema = z.object({ pins: z.array(arenaMapPinSummarySchema).max(200), sourceHealth: arenaMapSourceHealthSchema, serverTime: z.string().datetime() }).strict()
export type ArenaMapSummaryResponse = z.infer<typeof arenaMapSummaryResponseSchema>
