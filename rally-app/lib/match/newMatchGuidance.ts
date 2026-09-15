export type NewMatchSetupStep = 'sport' | 'opponent' | 'stake' | 'confirm'

export type NewMatchGuidanceCopy = {
  heroTitle: string
  ctaLabel: string
  setupSteps: NewMatchSetupStep[]
}

export function getNewMatchGuidanceCopy(): NewMatchGuidanceCopy {
  return {
    heroTitle: 'START MATCH',
    ctaLabel: 'OPEN ROOM',
    setupSteps: ['sport', 'opponent', 'stake', 'confirm'],
  }
}
