import { beforeEach, describe, expect, it, vi } from 'vitest'

// Regression for the empty-forever activity-media bucket: React Native's Blob
// (from fetch(file://…)) reaches storage-api as a malformed body → 400 on every
// upload. Uploads must send raw bytes (Uint8Array) like the avatar path does.
const uploadMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({ upload: uploadMock })),
    },
  },
}))

const bytesMock = vi.fn(async () => new Uint8Array([0xff, 0xd8, 0xff]))

vi.mock('expo-file-system', () => ({
  File: class {
    uri: string
    constructor(uri: string) {
      this.uri = uri
    }
    bytes = bytesMock
  },
}))

import { uploadProofMedia } from './proofUploadService'

describe('uploadProofMedia', () => {
  beforeEach(() => {
    uploadMock.mockReset()
    uploadMock.mockResolvedValue({ error: null })
    bytesMock.mockClear()
  })

  it('uploads file bytes as Uint8Array (never a Blob)', async () => {
    const paths = await uploadProofMedia({
      userId: 'user-1',
      matchId: 'session-1',
      folder: 'story',
      assets: [{ uri: 'file:///tmp/story.jpg', mimeType: 'image/jpeg', fileName: 'story.jpg' }],
    })

    expect(uploadMock).toHaveBeenCalledTimes(1)
    const [path, body, options] = uploadMock.mock.calls[0]
    expect(path).toMatch(/^user-1\/session-1\/story\/\d+-0\.jpg$/)
    expect(body).toBeInstanceOf(Uint8Array)
    expect(options).toMatchObject({ contentType: 'image/jpeg', upsert: false })
    expect(paths).toEqual([path])
  })

  it('defaults to the proof folder and infers extension from mime', async () => {
    await uploadProofMedia({
      userId: 'user-1',
      matchId: 'match-9',
      assets: [{ uri: 'file:///tmp/clip.mp4', mimeType: 'video/mp4' }],
    })

    const [path, , options] = uploadMock.mock.calls[0]
    expect(path).toMatch(/^user-1\/match-9\/proof\/\d+-0\.mp4$/)
    expect(options).toMatchObject({ contentType: 'video/mp4' })
  })

  it('uses the local uri when a video picker omits media metadata', async () => {
    await uploadProofMedia({
      userId: 'user-1',
      matchId: 'match-mov',
      assets: [{ uri: 'file:///tmp/clip.mov', mimeType: null, fileName: null }],
    })

    const [path, , options] = uploadMock.mock.calls[0]
    expect(path).toMatch(/^user-1\/match-mov\/proof\/\d+-0\.mov$/)
    expect(options).toMatchObject({ contentType: 'video/quicktime' })
  })

  it('rejects unsupported video MIME instead of uploading it as an image', async () => {
    await expect(
      uploadProofMedia({
        userId: 'user-1',
        matchId: 'match-webm',
        assets: [{ uri: 'file:///tmp/clip.webm', mimeType: 'video/webm', fileName: 'clip.webm' }],
      }),
    ).rejects.toThrow('รองรับเฉพาะวิดีโอ MP4 หรือ MOV')
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('rejects unsupported video uri when picker metadata is missing', async () => {
    await expect(
      uploadProofMedia({
        userId: 'user-1',
        matchId: 'match-webm-uri',
        assets: [{ uri: 'file:///tmp/clip.webm', mimeType: null, fileName: null }],
      }),
    ).rejects.toThrow('รองรับเฉพาะวิดีโอ MP4 หรือ MOV')
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('propagates storage errors', async () => {
    uploadMock.mockResolvedValue({ error: new Error('new row violates row-level security policy') })

    await expect(
      uploadProofMedia({
        userId: 'user-1',
        matchId: 'session-1',
        assets: [{ uri: 'file:///tmp/a.jpg', mimeType: 'image/jpeg' }],
      }),
    ).rejects.toThrow('row-level security')
  })
})
