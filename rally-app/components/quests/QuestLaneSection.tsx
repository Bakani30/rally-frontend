// Renders one lane section in the quest hub: header + QuestTemplateCard list.
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { QuestTemplateCard } from '@/components/quests/QuestTemplateCard'
import { onAccent, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { QuestDailyState } from '@/lib/quest-proof/questDailyState'
import type { QuestLaneSection as QuestLaneSectionData } from '@/lib/quest-proof/questLaneGrouping'
import type { QuestLane } from '@/lib/quest-proof/questProofTypes'

const LANE_ICON: Record<QuestLane, keyof typeof MaterialCommunityIcons.glyphMap> = {
  move: 'run-fast',
  explore: 'map-marker-radius',
  practice: 'whistle',
}

type Props = {
  section: QuestLaneSectionData
  /** Per-template daily completion state. Keyed by templateId. */
  dailyState?: Record<string, QuestDailyState>
  onSelect: (templateId: string) => void
}

export function QuestLaneSection({ section, dailyState, onSelect }: Props) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const accent = theme.orange
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: accent }]}>
          <MaterialCommunityIcons
            name={LANE_ICON[section.lane]}
            size={15}
            color={onAccent(accent)}
          />
        </View>
        <Text style={styles.label}>{section.labelTH}</Text>
        <View style={[styles.count, { backgroundColor: accent }]}>
          <Text style={[styles.countText, { color: onAccent(accent) }]}>
            {section.views.length}
          </Text>
        </View>
      </View>
      <View style={styles.list}>
        {section.views.map((view) => (
          <QuestTemplateCard
            key={view.templateId}
            view={view}
            doneToday={dailyState?.[view.templateId]?.doneToday}
            dailyStatus={dailyState?.[view.templateId]?.status ?? 'none'}
            onPress={() => onSelect(view.templateId)}
          />
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
    count: {
      borderRadius: Radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 1,
      minWidth: 22,
      alignItems: 'center',
    },
    countText: { fontSize: 11, fontWeight: '900', fontVariant: ['tabular-nums'] },
    list: { gap: Spacing.md },
  })
}
