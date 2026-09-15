import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./questProofRepository', () => ({
  startSession: vi.fn(),
  requestUpload: vi.fn(),
  submitSession: vi.fn(),
  uploadToSignedUrl: vi.fn(),
}))

import {
  requestUpload,
  startSession,
  submitSession,
  uploadToSignedUrl,
} from './questProofRepository'
import {
  requestQuestUpload,
  startQuestSession,
  submitQuestProof,
  uploadAndSubmitCapture,
} from './questProofService'

const mStart = startSession as unknown as ReturnType<typeof vi.fn>
const mRequest = requestUpload as unknown as ReturnType<typeof vi.fn>
const mSubmit = submitSession as unknown as ReturnType<typeof vi.fn>
const mUpload = uploadToSignedUrl as unknown as ReturnType<typeof vi.fn>

beforeEach(() => vi.clearAllMocks())

describe('startQuestSession', () => {
  it('requires a templateId', () => {
    expect(() => startQuestSession('')).toThrow('templateId required')
  })
  it('delegates to the repository', async () => {
    mStart.mockResolvedValue({ id: 's1' })
    await startQuestSession('tpl-1')
    expect(mStart).toHaveBeenCalledWith('tpl-1')
  })
})

describe('requestQuestUpload', () => {
  it('requires a sessionId', () => {
    expect(() => requestQuestUpload('', 'video/mp4')).toThrow('sessionId required')
  })
})

describe('submitQuestProof', () => {
  it('requires a sessionId', () => {
    expect(() => submitQuestProof({ sessionId: '', hasMedia: false })).toThrow('sessionId required')
  })
  it('requires mediaExt when hasMedia is true', () => {
    expect(() => submitQuestProof({ sessionId: 's1', hasMedia: true })).toThrow('mediaExt required when hasMedia')
  })
  it('delegates a valid submit', async () => {
    mSubmit.mockResolvedValue({ id: 's1', status: 'claimed' })
    await submitQuestProof({ sessionId: 's1', hasMedia: true, mediaExt: 'mp4' })
    expect(mSubmit).toHaveBeenCalled()
  })
})

describe('uploadAndSubmitCapture', () => {
  it('runs request → upload → submit in order with the right content type', async () => {
    mRequest.mockResolvedValue({ signedUrl: 'https://up', token: 't', path: 'u/s.mp4' })
    mUpload.mockResolvedValue(undefined)
    mSubmit.mockResolvedValue({ id: 's1', status: 'claimed', points_granted: 30 })

    const result = await uploadAndSubmitCapture({ sessionId: 's1', fileUri: 'file:///c.mp4', mediaExt: 'mp4' })

    expect(mRequest).toHaveBeenCalledWith('s1', 'video/mp4')
    expect(mUpload).toHaveBeenCalledWith('https://up', 'file:///c.mp4', 'video/mp4')
    expect(mSubmit).toHaveBeenCalledWith({ sessionId: 's1', sensorSummary: {}, hasMedia: true, mediaExt: 'mp4' })
    expect(result.points_granted).toBe(30)
  })

  it('does not submit if the upload fails', async () => {
    mRequest.mockResolvedValue({ signedUrl: 'https://up', token: 't', path: 'u/s.mp4' })
    mUpload.mockRejectedValue(new Error('อัปโหลดไม่สำเร็จ'))
    await expect(
      uploadAndSubmitCapture({ sessionId: 's1', fileUri: 'file:///c.mp4', mediaExt: 'mp4' }),
    ).rejects.toThrow()
    expect(mSubmit).not.toHaveBeenCalled()
  })
})
