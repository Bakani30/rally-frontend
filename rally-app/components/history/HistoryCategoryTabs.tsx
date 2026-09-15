// Pill tab row for the unified Matches history feed — All / Running / Basketball / Badminton.
// Active tab is tinted by that sport's ActivityColor ('all' uses the arcade orange), per the
// founder-approved Matches mockup (profile-history-redesign.template.html).
import { StyleSheet, View } from 'react-native'
import { PressableScale } from '@/components/motion/PressableScale'
import { RallyText } from '@/components/ui/RallyText'
import { ActivityColor, onAccent, Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { ACTIVITY_LABEL, MVP_ACTIVITIES } from '@/lib/match/matchConfig'
import type { FeedCategory } from '@/lib/history/unifiedFeed'

// Thai sublines — matchConfig only carries English activity labels, so the bilingual
// tab copy for the Thai body line lives here alongside the tab list itself.
const THAI_LABEL: Record<(typeof MVP_ACTIVITIES)[number], string> = {
  running: 'วิ่ง',
  basketball: 'บาส',
  badminton: 'แบด',
}

type Tab = { category: FeedCategory; en: string; th: string }

const TABS: Tab[] = [
  { category: 'all', en: 'All', th: 'ทั้งหมด' },
  ...MVP_ACTIVITIES.map((activity) => ({
    category: activity as FeedCategory,
    en: ACTIVITY_LABEL[activity],
    th: THAI_LABEL[activity],
  })),
]

type HistoryCategoryTabsProps = {
  category: FeedCategory
  onChange: (category: FeedCategory) => void
}

export function HistoryCategoryTabs({ category, onChange }: HistoryCategoryTabsProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.row} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const active = tab.category === category
        const accent = tab.category === 'all' ? theme.orange : ActivityColor[tab.category]
        const fg = active ? onAccent(accent) : theme.muted
        return (
          <PressableScale
            key={tab.category}
            style={[styles.tab, active && { backgroundColor: accent }]}
            onPress={() => onChange(tab.category)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${tab.en} · ${tab.th}`}
          >
            <RallyText variant="head" lang="en" style={[styles.tabEn, { color: fg }]}>
              {tab.en}
            </RallyText>
            <RallyText variant="body" lang="th" style={[styles.tabTh, { color: fg }]}>
              {tab.th}
            </RallyText>
          </PressableScale>
        )
      })}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 6,
      padding: 4,
      borderRadius: Radius.pill,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
    },
    tab: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.pill,
      paddingVertical: 6,
    },
    tabEn: { fontSize: 12, fontWeight: '900', letterSpacing: 0.2 },
    tabTh: { fontSize: 10, marginTop: 1 },
  })
}
