import {
  fetchFriendCandidateRecords,
  type FriendCandidateRecord,
} from './userSearchRepository'

export type FriendCandidate = {
  id: string
  displayName: string
  handle: string | null
  avatarUrl: string | null
  frameAssetRef: string | null
}

export async function getFriendCandidates(): Promise<FriendCandidate[]> {
  const records = await fetchFriendCandidateRecords()
  return records.map(toFriendCandidate)
}

function toFriendCandidate(record: FriendCandidateRecord): FriendCandidate {
  return {
    id: record.id,
    displayName: record.displayName,
    handle: record.handle,
    avatarUrl: record.avatarUrl,
    frameAssetRef: record.frameAssetRef,
  }
}
