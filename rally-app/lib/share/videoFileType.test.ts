import { describe, expect, it } from 'vitest'

import {
  extensionForUri,
  isVideoUri,
  supportedVideoMimeTypeForUri,
  videoExtensionForMime,
  videoMimeTypeForUri,
} from './videoFileType'

describe('video file type helpers', () => {
  it('keeps mp4 output aligned with video/mp4', () => {
    expect(videoMimeTypeForUri('file:///tmp/rally-story.mp4')).toBe('video/mp4')
    expect(videoExtensionForMime('video/mp4')).toBe('mp4')
  })

  it('keeps iOS mov output aligned with video/quicktime', () => {
    expect(videoMimeTypeForUri('file:///tmp/rally-story.mov')).toBe('video/quicktime')
    expect(videoExtensionForMime('video/quicktime')).toBe('mov')
  })

  it('falls back to mp4 when the generated uri has no usable extension', () => {
    expect(videoMimeTypeForUri('file:///tmp/rally-story')).toBe('video/mp4')
  })

  it('does not treat an unsupported extension as a supported video', () => {
    expect(supportedVideoMimeTypeForUri('file:///tmp/rally-story.webm')).toBeNull()
    expect(extensionForUri('file:///tmp/rally-story.webm?cache=1')).toBe('webm')
    expect(isVideoUri('file:///tmp/rally-story.webm')).toBe(true)
  })
})
