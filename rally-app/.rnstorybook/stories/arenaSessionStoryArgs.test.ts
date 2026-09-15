import { describe, expect, it } from 'vitest'

import { ARENA_SESSION_STORY_STATES, parseArenaSessionStoryArgs } from './arenaSessionStoryArgs'

describe('Arena session Storybook args', () => {
  it('accepts each explicitly supported fixture state', () => {
    for (const state of ARENA_SESSION_STORY_STATES) {
      expect(parseArenaSessionStoryArgs({ state })).toEqual({ state })
    }
  })

  it.each([
    undefined,
    null,
    [],
    ['ready_to_start'],
    () => undefined,
    { state: 'not_a_fixture_state' },
    { state: ['ready_to_start'] },
    { state: 'ready_to_start', unsupported: true },
    { state: 'ready_to_start', onPress: () => undefined },
  ])('rejects invalid raw args before destructuring: %p', (input) => {
    expect(() => parseArenaSessionStoryArgs(input)).toThrowError(/exactly one supported state/i)
  })

  it('recovers from invalid args when a valid selection is supplied afterward', () => {
    expect(() => parseArenaSessionStoryArgs({ state: 'invalid' })).toThrow()
    expect(parseArenaSessionStoryArgs({ state: 'in_progress' })).toEqual({ state: 'in_progress' })
  })
})
