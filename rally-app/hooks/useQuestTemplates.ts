import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/hooks/useAuth'
import { questProofQueryKeys } from '@/lib/quest-proof/questProofQueryKeys'
import { presentTemplates } from '@/lib/quest-proof/questTemplatePresenter'
import { listActiveTemplates } from '@/lib/quest-proof/questTemplateRepository'
import type { QuestTemplateView } from '@/lib/quest-proof/questProofTypes'

/**
 * Loads the active quest catalog as presentation-ready Thai view models.
 *
 * Gated on an authenticated session: `quest_templates` is RLS-restricted to
 * authenticated users, so a cold-start fetch that races ahead of the session
 * returns an empty set (not an error) and react-query would cache that `[]` as
 * a success for the whole staleTime — leaving the Home daily-quests board blank
 * until something happened to refetch. Waiting for `user` keeps the first fetch
 * authenticated so the catalog populates on first paint.
 */
export function useQuestTemplates() {
  const { user } = useAuth()
  return useQuery<QuestTemplateView[]>({
    queryKey: questProofQueryKeys.templates(),
    queryFn: async () => presentTemplates(await listActiveTemplates()),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })
}
