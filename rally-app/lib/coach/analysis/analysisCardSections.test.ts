import { describe, expect, it } from 'vitest'

import type { CoachInsightCard } from '@/lib/coach/coachTypes'
import { groupAnalysisCards } from './analysisCardSections'

function card(over: Partial<CoachInsightCard>): CoachInsightCard {
  return {
    id: 'c', type: 'form', title: 't', body: 'b', severity: 'neutral',
    locked: false, source: 'history', ...over,
  }
}

describe('groupAnalysisCards', () => {
  it('routes head_to_head to versus, cues/warnings to improve, rest to strengths', () => {
    const sections = groupAnalysisCards([
      card({ id: 'a', type: 'form', severity: 'positive' }),
      card({ id: 'b', type: 'training_cue' }),
      card({ id: 'c', type: 'form', severity: 'warning' }),
      card({ id: 'd', type: 'head_to_head' }),
    ])
    expect(sections.map((s) => s.id)).toEqual(['strengths', 'improve', 'versus'])
    expect(sections[0].cards.map((c) => c.id)).toEqual(['a'])
    expect(sections[1].cards.map((c) => c.id)).toEqual(['b', 'c'])
    expect(sections[2].cards.map((c) => c.id)).toEqual(['d'])
  })

  it('omits empty sections and drops relic cards', () => {
    const sections = groupAnalysisCards([
      card({ id: 'a', type: 'form', severity: 'positive' }),
      card({ id: 'r', type: 'relic' }),
    ])
    expect(sections.map((s) => s.id)).toEqual(['strengths'])
    expect(sections[0].cards.map((c) => c.id)).toEqual(['a'])
  })
})
