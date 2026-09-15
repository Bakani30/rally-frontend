import type { FriendCandidate } from './friendCandidateService'

/**
 * Development-only visual fixture for the Friends recommendation rail.
 * Keep these records public-only. Static assets are only used when the explicit
 * development candidate mock flag is enabled; real candidates remain URL-backed.
 */
export const FRIEND_CANDIDATE_MOCKS: FriendCandidate[] = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    displayName: 'ฟ้า',
    handle: null,
    avatarUrl: require('../../assets/images/friends/mock-friend-1.jpg') as unknown as string,
    frameAssetRef: null,
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    displayName: 'เอม',
    handle: null,
    avatarUrl: require('../../assets/images/friends/mock-friend-2.jpg') as unknown as string,
    frameAssetRef: null,
  },
  {
    id: '00000000-0000-4000-8000-000000000103',
    displayName: 'เจลลี่',
    handle: null,
    avatarUrl: require('../../assets/images/friends/mock-friend-3.jpg') as unknown as string,
    frameAssetRef: null,
  },
  {
    id: '00000000-0000-4000-8000-000000000104',
    displayName: 'พลอย',
    handle: null,
    avatarUrl: require('../../assets/images/friends/mock-friend-4.jpg') as unknown as string,
    frameAssetRef: null,
  },
  {
    id: '00000000-0000-4000-8000-000000000105',
    displayName: 'เอ็มหมวย',
    handle: null,
    avatarUrl: require('../../assets/images/friends/mock-friend-5.jpg') as unknown as string,
    frameAssetRef: null,
  },
]
