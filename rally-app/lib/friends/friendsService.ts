import {
  addFriendRecord,
  acceptFriendRequestRecord,
  declineFriendRequestRecord,
  listIncomingFriendRequestsRecord,
  listFriendsRecord,
  listOutgoingFriendRequestsRecord,
  removeFriendRecord,
} from './friendsRepository'
import type { AddFriendResult, Friend, FriendRequest } from '@/types/friends'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function listFriends(): Promise<Friend[]> {
  return listFriendsRecord()
}

function rethrowBlockConflict(error: unknown): never {
  const msg = error instanceof Error ? error.message : String(error)
  if (msg.includes('blocked_friend_conflict')) {
    throw new Error('ไม่สามารถทำรายการกับผู้ใช้ที่บล็อกกันไว้ได้')
  }
  throw error
}

export async function addFriend(rawInput: string): Promise<AddFriendResult> {
  const trimmed = rawInput.trim()
  if (!trimmed) throw new Error('Enter a UID or @handle')

  if (UUID_RE.test(trimmed)) {
    return addFriendRecord({ friendId: trimmed }).catch(rethrowBlockConflict)
  }

  const handle = trimmed.replace(/^@+/, '')
  if (!/^[a-z0-9_]{3,20}$/i.test(handle)) {
    throw new Error('Handle must be 3–20 chars (a–z, 0–9, _) or paste a UID')
  }
  return addFriendRecord({ handle }).catch(rethrowBlockConflict)
}

export function listIncomingFriendRequests(): Promise<FriendRequest[]> {
  return listIncomingFriendRequestsRecord()
}

export function listOutgoingFriendRequests(): Promise<FriendRequest[]> {
  return listOutgoingFriendRequestsRecord()
}

export function acceptFriendRequest(requesterId: string): Promise<void> {
  return acceptFriendRequestRecord(requesterId).catch(rethrowBlockConflict)
}

export function declineFriendRequest(requesterId: string): Promise<void> {
  return declineFriendRequestRecord(requesterId)
}

export function removeFriend(friendId: string): Promise<void> {
  return removeFriendRecord(friendId)
}
