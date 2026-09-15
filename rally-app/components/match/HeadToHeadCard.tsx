import { StyleSheet, Text, View } from 'react-native'

import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { HeadToHead } from '@/types/match'

type HeadToHeadCardProps = { record: HeadToHead }

/** Compact W–L vs one opponent. Leading = greenVivid, trailing = red, even = ink. */
export function HeadToHeadCard({ record }: HeadToHeadCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const tone =
    record.wins > record.losses ? theme.greenVivid : record.wins < record.losses ? theme.actionDecline : theme.ink

  return (
    <View style={styles.card}>
      <Text style={[styles.score, { color: tone }]}>
        {record.wins}–{record.losses}
        {record.draws > 0 ? <Text style={styles.draws}>{`  ·  ${record.draws}`}</Text> : null}
      </Text>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      borderRadius: Radius.xl,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
    },
    score: { fontSize: 22, fontWeight: '900', letterSpacing: 0.5 },
    draws: { fontSize: 14, fontWeight: '800', color: theme.muted },
  })
}
