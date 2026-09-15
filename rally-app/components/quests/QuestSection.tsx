import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { QuestCard } from '@/components/quests/QuestCard'
import { onAccent, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { questAccentColor } from '@/lib/daily-quests/questPresentation'
import type { QuestActivitySection } from '@/lib/daily-quests/questGrouping'
import type { QuestActivity } from '@/lib/daily-quests/questTypes'

const SECTION_ICON: Record<QuestActivity, keyof typeof MaterialCommunityIcons.glyphMap> = {
  running: 'run-fast',
  basketball: 'basketball',
  badminton: 'badminton',
  special: 'star-four-points',
}

type QuestSectionProps = {
  section: QuestActivitySection
  onSelectQuest: (id: string) => void
}

export function QuestSection({ section, onSelectQuest }: QuestSectionProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const accent = questAccentColor(section.activity)
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: accent }]}>
          <MaterialCommunityIcons
            name={SECTION_ICON[section.activity]}
            size={15}
            color={onAccent(accent)}
          />
        </View>
        <Text style={styles.label}>{section.label}</Text>
        <View style={[styles.count, { backgroundColor: accent }]}>
          <Text style={[styles.countText, { color: onAccent(accent) }]}>
            {section.quests.length}
          </Text>
        </View>
      </View>
      <View style={styles.list}>
        {section.quests.map((quest) => (
          <QuestCard key={quest.id} quest={quest} onPress={() => onSelectQuest(quest.id)} />
        ))}
      </View>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    section: { gap: 10 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 },
    iconBox: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    label: { color: theme.ink, fontSize: 13, fontWeight: '900', fontStyle: 'italic', letterSpacing: 0.5 },
    count: { borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 1, minWidth: 22, alignItems: 'center' },
    countText: { fontSize: 11, fontWeight: '900', fontVariant: ['tabular-nums'] },
    list: { gap: Spacing.md },
  })
}
