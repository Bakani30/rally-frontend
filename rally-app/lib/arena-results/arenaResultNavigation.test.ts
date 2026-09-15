import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { arenaSessionSnapshotQueryKey } from '@/lib/arena-sessions/arenaSessionSnapshotQuery'
import { returnToArenaSession } from './arenaResultNavigation'

describe('returnToArenaSession', () => {
  it('invalidates and refetches only the exact Arena Session before going back', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const exactFetch = vi.fn().mockResolvedValue({ session: 'arena-1' })
    const otherFetch = vi.fn().mockResolvedValue({ session: 'arena-2' })
    const exactObserver = new QueryObserver(queryClient, {
      queryKey: arenaSessionSnapshotQueryKey('actor-1', 'arena-1'),
      queryFn: exactFetch,
    })
    const otherObserver = new QueryObserver(queryClient, {
      queryKey: arenaSessionSnapshotQueryKey('actor-1', 'arena-2'),
      queryFn: otherFetch,
    })
    const unsubscribeExact = exactObserver.subscribe(() => undefined)
    const unsubscribeOther = otherObserver.subscribe(() => undefined)
    await exactObserver.refetch()
    await otherObserver.refetch()
    exactFetch.mockClear()
    otherFetch.mockClear()
    const navigation = {
      canGoBack: () => true,
      back: vi.fn(),
      replace: vi.fn(),
    }

    await returnToArenaSession({ queryClient, arenaEventId: 'arena-1', navigation })

    expect(exactFetch).toHaveBeenCalledTimes(1)
    expect(otherFetch).not.toHaveBeenCalled()
    expect(navigation.back).toHaveBeenCalledOnce()
    expect(navigation.replace).not.toHaveBeenCalled()
    unsubscribeExact()
    unsubscribeOther()
  })

  it('replaces with the Arena Session route when there is no back history', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const navigation = {
      canGoBack: () => false,
      back: vi.fn(),
      replace: vi.fn(),
    }

    await returnToArenaSession({ queryClient, arenaEventId: 'arena-9', navigation })

    expect(navigation.back).not.toHaveBeenCalled()
    expect(navigation.replace).toHaveBeenCalledWith('/arena-session/arena-9')
  })
})
