import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => ({
  push: vi.fn(),
  viewProps: null as { onOpenUser: (userId: string) => void } | null,
}))

vi.mock('expo-router', () => ({
  router: { canGoBack: () => true, back: vi.fn(), replace: vi.fn() },
  useLocalSearchParams: () => ({ activity: 'basketball' }),
}))
vi.mock('@react-navigation/native', () => ({ useFocusEffect: () => undefined }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'viewer' } }) }))
vi.mock('@/hooks/useAnalytics', () => ({ useAnalytics: () => ({ track: () => undefined }) }))
vi.mock('@/hooks/useLeaderboard', () => ({ useLeaderboard: () => ({ data: [], isError: false, isPending: false, isStale: false, refetch: vi.fn() }) }))
vi.mock('@/lib/navigation/guardedRouter', () => ({ guardedRouter: { push: harness.push } }))
vi.mock('@/components/leaderboard/LeaderboardView', () => ({
  LeaderboardView: (props: { onOpenUser: (userId: string) => void }) => { harness.viewProps = props; return React.createElement('div', null, 'leaderboard-view') },
}))

import { LeaderboardScreenContent } from '@/components/leaderboard/LeaderboardScreenContent'

;(globalThis as { React?: typeof React }).React = React

describe('LeaderboardScreenContent user navigation', () => {
  it('supplies the guarded ranking user target and action key to its View callback', () => {
    renderToStaticMarkup(React.createElement(LeaderboardScreenContent))
    harness.viewProps?.onOpenUser('row-player')
    expect(harness.push).toHaveBeenCalledWith('/user/row-player', { actionKey: 'ranking:user:row-player' })
  })
})
