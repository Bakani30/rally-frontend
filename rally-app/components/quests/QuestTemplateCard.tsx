// Renders one catalog template view in arcade grammar. Sport accent for rail/icon.
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { QuestProofStatusPill } from '@/components/quests/QuestProofStatusPill'
import { QuestTypeChip } from '@/components/quests/QuestTypeChip'
import { onAccent, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme, useThemeMode } from '@/hooks/useAppTheme'
import type { QuestProofStatus, QuestTemplateView } from '@/lib/quest-proof/questProofTypes'

// Spec exact accent colors per sport — solid, mode-independent.
const SPORT_ACCENT: Record<string, string> = {
  running: '#CEF17B',
  basketball: '#ff8a00',
  badminton: '#6155f5',
  special: '#9a9aa2',
}

// Spec: points gold = #eac31a (dark) / #c79100 (light)
const GOLD_DARK = '#eac31a'
const GOLD_LIGHT = '#c79100'

type Props = {
  view: QuestTemplateView
  doneToday?: boolean
  dailyStatus?: QuestProofStatus | 'none'
  onPress: () => void
}

export function QuestTemplateCard({ view, doneToday = false, dailyStatus, onPress }: Props) {
  const theme = useSportTheme()
  const isDark = useThemeMode() === 'dark'
  const gold = isDark ? GOLD_DARK : GOLD_LIGHT
  const accent = SPORT_ACCENT[view.activity] ?? view.accentColor
  const styles = createStyles(theme, gold)
  return (
    <PressableScale
      style={[styles.card, doneToday && styles.cardDone]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={view.titleTH}
    >
      <View style={[styles.rail, { backgroundColor: accent }]} />
      <View style={[styles.iconBox, { backgroundColor: accent }]}>
        <MaterialCommunityIcons
          name={view.icon as keyof typeof MaterialCommunityIcons.glyphMap}
          size={20}
          color={onAccent(accent)}
        />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={2}>{view.titleTH}</Text>
        <QuestTypeChip label={view.evidenceTH} />
      </View>
      <View style={styles.meta}>
        <Text style={styles.reward}>+{view.rewardPoints}</Text>
        {dailyStatus != null && dailyStatus !== 'none' && (
          <QuestProofStatusPill status={dailyStatus} />
        )}
      </View>
    </PressableScale>
  )
}

function createStyles(theme: SportPalette, gold: string) {
  return StyleSheet.create({
    card: {
      minHeight: 84,
      borderRadius: Radius.xl,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.panelBg,
      paddingVertical: 12,
      paddingRight: 12,
      paddingLeft: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      overflow: 'hidden',
      shadowColor: theme.arcadeShadow,
      shadowOpacity: 0.12,
      shadowRadius: 0,
      shadowOffset: { width: 3, height: 4 },
    },
    cardDone: {
      backgroundColor: theme.surfaceStrong,
      borderColor: theme.lineStrong,
    },
    rail: {
      position: 'absolute',
      left: 0,
      top: 14,
      bottom: 14,
      width: 5,
      borderTopRightRadius: Radius.pill,
      borderBottomRightRadius: Radius.pill,
    },
    iconBox: {
      width: 46,
      height: 46,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copy: { flex: 1, minWidth: 0, gap: 6 },
    title: { color: theme.ink, fontSize: 15, lineHeight: 19, fontWeight: '900' },
    meta: { minWidth: 56, alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
    reward: {
      color: gold,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
    },
  })
}
