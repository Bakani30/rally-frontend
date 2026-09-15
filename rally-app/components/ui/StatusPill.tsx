import { View, Text, StyleSheet } from 'react-native'
import { PulseDot } from '@/components/motion/PulseDot'
import { Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type Props = {
  status: string
  label?: string
}

function colorMapFor(theme: SportPalette): Record<string, { bg: string; fg: string; pulse: boolean }> {
  return {
    pending:     { bg: theme.amberSoft, fg: theme.amber, pulse: true },
    accepted:    { bg: theme.greenSoft, fg: theme.green, pulse: true },
    in_progress: { bg: theme.greenSoft, fg: theme.green, pulse: true },
    submitted:   { bg: theme.blueSoft, fg: theme.blue, pulse: true },
    verified:    { bg: theme.blueSoft, fg: theme.blue, pulse: false },
    settled:     { bg: theme.surface, fg: theme.inkSoft, pulse: false },
    disputed:    { bg: theme.redSoft, fg: theme.red, pulse: true },
    cancelled:   { bg: theme.surface, fg: theme.mutedSoft, pulse: false },
  }
}

export function StatusPill({ status, label }: Props) {
  const theme = useSportTheme()
  const colors = colorMapFor(theme)[status] ?? { bg: theme.surface, fg: theme.muted, pulse: false }
  return (
    <View style={[styles.pill, { backgroundColor: colors.bg }]}>
      <PulseDot color={colors.fg} size={6} active={colors.pulse} />
      <Text style={[styles.label, { color: colors.fg }]}>
        {(label ?? status).toUpperCase()}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
})
