import { useCallback, useEffect, useMemo, useRef } from 'react'
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useAuth } from '@/hooks/useAuth'
import { useResolveRallyCoin } from '@/hooks/useResolveRallyCoin'
import { createRallyCoinEntry } from '@/lib/rally-coin/rallyCoinEntry'
import type { ResolveRallyCoinResult } from '@/lib/rally-coin/rallyCoinTypes'
import { useRallyCoinEntryStore } from '@/stores/rallyCoinEntryStore'
import { guardedRouter } from '@/lib/navigation/guardedRouter'

export default function RallyCoinRouteScreen() {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const params = useLocalSearchParams<{ publicCode?: string; source?: string }>()
  const { session, isLoading } = useAuth()
  const setPendingEntry = useRallyCoinEntryStore((state) => state.setPendingEntry)
  const resolveMutation = useResolveRallyCoin()
  const lastHandledRef = useRef('')

  const entry = useMemo(
    () => createRallyCoinEntry(params.publicCode, params.source, 'nfc'),
    [params.publicCode, params.source],
  )

  const showMessage = useCallback((title: string, message: string) => {
    if (Platform.OS === 'web') {
      globalThis.alert(`${title}\n\n${message}`)
      return
    }
    Alert.alert(title, message)
  }, [])

  const handleResolvedCoin = useCallback((result: ResolveRallyCoinResult) => {
    if (result.route?.path && result.action === 'open_match_lobby') {
      guardedRouter.replace(result.route.path as never, { actionKey: `coin:route:${result.route.path}` })
      return
    }

    if (result.action === 'claim_coin') {
      showMessage('Rally Coin ready', 'This coin is ready to claim in Rally.')
    } else if (result.action === 'open_guild' || result.action === 'open_guild_goal') {
      showMessage('Guild coin found', 'Guild Rally Coin routes are verified, but the full guild screen is not in this build yet.')
    } else if (result.action === 'coin_unavailable') {
      showMessage('Coin unavailable', 'This Rally Coin is currently unavailable.')
    } else {
      showMessage('No active invite', 'This Rally Coin is not pointing to an active lobby right now.')
    }
    guardedRouter.replace('/(tabs)', { actionKey: 'coin:home' })
  }, [showMessage])

  useEffect(() => {
    if (isLoading) return

    if (!entry) {
      guardedRouter.replace('/(tabs)', { actionKey: 'coin:no-entry-home' })
      return
    }

    if (!session) {
      setPendingEntry(entry)
      guardedRouter.replace('/(auth)/sign-in', { actionKey: 'coin:sign-in' })
      return
    }

    const key = `${session.user.id}:${entry.publicCode}:${entry.source}`
    if (lastHandledRef.current === key) return
    lastHandledRef.current = key

    let mounted = true
    resolveMutation.mutateAsync(entry)
      .then((result) => {
        if (!mounted) return
        handleResolvedCoin(result)
      })
      .catch((error) => {
        if (!mounted) return
        const message = error instanceof Error ? error.message : 'Could not open this Rally Coin.'
        showMessage('Rally Coin failed', message)
        guardedRouter.replace('/(tabs)', { actionKey: 'coin:error-home' })
      })

    return () => {
      mounted = false
    }
  }, [entry, handleResolvedCoin, isLoading, resolveMutation, session, setPendingEntry, showMessage])

  return (
    <View style={styles.root}>
      <View style={styles.panel}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="contactless-payment-circle" size={34} color={theme.chalk} />
        </View>
        <ActivityIndicator color={theme.red} />
        <Text style={styles.title}>Opening Rally Coin</Text>
        <Text style={styles.text}>{entry?.publicCode ?? 'Checking coin...'}</Text>
        <PressableScale
          style={styles.button}
          onPress={() => guardedRouter.replace('/(tabs)', { actionKey: 'coin:button-home' })}
        >
          <Text style={styles.buttonText}>HOME</Text>
        </PressableScale>
      </View>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: theme.bg,
  },
  panel: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: theme.line,
    padding: Spacing.xl,
    backgroundColor: theme.surface,
  },
  iconWrap: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: theme.red,
    marginBottom: Spacing.xs,
  },
  title: {
    color: theme.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  text: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  button: {
    marginTop: Spacing.md,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 11,
    backgroundColor: theme.ink,
  },
  buttonText: {
    color: theme.chalk,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  })
}
