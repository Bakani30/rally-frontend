import { describe, expect, it, vi } from 'vitest'

import { saveRunStoryImage } from './runStoryMediaService'

describe('saveRunStoryImage', () => {
  it('uploads the generated image and inserts activity media as a photo by default', async () => {
    const uploadMedia = vi.fn().mockResolvedValue('user-1/session-1/story/story.jpg')
    const insertMedia = vi.fn().mockResolvedValue(undefined)

    const result = await saveRunStoryImage(
      {
        userId: 'user-1',
        activitySessionId: 'session-1',
        mediaUri: 'file:///tmp/story.jpg',
      },
      {
        uploadMedia,
        insertMedia,
        now: () => new Date('2026-05-11T09:00:00.000Z'),
      },
    )

    expect(result).toEqual({ storagePath: 'user-1/session-1/story/story.jpg' })
    expect(uploadMedia).toHaveBeenCalledWith({
      userId: 'user-1',
      activitySessionId: 'session-1',
      mediaUri: 'file:///tmp/story.jpg',
      kind: 'photo',
    })
    expect(insertMedia).toHaveBeenCalledWith({
      activitySessionId: 'session-1',
      userId: 'user-1',
      storagePath: 'user-1/session-1/story/story.jpg',
      capturedAt: '2026-05-11T09:00:00.000Z',
      mediaType: 'photo',
    })
  })

  it('uploads and inserts a video story when kind is video', async () => {
    const uploadMedia = vi.fn().mockResolvedValue('user-1/session-1/story/story.mp4')
    const insertMedia = vi.fn().mockResolvedValue(undefined)

    const result = await saveRunStoryImage(
      {
        userId: 'user-1',
        activitySessionId: 'session-1',
        mediaUri: 'file:///tmp/story.mp4',
        kind: 'video',
      },
      {
        uploadMedia,
        insertMedia,
        now: () => new Date('2026-05-11T09:00:00.000Z'),
      },
    )

    expect(result).toEqual({ storagePath: 'user-1/session-1/story/story.mp4' })
    expect(uploadMedia).toHaveBeenCalledWith({
      userId: 'user-1',
      activitySessionId: 'session-1',
      mediaUri: 'file:///tmp/story.mp4',
      kind: 'video',
    })
    expect(insertMedia).toHaveBeenCalledWith({
      activitySessionId: 'session-1',
      userId: 'user-1',
      storagePath: 'user-1/session-1/story/story.mp4',
      capturedAt: '2026-05-11T09:00:00.000Z',
      mediaType: 'video',
    })
  })

  it('forwards an explicit MIME for video URIs without an extension', async () => {
    const uploadMedia = vi.fn().mockResolvedValue('user-1/session-1/story/story.mov')
    const insertMedia = vi.fn().mockResolvedValue(undefined)

    await saveRunStoryImage(
      {
        userId: 'user-1',
        activitySessionId: 'session-1',
        mediaUri: 'file:///tmp/story',
        mediaMimeType: 'video/quicktime',
        kind: 'video',
      },
      {
        uploadMedia,
        insertMedia,
        now: () => new Date('2026-05-11T09:00:00.000Z'),
      },
    )

    expect(uploadMedia).toHaveBeenCalledWith({
      userId: 'user-1',
      activitySessionId: 'session-1',
      mediaUri: 'file:///tmp/story',
      kind: 'video',
      mediaMimeType: 'video/quicktime',
    })
  })
})
