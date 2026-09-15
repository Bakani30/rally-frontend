import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  canManageProfileHighlightVideo,
  deleteProfileHighlightVideo,
  saveProfileHighlightVideo,
} from './profileHighlightService'

const mocks = vi.hoisted(() => ({
  createProfileHighlightUrl: vi.fn(),
  deleteProfileHighlightVideoRow: vi.fn(),
  fetchProfileHighlightVideo: vi.fn(),
  isActiveProfileMatchParticipant: vi.fn(),
  removeProfileHighlightStorage: vi.fn(),
  uploadProofMedia: vi.fn(),
  upsertProfileHighlightVideo: vi.fn(),
}))

vi.mock('@/lib/match/proofUploadService', () => ({
  uploadProofMedia: mocks.uploadProofMedia,
}))

vi.mock('./profileHighlightRepository', () => ({
  createProfileHighlightUrl: mocks.createProfileHighlightUrl,
  deleteProfileHighlightVideoRow: mocks.deleteProfileHighlightVideoRow,
  fetchProfileHighlightVideo: mocks.fetchProfileHighlightVideo,
  isActiveProfileMatchParticipant: mocks.isActiveProfileMatchParticipant,
  removeProfileHighlightStorage: mocks.removeProfileHighlightStorage,
  upsertProfileHighlightVideo: mocks.upsertProfileHighlightVideo,
}))

const previousRow = {
  user_id: 'user-1',
  match_id: 'match-1',
  storage_path: 'user-1/match-1/profile-highlights/old.mp4',
  duration_seconds: 12,
  mime_type: 'video/mp4',
  created_at: '2026-07-21T00:00:00.000Z',
  updated_at: '2026-07-21T00:00:00.000Z',
}

describe('profile highlight video service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchProfileHighlightVideo.mockResolvedValue(null)
    mocks.isActiveProfileMatchParticipant.mockResolvedValue(true)
    mocks.removeProfileHighlightStorage.mockResolvedValue(undefined)
    mocks.deleteProfileHighlightVideoRow.mockResolvedValue(undefined)
    mocks.uploadProofMedia.mockResolvedValue(['user-1/match-1/profile-highlights/new.mp4'])
    mocks.upsertProfileHighlightVideo.mockResolvedValue({
      ...previousRow,
      storage_path: 'user-1/match-1/profile-highlights/new.mp4',
      duration_seconds: 45,
    })
    mocks.createProfileHighlightUrl.mockResolvedValue('signed://new')
  })

  it.each([
    ['video/mp4', 'clip.mp4'],
    ['video/quicktime', 'clip.mov'],
  ] as const)('accepts %s highlights up to 45 seconds', async (mimeType, fileName) => {
    mocks.fetchProfileHighlightVideo
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        ...previousRow,
        storage_path: 'user-1/match-1/profile-highlights/new.mp4',
        duration_seconds: 45,
        mime_type: mimeType,
      })

    await saveProfileHighlightVideo({
      userId: 'user-1',
      matchId: 'match-1',
      asset: { uri: `file:///tmp/${fileName}`, mimeType, fileName },
      durationSeconds: 45,
    })

    expect(mocks.uploadProofMedia).toHaveBeenCalledWith({
      userId: 'user-1',
      matchId: 'match-1',
      folder: 'profile-highlights',
      assets: [{ uri: `file:///tmp/${fileName}`, mimeType, fileName }],
    })
  })

  it('infers a supported video type from the uri when picker metadata is absent', async () => {
    mocks.fetchProfileHighlightVideo
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        ...previousRow,
        storage_path: 'user-1/match-1/profile-highlights/new.mov',
        duration_seconds: 10,
        mime_type: 'video/quicktime',
      })

    await saveProfileHighlightVideo({
      userId: 'user-1',
      matchId: 'match-1',
      asset: { uri: 'file:///tmp/clip.mov', mimeType: null, fileName: null },
      durationSeconds: 10,
    })

    expect(mocks.uploadProofMedia).toHaveBeenCalledWith({
      userId: 'user-1',
      matchId: 'match-1',
      folder: 'profile-highlights',
      assets: [{ uri: 'file:///tmp/clip.mov', mimeType: 'video/quicktime', fileName: null }],
    })
  })

  it('rejects unsupported media before uploading', async () => {
    await expect(
      saveProfileHighlightVideo({
        userId: 'user-1',
        matchId: 'match-1',
        asset: { uri: 'file:///tmp/clip.webm', mimeType: 'video/webm', fileName: 'clip.webm' },
        durationSeconds: 10,
      }),
    ).rejects.toThrow('รองรับเฉพาะวิดีโอ MP4 หรือ MOV')

    expect(mocks.uploadProofMedia).not.toHaveBeenCalled()
  })

  it('rejects durations above 45 seconds before uploading', async () => {
    await expect(
      saveProfileHighlightVideo({
        userId: 'user-1',
        matchId: 'match-1',
        asset: { uri: 'file:///tmp/clip.mp4', mimeType: 'video/mp4', fileName: 'clip.mp4' },
        durationSeconds: 46,
      }),
    ).rejects.toThrow('45 seconds or shorter')

    expect(mocks.uploadProofMedia).not.toHaveBeenCalled()
  })

  it('deletes only the clip row that was read before storage cleanup', async () => {
    mocks.fetchProfileHighlightVideo.mockResolvedValue(previousRow)

    await deleteProfileHighlightVideo('user-1', 'match-1')

    expect(mocks.removeProfileHighlightStorage).toHaveBeenCalledWith(previousRow.storage_path)
    expect(mocks.deleteProfileHighlightVideoRow).toHaveBeenCalledWith(
      'user-1',
      'match-1',
      previousRow.storage_path,
    )
  })

  it('does not grant match-detail management access to a non-participant', async () => {
    mocks.isActiveProfileMatchParticipant.mockResolvedValue(false)

    await expect(canManageProfileHighlightVideo('user-1', 'match-1')).resolves.toBe(false)
    expect(mocks.isActiveProfileMatchParticipant).toHaveBeenCalledWith('user-1', 'match-1')
  })
})
