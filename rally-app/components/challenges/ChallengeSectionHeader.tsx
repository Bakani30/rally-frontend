import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PulseDot } from '@/components/motion/PulseDot'
import { onAccent, Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type ChallengeSectionHeaderProps = {
  label: string
  count: number
  tone: 'joined' | 'live' | 'upcoming'
}

export function ChallengeSectionHeader({ label, count, tone }: ChallengeSectionHeaderProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const color = tone === 'live' ? theme.risk : tone === 'joined' ? theme.trust : theme.blue
  return (
    <View style={styles.row}>
      {tone === 'live' ? (
        <PulseDot color={color} size={9} active />
      ) : (
        <MaterialCommunityIcons
          name={tone === 'joined' ? 'check-decagram' : 'calendar-arrow-right'}
          size={16}
          color={color}
        />
      )}
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.count, { backgroundColor: color }]}>
        <Text style={[styles.countText, { color: onAccent(color) }]}>{count}</Text>
      </View>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 },
    label: { color: theme.ink, fontSize: 13, fontWeight: '900', fontStyle: 'italic', letterSpacing: 0.5 },
    count: { borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 1, minWidth: 22, alignItems: 'center' },
    countText: { fontSize: 11, fontWeight: '900', fontVariant: ['tabular-nums'] },
  })
}
