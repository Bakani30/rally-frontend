import { describe, expect, it } from 'vitest'

import { speakRunVoiceCue } from './runSessionVoiceCue'

describe('speakRunVoiceCue', () => {
  it('returns true after speaking the cue', async () => {
    const spoken: Array<{ utterance: string; language?: string; rate?: number }> = []

    const result = await speakRunVoiceCue('1 kilometre', async () => ({
      speak: (utterance, options) => {
        spoken.push({ utterance, ...options })
      },
    }))

    expect(result).toBe(true)
    expect(spoken).toEqual([{ utterance: '1 kilometre', language: 'en-US', rate: 1 }])
  })

  it('returns false when the speech module cannot be loaded', async () => {
    await expect(speakRunVoiceCue('1 kilometre', async () => {
      throw new Error('Requiring unknown module "2639"')
    })).resolves.toBe(false)
  })

  it('returns false when the native speech call throws', async () => {
    await expect(speakRunVoiceCue('1 kilometre', async () => ({
      speak: () => {
        throw new Error('Speech unavailable')
      },
    }))).resolves.toBe(false)
  })
})
