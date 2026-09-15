import { create } from 'zustand'

import storage from '@/lib/storage'
import {
  EMPTY_ONBOARDING_DRAFT,
  type OnboardingActivity,
  type OnboardingDraft,
  type OnboardingSportAnswer,
} from '@/lib/onboarding/onboardingTypes'

/**
 * Client-only wizard draft. Persisted (secure storage — includes private body
 * data) so a killed app resumes mid-wizard; cleared on successful submit.
 * Never mirrors server data.
 */

const DRAFT_STORAGE_KEY = 'rally.onboardingDraft.v1'

const EMPTY_SPORT_ANSWER: OnboardingSportAnswer = {
  experienceLevel: null,
  playStyles: [],
  positionKey: null,
}

type OnboardingState = {
  draft: OnboardingDraft
  isHydrated: boolean
  hydrate: () => Promise<void>
  patchDraft: (patch: Partial<OnboardingDraft>) => void
  replaceDraft: (draft: OnboardingDraft) => void
  toggleSport: (activity: OnboardingActivity) => void
  patchSportAnswer: (activity: OnboardingActivity, patch: Partial<OnboardingSportAnswer>) => void
  reset: () => Promise<void>
}

function parseStoredDraft(raw: string | null): OnboardingDraft | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft>
    if (typeof parsed !== 'object' || parsed === null) return null
    return { ...EMPTY_ONBOARDING_DRAFT, ...parsed }
  } catch {
    return null
  }
}

function persistDraft(draft: OnboardingDraft): void {
  void storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft)).catch(() => {
    // Persistence is a resume convenience; losing it must not break the wizard.
  })
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  draft: EMPTY_ONBOARDING_DRAFT,
  isHydrated: false,
  async hydrate() {
    if (get().isHydrated) return
    const stored = parseStoredDraft(await storage.getItem(DRAFT_STORAGE_KEY).catch(() => null))
    set({ draft: stored ?? EMPTY_ONBOARDING_DRAFT, isHydrated: true })
  },
  patchDraft(patch) {
    const draft = { ...get().draft, ...patch }
    set({ draft })
    persistDraft(draft)
  },
  replaceDraft(draft) {
    set({ draft })
    persistDraft(draft)
  },
  toggleSport(activity) {
    const current = get().draft
    const selected = current.selectedSports.includes(activity)
      ? current.selectedSports.filter((sport) => sport !== activity)
      : [...current.selectedSports, activity]
    const draft = { ...current, selectedSports: selected }
    set({ draft })
    persistDraft(draft)
  },
  patchSportAnswer(activity, patch) {
    const current = get().draft
    const existing = current.sportAnswers[activity] ?? EMPTY_SPORT_ANSWER
    const draft = {
      ...current,
      sportAnswers: { ...current.sportAnswers, [activity]: { ...existing, ...patch } },
    }
    set({ draft })
    persistDraft(draft)
  },
  async reset() {
    set({ draft: EMPTY_ONBOARDING_DRAFT })
    await storage.removeItem(DRAFT_STORAGE_KEY).catch(() => {})
  },
}))
