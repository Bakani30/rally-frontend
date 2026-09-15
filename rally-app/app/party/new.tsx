import { router, Stack } from 'expo-router'
import { useEffect, useRef } from 'react'
import { Alert, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PartyCreateForm, type PartyCreateValues } from '@/components/party/PartyCreateForm'
import { PartyState } from '@/components/party/PartyState'
import { createPartyStyles } from '@/components/party/partyStyles'
import { Screen } from '@/components/layout/Screen'
import { PressableScale } from '@/components/motion/PressableScale'
import { useAuth } from '@/hooks/useAuth'
import { useI18n } from '@/hooks/useI18n'
import { useCreateParty, useMyParties } from '@/hooks/useParty'
import { useSportTheme } from '@/hooks/useAppTheme'
import { getPartyErrorMessage } from '@/lib/party/partyError'
import { partyDictionary } from '@/lib/i18n/dictionaries/party'

export default function PartyCreateScreen() {
  const theme = useSportTheme()
  const styles = createPartyStyles(theme)
  const { t, language } = useI18n(partyDictionary)
  const { user, isLoading: authLoading } = useAuth()
  const mineQuery = useMyParties({ enabled: !!user })
  const createMutation = useCreateParty()
  const redirected = useRef(false)
  const activeParty = mineQuery.data?.find((party) => party.status === 'forming') ?? null

  useEffect(() => {
    if (authLoading || redirected.current || !user || mineQuery.isPending || mineQuery.error) return
    if (activeParty) {
      redirected.current = true
      router.replace(`/party/${activeParty.id}` as never)
    }
  }, [activeParty, authLoading, mineQuery.error, mineQuery.isPending, user])

  async function handleCreate(values: PartyCreateValues) {
    try {
      const output = await createMutation.mutateAsync(values)
      router.replace(`/party/${output.resourceId}` as never)
    } catch (error) {
      Alert.alert(t('createError'), getPartyErrorMessage(error, 'create', language))
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen edges={['top', 'bottom']} topPad={12} bottomPad={48} backgroundColor={theme.bg} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <PressableScale style={styles.backButton} onPress={() => router.replace('/party')} accessibilityRole="button" accessibilityLabel={t('back')}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={theme.chalk} />
          </PressableScale>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>{t('eyebrow')}</Text>
            <Text style={styles.title}>{t('formTitle')}</Text>
            <Text style={styles.subtitle}>{t('subtitle')}</Text>
          </View>
        </View>
        {!user && !authLoading ? <PartyState kind="empty" text={t('signInToManage')} /> : authLoading || mineQuery.isPending ? <PartyState kind="loading" text={t('loadingMine')} /> : mineQuery.error ? <PartyState kind="error" text={t('loadMineError')} onRetry={() => void mineQuery.refetch()} /> : activeParty ? <PartyState kind="loading" text={t('loadingMine')} /> : <PartyCreateForm busy={createMutation.isPending} onSubmit={handleCreate} />}
      </Screen>
    </>
  )
}
