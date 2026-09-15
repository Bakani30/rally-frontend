import { beforeEach, describe, expect, it, vi } from 'vitest'

const open = vi.fn()

vi.mock('react-native-share', () => ({ default: { open } }))

import { shareQuestResult } from './shareQuestResult'

describe('shareQuestResult', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shares a durable MP4 with an explicit MIME type', async () => {
    open.mockResolvedValue({ success: true })
    await expect(shareQuestResult({
      mediaUri: 'file:///document/quest-proof-media/session-1.mp4',
      message: 'เควสผ่าน',
    })).resolves.toBe(true)
    expect(open).toHaveBeenCalledWith(expect.objectContaining({
      url: 'file:///document/quest-proof-media/session-1.mp4',
      type: 'video/mp4',
    }))
  })

  it('returns false instead of leaving the caller hanging on native share failure', async () => {
    open.mockRejectedValue(new Error('native share unavailable'))
    await expect(shareQuestResult({ mediaUri: 'file:///clip.mp4', message: 'เควสผ่าน' }))
      .resolves.toBe(false)
  })
})
