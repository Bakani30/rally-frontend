export type Friend = {
  friendId: string
  displayName: string | null
  handle: string | null
  avatarUrl: string | null
  frameAssetRef: string | null
  addedAt: string
}

export type AddFriendResult = {
  friendId: string
  displayName: string | null
  handle: string | null
  status?: 'pending' | 'accepted'
}

export type FriendRequest = {
  requesterId: string
  displayName: string | null
  handle: string | null
  avatarUrl: string | null
  frameAssetRef: string | null
  requestedAt: string
}
