import { StyleSheet, Text, View } from 'react-native'
import { Fonts, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

export type RefereeMetricItem = {
  label: string
  value: string | number
  tone?: 'default' | 'positive' | 'danger' | 'accent'
}

type RefereeMetricStripProps = { items: readonly RefereeMetricItem[] }

export function RefereeMetricStrip({ items }: RefereeMetricStripProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.card}>
      {items.map((item, index) => (
        <View key={`${item.label}-${index}`} style={styles.column}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <Text style={[styles.value, { color: toneColor(item.tone, theme) }]} numberOfLines={1}>
            {item.value}
          </Text>
          <Text style={styles.label} numberOfLines={2}>{item.label}</Text>
        </View>
      ))}
    </View>
  )
}

function toneColor(tone: RefereeMetricItem['tone'], theme: SportPalette) {
  if (tone === 'positive') return theme.greenVivid
  if (tone === 'danger') return theme.red
  if (tone === 'accent') return theme.orange
  return theme.ink
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      width: '100%',
      minHeight: 82,
      flexDirection: 'row',
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      paddingVertical: Spacing.md,
    },
    column: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
    divider: {
      position: 'absolute',
      left: 0,
      top: Spacing.xs,
      bottom: Spacing.xs,
      width: StyleSheet.hairlineWidth,
      backgroundColor: theme.lineStrong,
    },
    value: {
      fontSize: 22,
      lineHeight: 27,
      fontWeight: '900',
      fontFamily: Fonts?.rounded,
      fontVariant: ['tabular-nums'],
    },
    label: {
      minHeight: 30,
      marginTop: 3,
      color: theme.muted,
      fontSize: 10,
      lineHeight: 15,
      fontWeight: '800',
      fontFamily: Fonts?.thaiMedium,
      textAlign: 'center',
    },
  })
}
