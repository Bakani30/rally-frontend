import { beforeEach, describe, expect, it } from 'vitest'
import { useWearScoreDraftStore } from '@/stores/wearScoreDraftStore'

describe('useWearScoreDraftStore', () => {
  beforeEach(() => {
    useWearScoreDraftStore.setState({ drafts: {} })
  })

  it('applies +1, +2, and +3 score events to a match draft', () => {
    const store = useWearScoreDraftStore.getState()

    store.applyScoreEvent('match-1', 0, 1)
    store.applyScoreEvent('match-1', 0, 2)
    const draft = store.applyScoreEvent('match-1', 0, 3)

    expect(draft.teamScore).toBe(6)
    expect(draft.events.map((event) => event.points)).toEqual([1, 2, 3])
  })

  it('undo removes the latest score event without going below zero', () => {
    const store = useWearScoreDraftStore.getState()

    store.applyScoreEvent('match-1', 1, 3)
    store.applyScoreEvent('match-1', 1, 2)
    expect(store.undoScoreEvent('match-1')?.teamScore).toBe(3)
    expect(store.undoScoreEvent('match-1')?.teamScore).toBe(0)
    expect(store.undoScoreEvent('match-1')?.teamScore).toBe(0)
  })
})
