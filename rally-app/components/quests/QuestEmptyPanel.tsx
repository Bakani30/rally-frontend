import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { onAccent, Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { QuestFilter } from '@/lib/daily-quests/questFilters'

type QuestEmptyPanelProps = { filter: QuestFilter }

export function QuestEmptyPanel({ filter }: QuestEmptyPanelProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const title = filter === 'special' ? 'Admin drops incoming' : 'No quests in this lane'
  return (
    <View style={styles.panel}>
      <View style={styles.icon}>
        <MaterialCommunityIcons name="star-four-points" size={20} color={onAccent(theme.orange)} />
      </View>
      <Text style={styles.title}>{title}</Text>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    panel: {
      minHeight: 104,
      borderRadius: Radius.xl,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: theme.line,
      backgroundColor: 'transparent',
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    icon: {
      width: 44,
      height: 44,
      borderRadius: Radius.lg,
      backgroundColor: theme.orange,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { flex: 1, color: theme.ink, fontSize: 15, fontWeight: '900' },
  })
}
