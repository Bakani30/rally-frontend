import { supabase } from '@/lib/supabase'

export async function getCurrentSeasonId(): Promise<string | null> {
  const { data } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_current', true)
    .maybeSingle()
  return data?.id ?? null
}
