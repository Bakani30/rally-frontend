// Renders a proof-status pill for a quest template card. Mirrors QuestStatusPill
// but derives label+tone from the proof-session lifecycle (not quest task status).
import { StyleSheet, Text, View } from 'react-native'
import { PulseDot } from '@/components/motion/PulseDot'
import { Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { proofStatusPill, type ToneKey } from '@/lib/quest-proof/questProofStatusPill'
import type { QuestProofStatus } from '@/lib/quest-proof/questProofTypes'

type Props = { status: QuestProofStatus | 'none' }

function toneColors(theme: SportPalette, key: ToneKey): { bg: string; fg: string } {
  switch (key) {
    case 'live':    return { bg: theme.greenSoft,    fg: theme.green }
    case 'pending': return { bg: theme.amberSoft,    fg: theme.economy }
    case 'pass':    return { bg: theme.blueSoft,     fg: theme.blue }
    case 'fail':    return { bg: theme.redSoft,      fg: theme.red }
    case 'neutral': return { bg: theme.surfaceStrong, fg: theme.muted }
  }
}

export function QuestProofStatusPill({ status }: Props) {
  const theme = useSportTheme()
  const { toneKey, labelTH, pulse } = proofStatusPill(status)
  if (!labelTH) return null
  const { bg, fg } = toneColors(theme, toneKey)
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <PulseDot color={fg} size={6} active={pulse} />
      <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
        {labelTH.toUpperCase()}
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
