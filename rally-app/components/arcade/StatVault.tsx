import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'

import { AnimatedNumber } from '@/components/motion/AnimatedNumber'
import { Arcade, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type StatVaultTone = 'neutral' | 'attention'

type StatVaultProps = {
  label: string
  value: number
  /** `attention` tints the vault edge orange — use when the count means "act now". */
  tone?: StatVaultTone
  style?: StyleProp<ViewStyle>
}

/**
 * Score-vault box borrowed from the Ranking rating box: dark arcade cabinet
 * surface + chalk count-up number + caps label. Counts are NOT economy/score,
 * so the number stays chalk (never amber); attention tone signals via the edge.
 */
export function StatVault({ label, value, tone = 'neutral', style }: StatVaultProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const attention = tone === 'attention' && value > 0

  return (
    <View style={[styles.vault, attention && styles.vaultAttention, style]}>
      <AnimatedNumber value={value} style={styles.value} />
      <Text style={[styles.label, attention && styles.labelAttention]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    vault: {
      flex: 1,
      minWidth: 0,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.xl,
      backgroundColor: theme.arcadeCabinet,
      borderWidth: Arcade.border.panel,
      borderColor: theme.arcadeCabinetEdge,
      ...Platform.select({
        web: { boxShadow: `4px 5px 0 ${theme.arcadeShadow}` },
        default: {
          shadowColor: theme.arcadeCabinetEdge,
          shadowOffset: { width: 4, height: 5 },
          shadowOpacity: 0.24,
          shadowRadius: 0,
          elevation: 4,
        },
      }),
    },
    vaultAttention: {
      borderColor: theme.orange,
    },
    value: {
      color: theme.chalk,
      fontSize: 30,
      lineHeight: 34,
      fontWeight: '900',
      fontStyle: 'italic',
      letterSpacing: -0.5,
      fontVariant: ['tabular-nums'],
    },
    label: {
      marginTop: 2,
      color: theme.fightInkSoft,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    labelAttention: {
      color: theme.orange,
    },
  })
}
