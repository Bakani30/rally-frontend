import { describe, expect, it } from 'vitest'

import { toLocalFileUri } from './localFileUri'

describe('toLocalFileUri', () => {
  it('keeps an iOS file URI unchanged', () => {
    expect(toLocalFileUri('file:///tmp/clip.mp4')).toBe('file:///tmp/clip.mp4')
  })

  it('converts a native filesystem path to a file URI', () => {
    expect(toLocalFileUri('/tmp/clip.mp4')).toBe('file:///tmp/clip.mp4')
  })
})
