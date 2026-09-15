import { ScrollView, StyleSheet, Text } from 'react-native'
import { PressableScale } from '@/components/motion/PressableScale'
import { onAccent, Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { questAccentColor } from '@/lib/daily-quests/questPresentation'
import { QUEST_FILTERS, type QuestFilter } from '@/lib/daily-quests/questFilters'
import type { QuestActivity } from '@/lib/daily-quests/questTypes'

type QuestFilterRowProps = { filter: QuestFilter; onChange: (f: QuestFilter) => void }

function fillFor(theme: SportPalette, key: QuestFilter): string {
  if (key === 'all') return theme.orange
  return questAccentColor(key as QuestActivity)
}

export function QuestFilterRow({ filter, onChange }: QuestFilterRowProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {QUEST_FILTERS.map((item) => {
        const active = filter === item.key
        const fill = fillFor(theme, item.key)
        return (
          <PressableScale
            key={item.key}
            onPress={() => onChange(item.key)}
            style={[styles.chip, active && { backgroundColor: fill, borderColor: theme.arcadeCabinetEdge }]}
          >
            <Text style={[styles.text, active && { color: onAccent(fill) }]}>{item.label}</Text>
          </PressableScale>
        )
      })}
    </ScrollView>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    row: { gap: 8, paddingRight: 12 },
    chip: {
      minHeight: 38,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: theme.lineStrong,
      backgroundColor: theme.panelBg,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: { color: theme.muted, fontSize: 13, fontWeight: '900' },
  })
}
