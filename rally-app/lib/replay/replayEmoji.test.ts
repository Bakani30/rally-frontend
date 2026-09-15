import { describe, expect, it } from 'vitest'

import { normalizeReplayEmoji } from './replayEmoji'

describe('normalizeReplayEmoji', () => {
  it('keeps a ZWJ emoji as one value', () => {
    expect(normalizeReplayEmoji('🏃‍♀️ runner')).toBe('🏃‍♀️')
  })

  it('keeps a family emoji as one value', () => {
    expect(normalizeReplayEmoji('👨‍👩‍👧‍👦')).toBe('👨‍👩‍👧‍👦')
  })

  it('trims surrounding whitespace and returns empty for blank input', () => {
    expect(normalizeReplayEmoji('  🔥  ')).toBe('🔥')
    expect(normalizeReplayEmoji('   ')).toBe('')
  })
})
