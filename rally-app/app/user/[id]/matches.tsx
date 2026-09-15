import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Screen } from '@/components/layout/Screen'
import { MatchListItem } from '@/components/match/MatchListItem'
import { ScreenBackButton } from '@/components/navigation/ScreenBackButton'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/hooks/useAuth'
import { useMatchPinToggle } from '@/hooks/useMatchPinToggle'
import { useVisibleMatchesForUser } from '@/hooks/useVisibleMatchesForUser'
import type { MyMatch } from '@/types/match'

export default function UserMatchesScreen() {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const isMe = !!user && user.id === id
  const { track } = useAnalytics()
  const { data: matches, isPending, error } = useVisibleMatchesForUser(id)
  const { pinnedIds, atPinCap, pinMutationPending, onTogglePin } = useMatchPinToggle(id)

  useEffect(() => {
    if (id) track({ name: 'view_match_history', properties: { is_self: isMe } })
  }, [track, id, isMe])

  const settled = (matches ?? []).filter((m: MyMatch) => m.status === 'settled')

  if (isPending) return <ActivityIndicator style={styles.loader} color={theme.chalk} />
  if (error) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="alert-circle-outline" size={42} color={theme.muted} />
        <Text style={styles.errorText}>โหลดประวัติแมตช์ไม่สำเร็จ</Text>
      </View>
    )
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      backgroundColor={theme.bg}
      bottomPad={48}
      contentContainerStyle={styles.container}
    >
      <ScreenBackButton />
      <Text style={styles.title}>ประวัติแมตช์</Text>
      {settled.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="history" size={22} color={theme.mutedSoft} />
          <Text style={styles.emptyText}>ยังไม่มีประวัติแมตช์ที่จบแล้ว</Text>
        </View>
      ) : (
        settled.map((match) => (
          <MatchListItem
            key={match.id}
            match={match}
            currentUserId={id}
            navigationEnabled
            pin={
              isMe
                ? {
                    pinned: pinnedIds.has(match.id),
                    atCap: atPinCap,
                    pending: pinMutationPending,
                    onToggle: onTogglePin,
                  }
                : undefined
            }
          />
        ))
      )}
    </Screen>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    loader: { flex: 1, backgroundColor: theme.bg },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.md,
      backgroundColor: theme.bg,
      padding: Spacing.xl,
    },
    errorText: { color: theme.ink, fontSize: 15, fontWeight: '700' },
    container: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
    title: { color: theme.ink, fontSize: 24, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.3 },
    empty: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.line,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      alignItems: 'center',
      gap: Spacing.sm,
    },
    emptyText: { color: theme.muted, fontSize: 13, textAlign: 'center' },
  })
}
