import { StyleSheet, View } from 'react-native'
import { AnimatedNumber } from '@/components/motion/AnimatedNumber'
import { RallyText } from '@/components/ui/RallyText'
import { Fonts, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type ProfileStatsCardProps = {
  matches: number
  wins: number
  losses: number
  ties: number
}

// Single card with the four lifetime match counters, divided into columns.
export function ProfileStatsCard({ matches, wins, losses, ties }: ProfileStatsCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  const items = [
    { label: 'MATCHES', sub: 'แมตช์', value: matches, color: theme.ink },
    { label: 'WINS', sub: 'ชนะ', value: wins, color: theme.greenVivid },
    { label: 'LOSSES', sub: 'แพ้', value: losses, color: theme.red },
    { label: 'TIES', sub: 'เสมอ', value: ties, color: theme.amber },
  ]

  return (
    <View style={styles.card}>
      {items.map((item, index) => (
        <View key={item.label} style={styles.col}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <AnimatedNumber value={item.value} style={[styles.num, { color: item.color }]} />
          <RallyText variant="head" lang="en" style={styles.label}>
            {item.label}
          </RallyText>
          <RallyText variant="body" style={styles.sub}>
            {item.sub}
          </RallyText>
        </View>
      ))}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      width: '100%',
      flexDirection: 'row',
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      paddingVertical: Spacing.md,
    },
    col: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    divider: {
      position: 'absolute',
      left: 0,
      top: 6,
      bottom: 6,
      width: StyleSheet.hairlineWidth,
      backgroundColor: theme.lineStrong,
    },
    num: {
      fontSize: 24,
      fontWeight: '900',
      fontFamily: Fonts?.rounded,
      fontVariant: ['tabular-nums'],
    },
    label: {
      marginTop: 4,
      color: theme.muted,
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1.2,
    },
    sub: {
      marginTop: 1,
      color: theme.muted,
      fontSize: 9,
      fontWeight: '500',
    },
  })
}
