import type { CoachInsightCard } from '@/lib/coach/coachTypes'

export type AnalysisSectionId = 'strengths' | 'improve' | 'versus'

export type AnalysisCardSection = {
  id: AnalysisSectionId
  cards: CoachInsightCard[]
}

const ORDER: AnalysisSectionId[] = ['strengths', 'improve', 'versus']

function sectionFor(card: CoachInsightCard): AnalysisSectionId | null {
  if (card.type === 'relic') return null
  if (card.type === 'head_to_head') return 'versus'
  if (card.type === 'training_cue' || card.severity === 'warning') return 'improve'
  return 'strengths'
}

export function groupAnalysisCards(cards: CoachInsightCard[]): AnalysisCardSection[] {
  const buckets: Record<AnalysisSectionId, CoachInsightCard[]> = { strengths: [], improve: [], versus: [] }
  for (const card of cards) {
    const id = sectionFor(card)
    if (id) buckets[id].push(card)
  }
  return ORDER.filter((id) => buckets[id].length > 0).map((id) => ({ id, cards: buckets[id] }))
}
