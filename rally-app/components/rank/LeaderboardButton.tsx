import { StyleSheet, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { RallyText } from '@/components/ui/RallyText'
import { Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type LeaderboardButtonProps = {
  onPress: () => void
  compact?: boolean
}

// "LEADERBOARD" affordance — navigates to this sport's board. English caps
// label + chevron, per the mock.
export function LeaderboardButton({ onPress, compact = false }: LeaderboardButtonProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  return (
    <PressableScale
      style={[styles.cta, compact ? styles.compactCta : null]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="LEADERBOARD"
    >
      <RallyText variant="head" lang="en" style={styles.label}>LEADERBOARD</RallyText>
      <View style={styles.chevWrap}>
        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.mutedSoft} />
      </View>
    </PressableScale>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: Radius.lg,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: theme.lineStrong,
      backgroundColor: theme.surface,
      minHeight: 48,
    },
    compactCta: {
      minHeight: 44,
      paddingVertical: 0,
      paddingHorizontal: 12,
    },
    label: { color: theme.ink, fontSize: 12.5, fontWeight: '900', fontStyle: 'italic', letterSpacing: 0.4 },
    chevWrap: { width: 20, alignItems: 'center' },
  })
}
