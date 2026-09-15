import type { ArenaLifecycleState } from '@/lib/dev-preview/arenaLifecyclePreview'

/**
 * Storybook's fixture menu is intentionally narrower than the preview route's
 * full lifecycle registry. Keep this list local to the display story.
 */
export const ARENA_SESSION_STORY_STATES = [
  'paired_stake',
  'ready_to_start',
  'in_progress',
  'settled_winner',
  'settled_loser',
  'captain_decision_required',
  'teammate_waiting',
  'retired',
  'draining',
  'closed',
] as const satisfies readonly ArenaLifecycleState[]

export type ArenaSessionStoryState = (typeof ARENA_SESSION_STORY_STATES)[number]

export type ArenaSessionStoryArgs = {
  state: ArenaSessionStoryState
}

const supportedStates = new Set<string>(ARENA_SESSION_STORY_STATES)

export function parseArenaSessionStoryArgs(input: unknown): { state: ArenaSessionStoryState } {
  if (!isPlainArgsRecord(input) || Reflect.ownKeys(input).length !== 1 || !Object.hasOwn(input, 'state')) {
    throw new Error('Arena session Storybook args must contain exactly one supported state')
  }

  const { state } = input
  if (typeof state !== 'string' || !supportedStates.has(state)) {
    throw new Error('Arena session Storybook args must contain exactly one supported state')
  }

  return { state: state as ArenaSessionStoryState }
}

function isPlainArgsRecord(input: unknown): input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return false
  const prototype = Object.getPrototypeOf(input)
  return prototype === Object.prototype || prototype === null
}
