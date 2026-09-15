// Reads the active quest catalog (quest_templates) — RLS allows authenticated
// users to read active templates. Data access only; no business rules, no UI.
import { supabase } from '@/lib/supabase'
import type { QuestTemplateRow } from './questProofTypes'

export async function listActiveTemplates(): Promise<QuestTemplateRow[]> {
  const { data, error } = await supabase
    .from('quest_templates')
    .select(
      'id, slug, activity, lane, title, subtitle, icon, verifier, drill_spec, proof_contract, reward_points, attempts_per_day, is_active',
    )
    .eq('is_active', true)
    .order('lane', { ascending: true })
    .order('reward_points', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as QuestTemplateRow[]
}
