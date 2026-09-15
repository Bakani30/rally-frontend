import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  acceptFriendRequest,
  addFriend,
  declineFriendRequest,
  listFriends,
  listIncomingFriendRequests,
  listOutgoingFriendRequests,
  removeFriend,
} from '@/lib/friends/friendsService'
import { notificationSummaryRootQueryKey } from '@/lib/notifications/notificationSummary'
import { supabase } from '@/lib/supabase'
import type { AddFriendResult, Friend, FriendRequest } from '@/types/friends'

const FRIENDS_KEY = ['friends'] as const
const INCOMING_FRIEND_REQUESTS_KEY = ['friend-requests', 'incoming'] as const
const OUTGOING_FRIEND_REQUESTS_KEY = ['friend-requests', 'outgoing'] as const

function invalidateFriendData(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: FRIENDS_KEY })
  queryClient.invalidateQueries({ queryKey: INCOMING_FRIEND_REQUESTS_KEY })
  queryClient.invalidateQueries({ queryKey: OUTGOING_FRIEND_REQUESTS_KEY })
  queryClient.invalidateQueries({ queryKey: notificationSummaryRootQueryKey })
}

export function useFriends(enabled: boolean) {
  return useQuery<Friend[]>({
    queryKey: FRIENDS_KEY,
    queryFn: listFriends,
    enabled,
    refetchOnWindowFocus: true,
  })
}

export function useAddFriend() {
  const queryClient = useQueryClient()
  return useMutation<AddFriendResult, Error, string>({
    mutationFn: (input) => addFriend(input),
    onSuccess: () => {
      invalidateFriendData(queryClient)
    },
  })
}

export function useIncomingFriendRequests(enabled: boolean, userId?: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled || !userId) return

    const topic = `incoming-friend-requests:${userId}`

    supabase
      .getChannels()
      .filter((ch) => ch.topic === `realtime:${topic}`)
      .forEach((ch) => void supabase.removeChannel(ch))

    const channel = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_friends', filter: `friend_id=eq.${userId}` },
        () => queryClient.invalidateQueries({ queryKey: INCOMING_FRIEND_REQUESTS_KEY }),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [enabled, queryClient, userId])

  return useQuery<FriendRequest[]>({
    queryKey: INCOMING_FRIEND_REQUESTS_KEY,
    queryFn: listIncomingFriendRequests,
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })
}

export function useOutgoingFriendRequests(enabled: boolean) {
  return useQuery<FriendRequest[]>({
    queryKey: OUTGOING_FRIEND_REQUESTS_KEY,
    queryFn: listOutgoingFriendRequests,
    enabled,
    refetchOnWindowFocus: true,
  })
}

export function useAcceptFriendRequest() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (requesterId) => acceptFriendRequest(requesterId),
    onSuccess: () => invalidateFriendData(queryClient),
  })
}

export function useDeclineFriendRequest() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (requesterId) => declineFriendRequest(requesterId),
    onSuccess: () => invalidateFriendData(queryClient),
  })
}

export function useRemoveFriend() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (friendId) => removeFriend(friendId),
    onSuccess: () => {
      invalidateFriendData(queryClient)
    },
  })
}
