import { create } from 'zustand'

type ActiveGuildGoalState = {
  selectedGoalId: string | null
  setSelectedGoalId: (goalId: string | null) => void
}

export const useActiveGuildGoalStore = create<ActiveGuildGoalState>((set) => ({
  selectedGoalId: null,
  setSelectedGoalId: (goalId) => set({ selectedGoalId: goalId }),
}))
