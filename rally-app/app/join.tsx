import { useEffect, useMemo } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useAuth } from '@/hooks/useAuth'
import { createMatchEntry, toMatchEntryParams } from '@/lib/match/matchEntry'
import { useMatchEntryStore } from '@/stores/matchEntryStore'
import { guardedRouter } from '@/lib/navigation/guardedRouter'

export default function JoinRouteScreen() {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const params = useLocalSearchParams<{ code?: string; source?: string }>()
  const { session, isLoading } = useAuth()
  const setPendingEntry = useMatchEntryStore((state) => state.setPendingEntry)
  const entry = useMemo(
    () => createMatchEntry(params.code, params.source, 'share_link'),
    [params.code, params.source],
  )

  useEffect(() => {
    if (isLoading) return

    if (!entry) {
      guardedRouter.replace('/(tabs)', { actionKey: 'join:home' })
      return
    }

    if (!session) {
      setPendingEntry(entry)
      guardedRouter.replace('/(auth)/sign-in', { actionKey: 'join:sign-in' })
      return
    }

    guardedRouter.replace({
      pathname: '/(tabs)',
      params: toMatchEntryParams(entry),
    }, { actionKey: 'join:tabs-entry' })
  }, [entry, isLoading, session, setPendingEntry])

  return (
    <View style={styles.root}>
      <ActivityIndicator color={theme.chalk} />
      <Text style={styles.text}>Opening lobby...</Text>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: theme.bg,
  },
  text: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  })
}
