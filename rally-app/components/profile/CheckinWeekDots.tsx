import { StyleSheet, Text, View } from 'react-native'
import { CrownIcon, FireCheckIcon } from '@/components/profile/checkinIcons'
import { DAILY_CHECKIN_POINTS, type CheckinWeekDot } from '@/lib/profile/profileStreak'
import { OnAccent, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type CheckinWeekDotsProps = {
  dots: CheckinWeekDot[]
  compact?: boolean
}

// Visual cadence row: one node per check-in day in the current week (+10 each),
// with a crown capping day 7. Real bonuses live on the milestone chips.
export function CheckinWeekDots({ dots, compact = false }: CheckinWeekDotsProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const nodeSize = compact ? 30 : 36
  const iconSize = compact ? 16 : 19

  return (
    <View style={styles.row}>
      {dots.map((dot) => {
        const node = [
          styles.node,
          { width: nodeSize, height: nodeSize, borderRadius: nodeSize / 2 },
          dot.filled && styles.nodeFilled,
          dot.isNext && styles.nodeNext,
        ]
        // Crown stays gold (reward marker); flames ride the orange streak energy.
        const flameColor = dot.filled
          ? OnAccent.onColor
          : dot.isNext
            ? theme.orange
            : theme.fightMuted
        return (
          <View key={dot.dayInWeek} style={styles.cell}>
            {!compact ? (
              <Text style={[styles.reward, dot.filled && styles.rewardFilled]}>
                +{DAILY_CHECKIN_POINTS}
              </Text>
            ) : null}
            <View style={node}>
              {dot.isCrown ? (
                <CrownIcon size={iconSize} color={theme.economy} />
              ) : (
                <FireCheckIcon size={iconSize} color={flameColor} />
              )}
            </View>
          </View>
        )
      })}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
    cell: { alignItems: 'center', gap: 4 },
    reward: { color: theme.fightMuted, fontSize: 10, fontWeight: '900', letterSpacing: 0.2 },
    rewardFilled: { color: theme.economy },
    node: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.fightPanel,
      borderWidth: 1,
      borderColor: theme.lineStrong,
    },
    nodeFilled: {
      backgroundColor: theme.orange,
      borderColor: theme.orange,
    },
    nodeNext: {
      backgroundColor: 'transparent',
      borderColor: theme.orange,
      borderWidth: 2,
    },
  })
}
