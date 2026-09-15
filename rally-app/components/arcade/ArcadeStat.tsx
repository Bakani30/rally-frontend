import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'

import { AnimatedNumber } from '@/components/motion/AnimatedNumber'
import { Arcade, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type ArcadeStatVariant = 'hero' | 'compact'

type ArcadeStatProps = {
  label: string
  value: number
  unit?: string
  variant?: ArcadeStatVariant
  formatter?: (value: number) => string
  showLabel?: boolean
  style?: StyleProp<ViewStyle>
}

export function ArcadeStat({
  label,
  value,
  unit,
  variant = 'compact',
  formatter,
  showLabel = true,
  style,
}: ArcadeStatProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme, variant)

  return (
    <View style={[styles.stat, style]}>
      {showLabel && (
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      )}
      <View style={styles.valueRow}>
        <AnimatedNumber value={value} formatter={formatter} style={styles.value} />
        {unit ? (
          <Text style={styles.unit} numberOfLines={1}>
            {unit}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

function createStyles(theme: SportPalette, variant: ArcadeStatVariant) {
  const hero = variant === 'hero'

  return StyleSheet.create({
    stat: {
      minWidth: 0,
      gap: hero ? 3 : 1,
    },
    label: {
      color: hero ? theme.fightInkSoft : theme.muted,
      fontSize: hero ? Arcade.text.eyebrow.size : 10,
      fontWeight: '900',
      letterSpacing: hero ? Arcade.text.eyebrow.tracking : 0.8,
      textTransform: 'uppercase',
    },
    valueRow: {
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: hero ? 8 : 5,
    },
    value: {
      color: hero ? theme.economy : theme.ink,
      fontSize: hero ? Arcade.text.stat.size : Arcade.text.statCompact.size,
      lineHeight: hero ? Arcade.text.stat.lineHeight : Arcade.text.statCompact.lineHeight,
      fontWeight: '900',
      letterSpacing: 0,
      fontVariant: ['tabular-nums'],
    },
    unit: {
      color: hero ? theme.economy : theme.muted,
      fontSize: hero ? 12 : 10,
      lineHeight: hero ? 20 : 14,
      fontWeight: '900',
      letterSpacing: hero ? 1 : 0.5,
      textTransform: 'uppercase',
      marginBottom: hero ? 7 : 3,
    },
  })
}
