import { useMutation } from '@tanstack/react-query'
import { resolveRallyCoin } from '@/lib/rally-coin/rallyCoinRepository'
import type { ResolveRallyCoinInput, ResolveRallyCoinResult } from '@/lib/rally-coin/rallyCoinTypes'

export function useResolveRallyCoin() {
  return useMutation<ResolveRallyCoinResult, Error, ResolveRallyCoinInput>({
    mutationFn: resolveRallyCoin,
  })
}
