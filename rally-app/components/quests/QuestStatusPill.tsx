import { StyleSheet, Text, View } from 'react-native'
import { PulseDot } from '@/components/motion/PulseDot'
import { Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { QuestStatus } from '@/lib/daily-quests/questTypes'

type QuestStatusPillProps = { status: QuestStatus; label: string }

function toneFor(
  theme: SportPalette,
  status: QuestStatus,
): { bg: string; fg: string; pulse: boolean } {
  switch (status) {
    case 'in_progress':
      return { bg: theme.greenSoft, fg: theme.green, pulse: true }
    case 'pending_sync':
      return { bg: theme.amberSoft, fg: theme.economy, pulse: true }
    case 'completed':
      return { bg: theme.greenSoft, fg: theme.green, pulse: false }
    case 'claimed':
      return { bg: theme.blueSoft, fg: theme.blue, pulse: false }
    case 'failed':
      return { bg: theme.redSoft, fg: theme.red, pulse: false }
    default:
      return { bg: theme.surfaceStrong, fg: theme.muted, pulse: false }
  }
}

export function QuestStatusPill({ status, label }: QuestStatusPillProps) {
  const theme = useSportTheme()
  const tone = toneFor(theme, status)
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <PulseDot color={tone.fg} size={6} active={tone.pulse} />
      <Text style={[styles.label, { color: tone.fg }]} numberOfLines={1}>
        {label.toUpperCase()}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: Radius.pill,
    alignSelf: 'flex-end',
  },
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
})
