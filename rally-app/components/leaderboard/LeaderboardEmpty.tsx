import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { LEADERBOARD_MIN_MATCHES } from '@/lib/leaderboard/leaderboardConfig'

export function LeaderboardEmpty() {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.empty}>
      <MaterialCommunityIcons name="podium" size={36} color={theme.mutedSoft} />
      <Text style={styles.emptyText}>ยังไม่มีข้อมูล ranking</Text>
      <Text style={styles.emptyHint}>
        {`เล่นอย่างน้อย ${LEADERBOARD_MIN_MATCHES} แมตช์เพื่อขึ้น leaderboard`}
      </Text>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    empty: {
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingTop: 40,
      paddingBottom: 32,
      gap: 8,
    },
    emptyText: { fontSize: 16, fontWeight: '700', color: theme.ink, textAlign: 'center' },
    emptyHint: { fontSize: 13, color: theme.muted, textAlign: 'center' },
  })
}
