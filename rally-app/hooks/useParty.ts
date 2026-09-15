import { useRef } from 'react'
import * as Crypto from 'expo-crypto'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { partyQueryKeys } from '@/lib/party/partyQueryKeys'
import { createPartyCreateAttempt } from '@/lib/party/partyRules'
import { partyService } from '@/lib/party/partyService'
import type { CreatePartyInput, PartyActionOutput } from '@/types/party'

type UsePartyOptions = { enabled?: boolean }

export function useParty(partyId: string | undefined, options: UsePartyOptions = {}) {
  const queryClient = useQueryClient()
  const enabled = Boolean(partyId) && (options.enabled ?? true)

  const partyQuery = useQuery({
    queryKey: partyQueryKeys.detail(partyId),
    queryFn: () => partyService.get(partyId!),
    enabled,
    staleTime: 10_000,
    refetchInterval: (query) => query.state.data?.status === 'forming' ? 15_000 : false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  })

  const requestJoinMutation = usePartyMutation(queryClient, partyService.requestJoin)
  const inviteMemberMutation = usePartyMutation(
    queryClient,
    ({ partyId: targetPartyId, targetUserId }: { partyId: string; targetUserId: string }) =>
      partyService.inviteMember(targetPartyId, targetUserId),
  )
  const acceptInviteMutation = usePartyMutation(queryClient, partyService.acceptInvite)
  const approveMemberMutation = usePartyMutation(
    queryClient,
    ({ partyId: targetPartyId, targetUserId }: { partyId: string; targetUserId: string }) =>
      partyService.approveMember(targetPartyId, targetUserId),
  )
  const removeMemberMutation = usePartyMutation(
    queryClient,
    ({ partyId: targetPartyId, targetUserId }: { partyId: string; targetUserId: string }) =>
      partyService.removeMember(targetPartyId, targetUserId),
  )
  const leaveMutation = usePartyMutation(queryClient, partyService.leave)
  const dissolveMutation = usePartyMutation(queryClient, partyService.dissolve)

  return {
    partyQuery,
    requestJoinMutation,
    inviteMemberMutation,
    acceptInviteMutation,
    approveMemberMutation,
    removeMemberMutation,
    leaveMutation,
    dissolveMutation,
  }
}

export function useDiscoverableParties(options: UsePartyOptions = {}) {
  return useQuery({
    queryKey: partyQueryKeys.discovery(),
    queryFn: partyService.listDiscoverable,
    enabled: options.enabled ?? true,
    staleTime: 20_000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  })
}

export function useMyParties(options: UsePartyOptions = {}) {
  return useQuery({
    queryKey: partyQueryKeys.mine(),
    queryFn: partyService.listMine,
    enabled: options.enabled ?? true,
    staleTime: 20_000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  })
}

export function useCreateParty() {
  const queryClient = useQueryClient()
  const attempt = useRef(createPartyCreateAttempt(Crypto.randomUUID))
  return useMutation({
    mutationFn: (input: Omit<CreatePartyInput, 'idempotencyKey'> & { idempotencyKey?: string }) => partyService.create({
      ...input,
      idempotencyKey: input.idempotencyKey ?? attempt.current.key(),
    }),
    onSuccess: (output) => {
      attempt.current.complete()
      invalidatePartyQueries(queryClient, output)
    },
  })
}

export function useRequestPartyJoin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (partyId: string) => partyService.requestJoin(partyId),
    onSuccess: (output) => invalidatePartyQueries(queryClient, output),
  })
}

function usePartyMutation<TInput>(
  queryClient: ReturnType<typeof useQueryClient>,
  mutationFn: (input: TInput) => Promise<PartyActionOutput>,
) {
  return useMutation({
    mutationFn,
    onSuccess: (output) => invalidatePartyQueries(queryClient, output),
  })
}

function invalidatePartyQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  output: PartyActionOutput,
) {
  void queryClient.invalidateQueries({ queryKey: partyQueryKeys.all })
  void queryClient.invalidateQueries({ queryKey: partyQueryKeys.detail(output.resourceId) })
}
