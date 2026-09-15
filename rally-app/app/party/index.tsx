import { router, Stack } from 'expo-router'
import { useEffect, useRef } from 'react'

import { Screen } from '@/components/layout/Screen'
import { PartyState } from '@/components/party/PartyState'
import { useAuth } from '@/hooks/useAuth'
import { useI18n } from '@/hooks/useI18n'
import { useMyParties } from '@/hooks/useParty'
import { partyDictionary } from '@/lib/i18n/dictionaries/party'
import { useSportTheme } from '@/hooks/useAppTheme'

export default function PartyGateScreen() {
  const theme = useSportTheme()
  const { t } = useI18n(partyDictionary)
  const { user, isLoading: authLoading } = useAuth()
  const query = useMyParties({ enabled: !!user })
  const routed = useRef(false)
  const activeParty = query.data?.find((party) => party.status === 'forming') ?? null

  useEffect(() => {
    if (authLoading || routed.current) return
    if (!user) {
      routed.current = true
      router.replace('/(auth)/sign-in')
      return
    }
    if (query.isPending || query.error) return
    routed.current = true
    router.replace(activeParty ? `/party/${activeParty.id}` as never : '/party/new')
  }, [activeParty, authLoading, query.error, query.isPending, user])

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen edges={['top', 'bottom']} topPad={24} bottomPad={48} backgroundColor={theme.bg} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20 }}>
        {!user && !authLoading ? <PartyState kind="empty" text={t('signInToManage')} /> : authLoading || query.isPending ? <PartyState kind="loading" text={t('loadingMine')} /> : query.error ? <PartyState kind="error" text={t('loadMineError')} onRetry={() => void query.refetch()} /> : <PartyState kind="loading" text={t('loadingMine')} />}
      </Screen>
    </>
  )
}
