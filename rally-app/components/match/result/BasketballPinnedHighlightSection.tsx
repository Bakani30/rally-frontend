import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { ProfileHighlightVideo } from '@/components/profile/ProfileHighlightVideo'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useMatchPinToggle } from '@/hooks/useMatchPinToggle'
import { useCanManageProfileHighlightVideo } from '@/hooks/useProfileHighlight'
import { useProfilePinnedMatches } from '@/hooks/useProfilePinnedMatches'

type BasketballPinnedHighlightSectionProps = {
  userId: string
  matchId: string
  matchLabel: string
}

export function BasketballPinnedHighlightSection({
  userId,
  matchId,
  matchLabel,
}: BasketballPinnedHighlightSectionProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { data: canManage, isPending: isAccessPending } = useCanManageProfileHighlightVideo(userId, matchId)
  const { data: pinnedMatches, isPending } = useProfilePinnedMatches(userId)
  const { pinMutationPending, onTogglePin } = useMatchPinToggle(userId)
  const pinIndex = (pinnedMatches ?? []).findIndex((pin) => pin.matchId === matchId)

  if (isAccessPending || isPending) {
    return <ActivityIndicator style={styles.loading} color={theme.muted} />
  }

  if (!canManage) return null

  if (pinIndex >= 0) {
    return (
      <View style={styles.pinnedWrap}>
        <ProfileHighlightVideo
          userId={userId}
          matchId={matchId}
          isOwner
          pinNumber={pinIndex + 1}
          matchLabel={matchLabel}
        />
      </View>
    )
  }

  return (
    <View style={styles.gate}>
      <View style={styles.gateCopy}>
        <Text style={styles.gateTitle}>แมตช์นี้ยังไม่ถูกปักหมุด</Text>
        <Text style={styles.gateText}>ปักหมุดก่อน จึงจะเพิ่มวิดีโอไฮไลท์ของแมตช์นี้ได้</Text>
      </View>
      <PressableScale
        style={styles.pinButton}
        onPress={() => onTogglePin(matchId)}
        disabled={pinMutationPending}
        accessibilityRole="button"
        accessibilityLabel="ปักหมุดแมตช์เพื่อเพิ่มวิดีโอ"
      >
        {pinMutationPending ? (
          <ActivityIndicator size="small" color={theme.ink} />
        ) : (
          <MaterialCommunityIcons name="pin-outline" size={16} color={theme.ink} />
        )}
        <Text style={styles.pinButtonText}>ปักหมุด</Text>
      </PressableScale>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    loading: { marginVertical: Spacing.md },
    pinnedWrap: { marginHorizontal: 14, marginBottom: 12 },
    gate: {
      marginHorizontal: 14,
      marginBottom: 12,
      minHeight: 72,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: Radius.xl,
      backgroundColor: theme.surface,
      padding: Spacing.md,
    },
    gateCopy: { flex: 1, minWidth: 0 },
    gateTitle: { color: theme.ink, fontSize: 12, fontWeight: '900' },
    gateText: { marginTop: 3, color: theme.muted, fontSize: 10, fontWeight: '600' },
    pinButton: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: Radius.pill,
      backgroundColor: theme.orange,
      paddingHorizontal: Spacing.sm,
    },
    pinButtonText: { color: theme.ink, fontSize: 11, fontWeight: '900' },
  })
}
