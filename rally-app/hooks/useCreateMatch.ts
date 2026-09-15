import { useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as Crypto from 'expo-crypto'
import { buildOptimisticMatch } from '@/lib/match/matchOptimistic'
import { createMatch, type CreateMatchInput } from '@/lib/match/matchService'
import type { ParticipantUser } from '@/types/match'

type CreateMatchVariables = CreateMatchInput & {
  creatorProfile?: ParticipantUser | null
}

export function useCreateMatch() {
  const queryClient = useQueryClient()
  // One idempotency key per create-intent, held STABLE across a
  // failed-then-retried attempt: if the request commits server-side but the
  // response is lost and the user taps CREATE again, the retry reuses this key
  // and the server returns the same lobby instead of a duplicate. Reset on
  // success so the next distinct create gets a fresh key.
  const idempotencyKeyRef = useRef<string | null>(null)

  return useMutation({
    mutationFn: async ({ creatorProfile, ...input }: CreateMatchVariables) => {
      if (!idempotencyKeyRef.current) idempotencyKeyRef.current = Crypto.randomUUID()
      const result = await createMatch(input, idempotencyKeyRef.current)
      // Seed the lobby cache from the form we already hold instead of blocking
      // navigation on a second getMatch round-trip. useMatch is stale-on-mount,
      // so it refetches the canonical row in the background and realtime fills
      // the relations — the screen renders the room the instant it lands.
      queryClient.setQueryData(
        ['match', result.matchId],
        buildOptimisticMatch(input, result, creatorProfile ?? null, new Date().toISOString()),
      )
      return result
    },
    onSuccess: () => {
      idempotencyKeyRef.current = null
      queryClient.invalidateQueries({ queryKey: ['my-matches'] })
      queryClient.invalidateQueries({ queryKey: ['open-match-lobbies'] })
    },
  })
}
