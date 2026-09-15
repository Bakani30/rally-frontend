// Scrollable pill row for switching between sport sections in the quest hub.
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { PressableScale } from '@/components/motion/PressableScale'
import { onAccent, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { QuestSportSection } from '@/lib/quest-proof/questSportGrouping'
import type { QuestActivity } from '@/lib/daily-quests/questTypes'

// Exact spec accent colors for each sport — solid, mode-independent.
const SPORT_ACCENT: Record<string, string> = {
  running: '#CEF17B',
  basketball: '#ff8a00',
  badminton: '#6155f5',
  special: '#9a9aa2',
}

type Props = {
  sections: QuestSportSection[]
  active: QuestActivity
  onChange: (a: QuestActivity) => void
}

export function QuestSportTabs({ sections, active, onChange }: Props) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {sections.map((section) => {
        const isActive = section.activity === active
        const accent = SPORT_ACCENT[section.activity] ?? '#9a9aa2'
        return (
          <PressableScale
            key={section.activity}
            style={[
              styles.pill,
              isActive
                ? { backgroundColor: accent, borderColor: accent }
                : { backgroundColor: theme.arcadeChip, borderColor: theme.line },
            ]}
            onPress={() => onChange(section.activity)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[
                styles.pillText,
                isActive ? { color: onAccent(accent) } : { color: theme.inkSoft },
              ]}
            >
              {section.labelTH}
            </Text>
          </PressableScale>
        )
      })}
      {/* Spacer so last pill is not flush to the edge */}
      <View style={{ width: Spacing.sm }} />
    </ScrollView>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: Spacing.sm,
      paddingHorizontal: 2,
    },
    pill: {
      borderRadius: Radius.pill,
      borderWidth: 2,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.arcadeShadow,
      shadowOpacity: 0.22,
      shadowRadius: 0,
      shadowOffset: { width: 2, height: 3 },
    },
    pillText: {
      fontSize: 13,
      fontWeight: '900',
      fontStyle: 'italic',
    },
  })
}
