import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'

import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type SectionLabelProps = {
  title: string
  count?: number
  /** `attention` tints the count pill orange when count > 0. */
  tone?: 'neutral' | 'attention'
  style?: StyleProp<ViewStyle>
}

/** Italic-900 section heading + optional count pill — shared list-grammar header. */
export function SectionLabel({ title, count, tone = 'neutral', style }: SectionLabelProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const attention = tone === 'attention' && (count ?? 0) > 0

  return (
    <View style={[styles.header, style]}>
      <Text style={styles.title}>{title}</Text>
      {count !== undefined ? (
        <View style={[styles.pill, attention && styles.pillAttention]}>
          <Text style={[styles.count, attention && styles.countAttention]}>{count}</Text>
        </View>
      ) : null}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    title: {
      flex: 1,
      fontSize: 16,
      fontWeight: '900',
      fontStyle: 'italic',
      color: theme.ink,
      letterSpacing: 0.2,
      textTransform: 'uppercase',
    },
    pill: {
      minWidth: 30,
      height: 26,
      paddingHorizontal: 9,
      borderRadius: Radius.pill,
      backgroundColor: theme.surfaceStrong,
      borderWidth: 1,
      borderColor: theme.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pillAttention: {
      backgroundColor: theme.orangeSoft,
      borderColor: theme.orange,
    },
    count: {
      color: theme.muted,
      fontSize: 12,
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
    },
    countAttention: { color: theme.orange },
  })
}
