import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => ({ push: vi.fn(), row: null as { onPress: () => void } | null }))

vi.mock('@/lib/navigation/guardedRouter', () => ({ guardedRouter: { push: harness.push } }))
vi.mock('@/components/leaderboard/RankingRowView', () => ({
  RankingRowView: ({ onPress }: { onPress: () => void }) => { harness.row = { onPress }; return React.createElement('div', null, 'row-view') },
}))

import { RankingRow } from '@/components/leaderboard/RankingRow'

;(globalThis as { React?: typeof React }).React = React

describe('RankingRow navigation wrapper', () => {
  it('keeps the guarded user route and action key outside the pure View', () => {
    renderToStaticMarkup(React.createElement(RankingRow, {
      entry: { userId: 'row-player', displayName: 'Rally Player', handle: null, rating: 1240, tier: 'silver', matches: 14, rank: 8, letter: 'R', avatarColor: '#f80', avatarUrl: null },
      index: 0, trigger: 0, theme: {} as never,
    }))
    harness.row?.onPress()
    expect(harness.push).toHaveBeenCalledWith('/user/row-player', { actionKey: 'ranking:user:row-player' })
  })
})
