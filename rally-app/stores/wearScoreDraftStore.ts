import { create } from 'zustand'
import type { Side } from '@/types/match'

export type WearScoreEvent = {
  id: string
  points: 1 | 2 | 3
  at: number
}

export type WearScoreDraft = {
  matchId: string
  sideIndex: Side
  teamScore: number
  events: WearScoreEvent[]
  updatedAt: number
}

type WearScoreDraftState = {
  drafts: Record<string, WearScoreDraft>
  ensureDraft: (matchId: string, sideIndex: Side) => WearScoreDraft
  applyScoreEvent: (matchId: string, sideIndex: Side, points: 1 | 2 | 3) => WearScoreDraft
  undoScoreEvent: (matchId: string) => WearScoreDraft | null
  clearDraft: (matchId: string) => void
}

export const useWearScoreDraftStore = create<WearScoreDraftState>((set, get) => ({
  drafts: {},
  ensureDraft: (matchId, sideIndex) => {
    const existing = get().drafts[matchId]
    if (existing && existing.sideIndex === sideIndex) return existing

    const draft = makeDraft(matchId, sideIndex)
    set((state) => ({
      drafts: {
        ...state.drafts,
        [matchId]: draft,
      },
    }))
    return draft
  },
  applyScoreEvent: (matchId, sideIndex, points) => {
    const current = get().drafts[matchId]
    const base = current && current.sideIndex === sideIndex ? current : makeDraft(matchId, sideIndex)
    const event: WearScoreEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      points,
      at: Date.now(),
    }
    const next: WearScoreDraft = {
      ...base,
      teamScore: base.teamScore + points,
      events: [...base.events, event],
      updatedAt: event.at,
    }
    set((state) => ({
      drafts: {
        ...state.drafts,
        [matchId]: next,
      },
    }))
    return next
  },
  undoScoreEvent: (matchId) => {
    const current = get().drafts[matchId]
    if (!current || current.events.length === 0) return current ?? null

    const removed = current.events[current.events.length - 1]
    const nextEvents = current.events.slice(0, -1)
    const next: WearScoreDraft = {
      ...current,
      teamScore: Math.max(0, current.teamScore - removed.points),
      events: nextEvents,
      updatedAt: Date.now(),
    }
    set((state) => ({
      drafts: {
        ...state.drafts,
        [matchId]: next,
      },
    }))
    return next
  },
  clearDraft: (matchId) => {
    set((state) => {
      const next = { ...state.drafts }
      delete next[matchId]
      return { drafts: next }
    })
  },
}))

function makeDraft(matchId: string, sideIndex: Side): WearScoreDraft {
  return {
    matchId,
    sideIndex,
    teamScore: 0,
    events: [],
    updatedAt: Date.now(),
  }
}
