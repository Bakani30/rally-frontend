import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/invokeFunction', () => ({
  invokeAuthenticatedFunction: vi.fn(),
}))
vi.mock('@/lib/supabase/edgeError', () => ({
  // Surface a throwable so repositories' error branches are exercised without
  // depending on the real FunctionsHttpError parsing.
  extractEdgeFunctionError: vi.fn(async (_err: unknown, fallback: string) => new Error(fallback)),
}))
const bytesMock = vi.fn(async () => new Uint8Array([0x00, 0x01, 0x02]))
vi.mock('expo-file-system', () => ({
  File: class {
    constructor(readonly uri: string) {}
    bytes = bytesMock
  },
}))

import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import {
  requestUpload,
  startSession,
  submitSession,
  uploadToSignedUrl,
} from './questProofRepository'

const mockInvoke = invokeAuthenticatedFunction as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('startSession', () => {
  it('sends the start action with templateId and returns the session', async () => {
    mockInvoke.mockResolvedValue({ data: { id: 's1', status: 'live_session' }, error: null })
    const session = await startSession('tpl-1')
    expect(mockInvoke).toHaveBeenCalledWith('quest-proof', {
      body: { action: 'start', templateId: 'tpl-1' },
    })
    expect(session.id).toBe('s1')
  })

  it('throws when the edge returns an error', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { code: 'attempts_exhausted' } })
    await expect(startSession('tpl-1')).rejects.toThrow()
  })

  it('throws when the edge returns no data', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: null })
    await expect(startSession('tpl-1')).rejects.toThrow()
  })
})

describe('requestUpload', () => {
  it('sends request_upload with sessionId + contentType', async () => {
    mockInvoke.mockResolvedValue({
      data: { signedUrl: 'https://up', token: 'tok', path: 'u/s.mp4' },
      error: null,
    })
    const target = await requestUpload('sess-1', 'video/mp4')
    expect(mockInvoke).toHaveBeenCalledWith('quest-proof', {
      body: { action: 'request_upload', sessionId: 'sess-1', contentType: 'video/mp4' },
    })
    expect(target.signedUrl).toBe('https://up')
  })

  it('throws when the edge returns an error', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { code: 'x' } })
    await expect(requestUpload('sess-1', 'image/jpeg')).rejects.toThrow()
  })
})

describe('submitSession', () => {
  it('defaults sensorSummary to {} and mediaExt to null', async () => {
    mockInvoke.mockResolvedValue({ data: { id: 's1', status: 'failed' }, error: null })
    await submitSession({ sessionId: 'sess-1', hasMedia: false })
    expect(mockInvoke).toHaveBeenCalledWith('quest-proof', {
      body: { action: 'submit', sessionId: 'sess-1', sensorSummary: {}, hasMedia: false, mediaExt: null },
    })
  })

  it('passes through sensorSummary + mediaExt when provided', async () => {
    mockInvoke.mockResolvedValue({ data: { id: 's1', status: 'claimed' }, error: null })
    await submitSession({
      sessionId: 'sess-2',
      sensorSummary: { duration_s: 1000, has_motion: true },
      hasMedia: true,
      mediaExt: 'mp4',
    })
    expect(mockInvoke).toHaveBeenCalledWith('quest-proof', {
      body: {
        action: 'submit',
        sessionId: 'sess-2',
        sensorSummary: { duration_s: 1000, has_motion: true },
        hasMedia: true,
        mediaExt: 'mp4',
      },
    })
  })

  it('throws when the edge returns an error', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { code: 'session_expired' } })
    await expect(submitSession({ sessionId: 'sess-1', hasMedia: false })).rejects.toThrow()
  })
})

describe('uploadToSignedUrl', () => {
  it('reads raw file bytes then PUTs them with the content-type', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await uploadToSignedUrl('https://signed-url', 'file:///clip.mp4', 'video/mp4')

    expect(bytesMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('https://signed-url', {
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4' },
      body: expect.any(Uint8Array),
    })
  })

  it('throws when reading the local file fails', async () => {
    bytesMock.mockRejectedValueOnce(new Error('file missing'))
    await expect(uploadToSignedUrl('https://signed', 'file:///x', 'video/mp4')).rejects.toThrow()
  })

  it('throws when the PUT upload fails', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 500 })
    vi.stubGlobal('fetch', fetchMock)
    await expect(uploadToSignedUrl('https://signed', 'file:///x', 'video/mp4')).rejects.toThrow()
  })
})
