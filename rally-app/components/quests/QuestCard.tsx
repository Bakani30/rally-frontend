import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { QuestStatusPill } from '@/components/quests/QuestStatusPill'
import { QuestTypeChip } from '@/components/quests/QuestTypeChip'
import { onAccent, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { questAccentColor } from '@/lib/daily-quests/questPresentation'
import type { DailyQuestItem } from '@/lib/daily-quests/questTypes'

type QuestCardProps = { quest: DailyQuestItem; onPress: () => void }

export function QuestCard({ quest, onPress }: QuestCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const accent = questAccentColor(quest.activity)
  const progress = Math.max(0, Math.min(1, quest.progress))
  return (
    <PressableScale
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={quest.title}
    >
      <View style={[styles.rail, { backgroundColor: accent }]} />
      <View style={[styles.iconBox, { backgroundColor: accent }]}>
        <MaterialCommunityIcons
          name={quest.icon as keyof typeof MaterialCommunityIcons.glyphMap}
          size={20}
          color={onAccent(accent)}
        />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={2}>{quest.title}</Text>
        <QuestTypeChip evidenceMode={quest.evidenceMode} />
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: accent }]} />
        </View>
      </View>
      <View style={styles.meta}>
        <Text style={styles.reward}>+{quest.rewardPoints}</Text>
        <QuestStatusPill status={quest.status} label={quest.statusLabel} />
      </View>
    </PressableScale>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      minHeight: 96,
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
    track: {
      height: 6,
      borderRadius: Radius.pill,
      overflow: 'hidden',
      backgroundColor: theme.surfaceStrong,
    },
    fill: { height: '100%', borderRadius: Radius.pill },
    meta: { minWidth: 86, alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
    reward: {
      color: theme.economy,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
    },
  })
}
